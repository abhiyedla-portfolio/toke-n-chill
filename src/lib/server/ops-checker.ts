/**
 * ops-checker.ts
 * Core automation engine — runs on every cron tick.
 *
 * Responsibilities:
 *   1. Check if store opened on time (first Clover order of day vs schedule)
 *   2. Alert if store isn't open by (open_time + grace period)
 *   3. Check employee attendance: sync Clover shifts, alert on late clock-ins
 *   4. Alert if store isn't closed by (close_time + grace period)
 *
 * Note: Fraud/refund detection runs via Clover webhooks (POST /api/webhooks/clover),
 *       not in this cron — that's real-time, not polled.
 */

import type { D1DatabaseLike } from './catalog-db';
import { getCloverOrderCredentials, fetchWeeklySales } from '../clover-orders';
import {
  getTodayCst,
  parseScheduleTime,
  fetchTodayShifts,
} from './clover-employees';
import {
  getStoreSchedule,
  getDailyStatus,
  recordFirstOrder,
  updateLastOrder,
  markOpenAlertSent,
  markCloseAlertSent,
  recordStoreClosed,
  upsertShift,
  markLateAlertSent,
  getTodayShifts,
  logAlert,
} from './ops-db';
import {
  sendAlert,
  fmtLateOpen,
  fmtNotClosed,
  fmtEmployeeLate,
  fmtStoreOpened,
} from './alerts';

// ── Config ────────────────────────────────────────────────────

const OPEN_GRACE_MINUTES = parseInt(process.env.OPEN_GRACE_MINUTES ?? '30', 10);
const CLOSE_GRACE_MINUTES = parseInt(process.env.CLOSE_GRACE_MINUTES ?? '30', 10);
const LATE_CLOCK_IN_MINUTES = parseInt(process.env.LATE_CLOCK_IN_MINUTES ?? '20', 10);

// Stores to monitor — add more as you expand
const MONITORED_STORES = ['toke'];

// ── Main entry point ──────────────────────────────────────────

export async function runOpsCheck(db: D1DatabaseLike): Promise<void> {
  const { dateCst, nowCst, startOfDayMs, endOfDayMs } = getTodayCst();
  const nowMs = Date.now();

  console.log(`[OpsChecker] Running check for ${dateCst} at ${nowCst.toISOString()}`);

  for (const storeId of MONITORED_STORES) {
    try {
      await checkStore(db, storeId, dateCst, nowMs, startOfDayMs, endOfDayMs, nowCst);
    } catch (err) {
      console.error(`[OpsChecker] Error checking store ${storeId}:`, err);
    }
  }
}

// ── Per-store check ───────────────────────────────────────────

async function checkStore(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  startOfDayMs: number,
  endOfDayMs: number,
  nowCst: Date,
): Promise<void> {
  // Get today's schedule for this store
  const dow = nowCst.getDay(); // 0=Sun … technically this is UTC day — but close enough for CST same-day
  const schedules = await getStoreSchedule(db, storeId);
  const todaySchedule = schedules.find((s) => s.day_of_week === dow);

  if (!todaySchedule || todaySchedule.is_closed) {
    console.log(`[OpsChecker] ${storeId} is scheduled closed today (${dateCst})`);
    return;
  }

  // ── 1. Sync today's orders to detect first/last order ──────
  await syncTodayOrders(db, storeId, dateCst, startOfDayMs, endOfDayMs);

  // ── 2. Check open/close status ─────────────────────────────
  await checkOpenClose(db, storeId, dateCst, nowMs, todaySchedule.open_time, todaySchedule.close_time);

  // ── 3. Sync and check employee attendance ──────────────────
  await syncAndCheckAttendance(db, storeId, dateCst, nowMs, startOfDayMs, endOfDayMs);
}

// ── Order sync (open/close detection) ────────────────────────

