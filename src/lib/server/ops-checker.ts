/**
 * ops-checker.ts
 * Core automation engine — runs on every cron tick (every 5 min during store hours).
 *
 * Signal source: Clover shifts API (Homebase syncs clock-in/out to Clover).
 * Clock-in at the store terminal = physical presence. No ADT API needed.
 *
 * Responsibilities:
 *   1. Sync today's shifts from Clover/Homebase into D1
 *   2. Escalating open alerts — fire at open+5min, then every 15min until someone clocks in
 *   3. Early close alert — nobody clocked in 15min before scheduled close
 *   4. Late close alert — someone still clocked in 15min after scheduled close
 *   5. Keep order timestamps synced for dashboard display (not used for alerts)
 *
 * Fraud/refund detection runs via Clover webhooks (POST /api/webhooks/clover) — real-time.
 */

import type { D1DatabaseLike } from './catalog-db';
import { getCloverOrderCredentials, fetchWeeklySales } from '../clover-orders';
import { getTodayCst, parseScheduleTime, fetchTodayShifts } from './clover-employees';
import {
  getStoreSchedule,
  recordFirstOrder,
  updateLastOrder,
  upsertShift,
  logAlert,
  getActiveShifts,
  hasAnyClockInToday,
} from './ops-db';
import {
  sendAlert,
  fmtStoreNotOpen,
  fmtEarlyClose,
  fmtStillOpen,
} from './alerts';

// ── Config ────────────────────────────────────────────────────

/** Minutes after open_time before the first "not open" alert fires. */
const OPEN_ALERT_START_MINUTES = 5;

/** Gap between escalating open alerts once the first has fired. */
const OPEN_ALERT_INTERVAL_MINUTES = 15;

/** Maximum number of escalating open alerts per day (covers up to open + 50 min). */
const OPEN_ALERT_MAX = 4;

/** Minutes before close_time: if nobody is clocked in, fire "early close" alert. */
const EARLY_CLOSE_MINUTES = 15;

/** Minutes after close_time: if anyone is still clocked in, fire "still open" alert. */
const LATE_CLOSE_MINUTES = 15;

/** Stores to monitor — add more store IDs as you expand. */
const MONITORED_STORES = ['toke'];

// ── Main entry point ──────────────────────────────────────────

export async function runOpsCheck(db: D1DatabaseLike): Promise<void> {
  const { dateCst, startOfDayMs, endOfDayMs } = getTodayCst();
  const nowMs = Date.now();

  console.log(`[OpsChecker] Tick for ${dateCst}`);

  for (const storeId of MONITORED_STORES) {
    try {
      await checkStore(db, storeId, dateCst, nowMs, startOfDayMs, endOfDayMs);
    } catch (err) {
      console.error(`[OpsChecker] Error checking store ${storeId}:`, err);
    }
  }
}

// ── Per-store orchestration ───────────────────────────────────

async function checkStore(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  startOfDayMs: number,
  endOfDayMs: number,
): Promise<void> {
  // Use noon of the CST date to get day-of-week — avoids any DST edge at midnight
  const dow = new Date(`${dateCst}T12:00:00`).getDay(); // 0=Sun … 6=Sat
  const schedules = await getStoreSchedule(db, storeId);
  const todaySchedule = schedules.find((s) => s.day_of_week === dow);

  if (!todaySchedule || todaySchedule.is_closed) {
    console.log(`[OpsChecker] ${storeId} is closed today (${dateCst})`);
    return;
  }

  // 1. Sync shifts from Clover/Homebase → D1
  await syncTodayShifts(db, storeId, dateCst);

  // 2. Escalating "store not open" alerts (clock-in based)
  await checkOpeningAlerts(db, storeId, dateCst, nowMs, todaySchedule.open_time);

  // 3. "Closing early" alert — nobody clocked in 15 min before scheduled close
  await checkEarlyClose(db, storeId, dateCst, nowMs, todaySchedule.close_time);

  // 4. "Still at store" alert — someone still clocked in 15 min after close
  await checkLateClose(db, storeId, dateCst, nowMs, todaySchedule.close_time);

  // 5. Sync order timestamps for dashboard display (not used for alerts)
  await syncTodayOrders(db, storeId, dateCst, startOfDayMs, endOfDayMs);
}

// ── 1. Shift sync ─────────────────────────────────────────────

async function syncTodayShifts(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
): Promise<void> {
  try {
    const { shifts } = await fetchTodayShifts(storeId);
    for (const shift of shifts) {
      await upsertShift(db, {
        shift_id: shift.id,
        store_id: storeId,
        employee_id: shift.employee.id,
        employee_name: shift.employee.name ?? 'Unknown',
        shift_date: dateCst,
        clock_in_at: shift.inTime ? new Date(shift.inTime).toISOString() : null,
        clock_out_at: shift.outTime ? new Date(shift.outTime).toISOString() : null,
        late_alert_sent: 0,
      });
    }
    console.log(`[OpsChecker] Synced ${shifts.length} shift(s) for ${storeId}`);
  } catch (err) {
    console.error(`[OpsChecker] Shift sync failed for ${storeId}:`, err);
  }
}

// ── 2. Escalating open alerts ─────────────────────────────────

/**
 * Fires up to OPEN_ALERT_MAX times:
 *   - Alert 1: open_time + 5 min (if nobody clocked in)
 *   - Alert 2: open_time + 20 min (if still nobody clocked in)
 *   - Alert 3: open_time + 35 min
 *   - Alert 4: open_time + 50 min  ← final alert, no more after this
 *
 * Each alert has a unique dedup key `late_open:{storeId}:{date}:{slot}` so it
 * fires exactly once per 15-min slot regardless of how many times the cron runs.
 * Once anyone clocks in, all further slots are skipped.
 */