async function syncTodayOrders(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  startMs: number,
  endMs: number,
): Promise<void> {
  const creds = getCloverOrderCredentials();
  if (!creds) {
    console.warn('[OpsChecker] No Clover credentials — skipping order sync');
    return;
  }

  // Fetch today's orders using the existing fetchWeeklySales utility
  // We pass startMs → endMs to get just today's orders
  try {
    const salesMap = await fetchWeeklySales(creds, startMs, endMs);
    if (salesMap.size === 0) return; // No orders yet

    // The sales map doesn't give us raw order timestamps, so we need to
    // fetch orders directly to get the first/last created time.
    const url = new URL(
      `${creds.baseUrl}/merchants/${creds.merchantId}/orders`,
    );
    url.searchParams.append('filter', `createdTime>=${startMs}`);
    url.searchParams.append('filter', `createdTime<=${endMs}`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('orderBy', 'createdTime ASC');

    const firstRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' },
    });

    if (!firstRes.ok) return;

    const firstData = await firstRes.json() as { elements: Array<{ id: string; createdTime: number }> };
    const firstOrder = firstData.elements?.[0];
    if (!firstOrder) return;

    const firstOrderIso = new Date(firstOrder.createdTime).toISOString();
    await recordFirstOrder(db, storeId, dateCst, firstOrderIso, true /* evaluated later */);

    // Also grab the latest order to update last_order_at
    const lastUrl = new URL(
      `${creds.baseUrl}/merchants/${creds.merchantId}/orders`,
    );
    lastUrl.searchParams.append('filter', `createdTime>=${startMs}`);
    lastUrl.searchParams.append('filter', `createdTime<=${endMs}`);
    lastUrl.searchParams.set('limit', '1');
    lastUrl.searchParams.set('orderBy', 'createdTime DESC');

    const lastRes = await fetch(lastUrl.toString(), {
      headers: { Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' },
    });

    if (lastRes.ok) {
      const lastData = await lastRes.json() as { elements: Array<{ id: string; createdTime: number }> };
      const lastOrder = lastData.elements?.[0];
      if (lastOrder) {
        await updateLastOrder(db, storeId, dateCst, new Date(lastOrder.createdTime).toISOString());
      }
    }
  } catch (err) {
    console.error('[OpsChecker] Order sync error:', err);
  }
}

// ── Open/close detection ──────────────────────────────────────

async function checkOpenClose(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  openTimeCst: string,
  closeTimeCst: string,
): Promise<void> {
  const status = await getDailyStatus(db, storeId, dateCst);
  const expectedOpenMs = parseScheduleTime(dateCst, openTimeCst).getTime();
  const expectedCloseMs = parseScheduleTime(dateCst, closeTimeCst).getTime();
  const gracedOpenMs = expectedOpenMs + OPEN_GRACE_MINUTES * 60_000;
  const gracedCloseMs = expectedCloseMs + CLOSE_GRACE_MINUTES * 60_000;

  // ── Late open alert ──
  if (nowMs >= gracedOpenMs && !status?.first_order_at && !status?.open_alert_sent) {
    const minutesLate = Math.round((nowMs - expectedOpenMs) / 60_000);
    const message = fmtLateOpen(storeId, openTimeCst, minutesLate);
    const dedupKey = `late_open:${storeId}:${dateCst}`;

    const inserted = await logAlert(db, {
      storeId,
      alertType: 'late_open',
      message,
      channel: 'pending',
      dedupKey,
    });

    if (inserted) {
      const { channel } = await sendAlert(message);
      // Update channel in the log
      await db
        .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
        .bind(channel, dedupKey)
        .run();
      await markOpenAlertSent(db, storeId, dateCst);
      console.log(`[OpsChecker] Sent late_open alert for ${storeId}`);
    }
  }

  // ── Store opened (first order detected after grace window) ──
  if (status?.first_order_at && !status.open_alert_sent) {
    const firstOrderMs = new Date(status.first_order_at).getTime();
    const minutesLate = Math.max(0, Math.round((firstOrderMs - expectedOpenMs) / 60_000));
    const message = fmtStoreOpened(storeId, minutesLate);
    const dedupKey = `opened:${storeId}:${dateCst}`;

    const inserted = await logAlert(db, {
      storeId,
      alertType: minutesLate > 0 ? 'late_open' : 'store_opened',
      message,
      channel: 'pending',
      dedupKey,
    });

    if (inserted) {
      const { channel } = await sendAlert(message);
      await db
        .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
        .bind(channel, dedupKey)
        .run();
      await markOpenAlertSent(db, storeId, dateCst);
    }
  }

  // ── Late close alert ──
  // Only fire if we're past the graced close time AND the store had orders today
  if (
    nowMs >= gracedCloseMs &&
    status?.last_order_at &&
    !status.close_alert_sent
  ) {
    const lastOrderMs = new Date(status.last_order_at).getTime();
    // If there was an order AFTER the expected close time, that's suspicious
    if (lastOrderMs >= expectedCloseMs) {
      const minutesOverdue = Math.round((lastOrderMs - expectedCloseMs) / 60_000);
      const message = fmtNotClosed(storeId, closeTimeCst, minutesOverdue);
      const dedupKey = `late_close:${storeId}:${dateCst}`;

      const inserted = await logAlert(db, {
        storeId,
        alertType: 'no_close',
        message,
        channel: 'pending',
        dedupKey,
      });

      if (inserted) {
        const { channel } = await sendAlert(message);
        await db
          .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
          .bind(channel, dedupKey)
          .run();
        await markCloseAlertSent(db, storeId, dateCst);
        await recordStoreClosed(db, storeId, dateCst, false);
        console.log(`[OpsChecker] Sent late_close alert for ${storeId}`);
      }
    } else {
      // Store closed on time — just record it
      await recordStoreClosed(db, storeId, dateCst, true);
      await markCloseAlertSent(db, storeId, dateCst); // suppress future checks
    }
  }
}