async function checkOpeningAlerts(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  openTimeCst: string,
): Promise<void> {
  const expectedOpenMs = parseScheduleTime(dateCst, openTimeCst).getTime();
  const alertStartMs = expectedOpenMs + OPEN_ALERT_START_MINUTES * 60_000;

  if (nowMs < alertStartMs) return; // too early

  // Store is open — no alerts needed
  const storeIsOpen = await hasAnyClockInToday(db, storeId, dateCst);
  if (storeIsOpen) return;

  // Which 15-min slot are we in?
  const slot = Math.min(
    OPEN_ALERT_MAX - 1,
    Math.floor((nowMs - alertStartMs) / (OPEN_ALERT_INTERVAL_MINUTES * 60_000)),
  );
  const alertNum = slot + 1;
  const minutesSinceOpen = Math.round((nowMs - expectedOpenMs) / 60_000);
  const dedupKey = `late_open:${storeId}:${dateCst}:${slot}`;

  const message = fmtStoreNotOpen(storeId, openTimeCst, minutesSinceOpen, alertNum);
  const inserted = await logAlert(db, {
    storeId,
    alertType: 'late_open',
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
    console.log(
      `[OpsChecker] late_open alert #${alertNum} for ${storeId} (${minutesSinceOpen} min late)`,
    );
  }
}

// ── 3. Early close detection ──────────────────────────────────

/**
 * During the 15-min window before scheduled close:
 * if nobody is currently clocked in (but someone WAS clocked in today),
 * fire a single "closing early" alert.
 *
 * The "store opened" guard prevents this from firing on days the store never opened —
 * that's already handled by the opening alerts.
 */
async function checkEarlyClose(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  closeTimeCst: string,
): Promise<void> {
  const expectedCloseMs = parseScheduleTime(dateCst, closeTimeCst).getTime();
  const windowStartMs = expectedCloseMs - EARLY_CLOSE_MINUTES * 60_000;

  // Only active during the [close-15min, close] window
  if (nowMs < windowStartMs || nowMs >= expectedCloseMs) return;

  // Don't fire if the store never opened — opening alerts cover that
  const storeOpened = await hasAnyClockInToday(db, storeId, dateCst);
  if (!storeOpened) return;

  // If anyone is still clocked in, all is well
  const activeShifts = await getActiveShifts(db, storeId, dateCst);
  if (activeShifts.length > 0) return;

  const minutesEarly = Math.round((expectedCloseMs - nowMs) / 60_000);
  const dedupKey = `early_close:${storeId}:${dateCst}`;

  const message = fmtEarlyClose(storeId, closeTimeCst, minutesEarly);
  const inserted = await logAlert(db, {
    storeId,
    alertType: 'early_close',
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
    console.log(`[OpsChecker] early_close alert for ${storeId} (${minutesEarly} min early)`);
  }
}

// ── 4. Late close detection ───────────────────────────────────

/**
 * 15 min after scheduled close:
 * if any employee is still clocked in (clock_out_at is NULL), fire a single alert.
 */
async function checkLateClose(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  nowMs: number,
  closeTimeCst: string,
): Promise<void> {
  const expectedCloseMs = parseScheduleTime(dateCst, closeTimeCst).getTime();
  const lateCheckMs = expectedCloseMs + LATE_CLOSE_MINUTES * 60_000;

  if (nowMs < lateCheckMs) return;

  // If nobody is still clocked in, the store closed correctly
  const activeShifts = await getActiveShifts(db, storeId, dateCst);
  if (activeShifts.length === 0) return;

  const minutesLate = Math.round((nowMs - expectedCloseMs) / 60_000);
  const dedupKey = `late_close_staff:${storeId}:${dateCst}`;

  const message = fmtStillOpen(storeId, closeTimeCst, minutesLate);
  const inserted = await logAlert(db, {
    storeId,
    alertType: 'late_close_staff',
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
    console.log(`[OpsChecker] late_close_staff alert for ${storeId} (${minutesLate} min late)`);
  }
}

// ── 5. Order sync (dashboard display only) ────────────────────

async function syncTodayOrders(
  db: D1DatabaseLike,
  storeId: string,
  dateCst: string,
  startMs: number,
  endMs: number,
): Promise<void> {
  const creds = getCloverOrderCredentials();
  if (!creds) return;

  try {
    const salesMap = await fetchWeeklySales(creds, startMs, endMs);
    if (salesMap.size === 0) return;

    const firstUrl = new URL(`${creds.baseUrl}/merchants/${creds.merchantId}/orders`);
    firstUrl.searchParams.append('filter', `createdTime>=${startMs}`);
    firstUrl.searchParams.append('filter', `createdTime<=${endMs}`);
    firstUrl.searchParams.set('limit', '1');
    firstUrl.searchParams.set('orderBy', 'createdTime ASC');

    const firstRes = await fetch(firstUrl.toString(), {
      headers: { Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' },
    });
    if (!firstRes.ok) return;

    const firstData = await firstRes.json() as {
      elements: Array<{ id: string; createdTime: number }>;
    };
    const firstOrder = firstData.elements?.[0];
    if (!firstOrder) return;

    await recordFirstOrder(
      db,
      storeId,
      dateCst,
      new Date(firstOrder.createdTime).toISOString(),
      true,
    );

    const lastUrl = new URL(`${creds.baseUrl}/merchants/${creds.merchantId}/orders`);
    lastUrl.searchParams.append('filter', `createdTime>=${startMs}`);
    lastUrl.searchParams.append('filter', `createdTime<=${endMs}`);
    lastUrl.searchParams.set('limit', '1');
    lastUrl.searchParams.set('orderBy', 'createdTime DESC');

    const lastRes = await fetch(lastUrl.toString(), {
      headers: { Authorization: `Bearer ${creds.apiToken}`, Accept: 'application/json' },
    });
    if (!lastRes.ok) return;

    const lastData = await lastRes.json() as {
      elements: Array<{ id: string; createdTime: number }>;
    };
    const lastOrder = lastData.elements?.[0];
    if (lastOrder) {
      await updateLastOrder(
        db,
        storeId,
        dateCst,
        new Date(lastOrder.createdTime).toISOString(),
      );
    }
  } catch (err) {
    console.error('[OpsChecker] Order sync error:', err);
  }
}