// ── Employee attendance ───────────────────────────────────────

async function syncAndCheckAttendance(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  startOfDayMs: number,
  endOfDayMs: number,
): Promise<void> {
  // Fetch latest shifts from Clover
  const { shifts } = await fetchTodayShifts(storeId);

  // Upsert all shifts into D1
  for (const shift of shifts) {
    const employeeName = shift.employee.name ?? 'Unknown';
    await upsertShift(db, {
      shift_id: shift.id,
      store_id: storeId,
      employee_id: shift.employee.id,
      employee_name: employeeName,
      shift_date: dateCst,
      clock_in_at: shift.inTime ? new Date(shift.inTime).toISOString() : null,
      clock_out_at: shift.outTime ? new Date(shift.outTime).toISOString() : null,
      late_alert_sent: 0,
    });
  }

  // Check for late clock-ins — only after the store should have opened
  const todayShifts = await getTodayShifts(db, storeId, dateCst);
  const gracedClockInMs = startOfDayMs + LATE_CLOCK_IN_MINUTES * 60_000;

  // We consider a shift "late" if:
  //   - It started on a prior day (scheduled shift that clocked in late today)
  //   - OR the employee never clocked in but it's been more than LATE_CLOCK_IN_MINUTES
  //     past the expected store open.
  //
  // Clover's shifts API only returns shifts that have ALREADY been started (clocked in),
  // so we detect "no-shows" differently: we check if there are 0 shifts after the grace
  // period when the store has already had orders (meaning it IS open).
  if (nowMs < gracedClockInMs) return; // Too early to flag anyone

  for (const shift of todayShifts) {
    if (shift.late_alert_sent) continue;
    if (!shift.clock_in_at) continue; // No clock-in yet — handled as no-show separately

    const clockInMs = new Date(shift.clock_in_at).getTime();
    const storeSchedules = await getStoreSchedule(db, storeId);
    const dow = new Date(dateCst + 'T12:00:00').getDay();
    const todaySched = storeSchedules.find((s) => s.day_of_week === dow);
    if (!todaySched) continue;

    const expectedOpenMs = parseScheduleTime(dateCst, todaySched.open_time).getTime();
    const lateThresholdMs = expectedOpenMs + LATE_CLOCK_IN_MINUTES * 60_000;

    if (clockInMs > lateThresholdMs) {
      const minutesLate = Math.round((clockInMs - expectedOpenMs) / 60_000);
      const message = fmtEmployeeLate(storeId, shift.employee_name, minutesLate);
      const dedupKey = `employee_late:${shift.shift_id}`;

      const inserted = await logAlert(db, {
        storeId,
        alertType: 'employee_late',
        message,
        channel: 'pending',
        dedupKey,
      });

      if (inserted) {
        const { channel } = await sendAlert(message);
        await db
          .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
          .bind(channel, dedupKey)
          .run();
        await markLateAlertSent(db, shift.shift_id);
        console.log(`[OpsChecker] Sent employee_late alert for ${shift.employee_name}`);
      }
    }
  }

  // ── No-show detection ─────────────────────────────────────
  // If there are 0 shifts today but the store is open (has orders), alert once.
  const status = await getDailyStatus(db, storeId, dateCst);
  if (
    status?.first_order_at &&    // store has orders = it's open
    todayShifts.length === 0 &&  // no one clocked in
    nowMs >= gracedClockInMs
  ) {
    const dedupKey = `no_show:${storeId}:${dateCst}`;
    const message =
      `⛔ <b>No employees clocked in</b>\n` +
      `🏪 <b>Store:</b> ${storeId}\n` +
      `Store has orders but no clock-ins recorded in Clover.\n` +
      `📅 ${new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())}`;

    const inserted = await logAlert(db, {
      storeId,
      alertType: 'no_show',
      message,
      channel: 'pending',
      dedupKey,
    });

    if (inserted) {
      const { channel } = await sendAlert(message);
      await db
        .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
        .bind(channel, dedupKey)
        .run();
    }
  }
}
