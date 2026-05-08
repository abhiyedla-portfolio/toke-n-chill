/**
 * ops-db.ts — D1 query layer for all Operations Automation tables.
 * Mirrors the pattern already used in catalog-db.ts.
 */

import type { D1DatabaseLike } from './catalog-db';

// ── Types ─────────────────────────────────────────────────────

export interface StoreSchedule {
  store_id: string;
  day_of_week: number;   // 0=Sun … 6=Sat
  open_time: string;     // 'HH:MM' 24h CST
  close_time: string;    // 'HH:MM' 24h CST
  is_closed: number;     // 0 | 1
  updated_at: string;
}

export interface StoreDailyStatus {
  store_id: string;
  date: string;             // 'YYYY-MM-DD'
  first_order_at: string | null;
  last_order_at: string | null;
  opened_on_time: number | null;
  closed_on_time: number | null;
  open_alert_sent: number;
  close_alert_sent: number;
  updated_at: string;
}

export interface EmployeeShift {
  shift_id: string;
  store_id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  late_alert_sent: number;
  synced_at: string;
}

export interface OpsAlert {
  id: number;
  store_id: string | null;
  alert_type: string;
  message: string;
  channel: string;
  sent_at: string;
  dedup_key: string | null;
}

// ── Store Schedule ────────────────────────────────────────────

export async function getStoreSchedule(
  db: D1DatabaseLike,
  storeId: string,
): Promise<StoreSchedule[]> {
  const result = await db
    .prepare(
      `SELECT * FROM store_schedule WHERE store_id = ? ORDER BY day_of_week`,
    )
    .bind(storeId)
    .all<StoreSchedule>();
  return result.results ?? [];
}

export async function upsertScheduleDay(
  db: D1DatabaseLike,
  row: Omit<StoreSchedule, 'updated_at'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_schedule (store_id, day_of_week, open_time, close_time, is_closed, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(store_id, day_of_week)
       DO UPDATE SET open_time=excluded.open_time,
                     close_time=excluded.close_time,
                     is_closed=excluded.is_closed,
                     updated_at=datetime('now')`,
    )
    .bind(row.store_id, row.day_of_week, row.open_time, row.close_time, row.is_closed)
    .run();
}

// ── Daily Store Status ────────────────────────────────────────

export async function getDailyStatus(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
): Promise<StoreDailyStatus | null> {
  const result = await db
    .prepare(`SELECT * FROM store_daily_status WHERE store_id = ? AND date = ?`)
    .bind(storeId, date)
    .all<StoreDailyStatus>();
  return result.results?.[0] ?? null;
}

/** Record the first order of the day and whether the store opened on time. */
export async function recordFirstOrder(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
  orderTime: string,
  openedOnTime: boolean,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_daily_status (store_id, date, first_order_at, opened_on_time, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(store_id, date)
       DO UPDATE SET first_order_at = COALESCE(first_order_at, excluded.first_order_at),
                     opened_on_time = COALESCE(opened_on_time, excluded.opened_on_time),
                     updated_at     = datetime('now')`,
    )
    .bind(storeId, date, orderTime, openedOnTime ? 1 : 0)
    .run();
}

/** Update last_order_at throughout the day (called on every Clover order). */
export async function updateLastOrder(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
  orderTime: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_daily_status (store_id, date, last_order_at, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(store_id, date)
       DO UPDATE SET last_order_at = excluded.last_order_at,
                     updated_at    = datetime('now')`,
    )
    .bind(storeId, date, orderTime)
    .run();
}

export async function markOpenAlertSent(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_daily_status (store_id, date, open_alert_sent, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(store_id, date)
       DO UPDATE SET open_alert_sent = 1, updated_at = datetime('now')`,
    )
    .bind(storeId, date)
    .run();
}

export async function markCloseAlertSent(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_daily_status (store_id, date, close_alert_sent, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(store_id, date)
       DO UPDATE SET close_alert_sent = 1, updated_at = datetime('now')`,
    )
    .bind(storeId, date)
    .run();
}

export async function recordStoreClosed(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
  closedOnTime: boolean,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO store_daily_status (store_id, date, closed_on_time, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(store_id, date)
       DO UPDATE SET closed_on_time = COALESCE(closed_on_time, excluded.closed_on_time),
                     updated_at     = datetime('now')`,
    )
    .bind(storeId, date, closedOnTime ? 1 : 0)
    .run();
}

/** Last N days of daily status for a store. */
export async function getRecentDailyStatuses(
  db: D1DatabaseLike,
  storeId: string,
  days = 7,
): Promise<StoreDailyStatus[]> {
  const result = await db
    .prepare(
      `SELECT * FROM store_daily_status
       WHERE store_id = ?
       ORDER BY date DESC
       LIMIT ?`,
    )
    .bind(storeId, days)
    .all<StoreDailyStatus>();
  return result.results ?? [];
}

// ── Employee Shifts ───────────────────────────────────────────

/** Upsert a shift record (called during attendance sync). */
export async function upsertShift(db: D1DatabaseLike, shift: Omit<EmployeeShift, 'synced_at'>): Promise<void> {
  await db
    .prepare(
      `INSERT INTO employee_shifts
         (shift_id, store_id, employee_id, employee_name, shift_date,
          clock_in_at, clock_out_at, late_alert_sent, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(shift_id)
       DO UPDATE SET clock_in_at      = excluded.clock_in_at,
                     clock_out_at     = excluded.clock_out_at,
                     synced_at        = datetime('now')`,
    )
    .bind(
      shift.shift_id,
      shift.store_id,
      shift.employee_id,
      shift.employee_name,
      shift.shift_date,
      shift.clock_in_at,
      shift.clock_out_at,
      shift.late_alert_sent,
    )
    .run();
}

export async function markLateAlertSent(
  db: D1DatabaseLike,
  shiftId: string,
): Promise<void> {
  await db
    .prepare(`UPDATE employee_shifts SET late_alert_sent = 1 WHERE shift_id = ?`)
    .bind(shiftId)
    .run();
}

export async function getTodayShifts(
  db: D1DatabaseLike,
  storeId: string,
  date: string,
): Promise<EmployeeShift[]> {
  const result = await db
    .prepare(
      `SELECT * FROM employee_shifts
       WHERE store_id = ? AND shift_date = ?
       ORDER BY clock_in_at ASC NULLS LAST`,
    )
    .bind(storeId, date)
    .all<EmployeeShift>();
  return result.results ?? [];
}

// ── Alert Log ─────────────────────────────────────────────────

/**
 * Insert an alert — skips silently if dedup_key already exists.
 * Returns true if the alert was actually inserted (not a duplicate).
 *
 * Strategy: for keyed alerts, SELECT first to detect duplicates before INSERT.
 * For un-keyed alerts (dedupKey=null), always insert and return true.
 */
export async function logAlert(
  db: D1DatabaseLike,
  params: {
    storeId: string | null;
    alertType: string;
    message: string;
    channel: string;
    dedupKey: string | null;
  },
): Promise<boolean> {
  try {
    // If a dedup key is provided, check for an existing row first
    if (params.dedupKey !== null) {
      const existing = await db
        .prepare(`SELECT id FROM ops_alerts WHERE dedup_key = ? LIMIT 1`)
        .bind(params.dedupKey)
        .all<{ id: number }>();
      if ((existing.results?.length ?? 0) > 0) return false; // already sent
    }

    await db
      .prepare(
        `INSERT INTO ops_alerts (store_id, alert_type, message, channel, dedup_key)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        params.storeId,
        params.alertType,
        params.message,
        params.channel,
        params.dedupKey,
      )
      .run();

    return true;
  } catch {
    return false;
  }
}

export async function getRecentAlerts(
  db: D1DatabaseLike,
  limit = 50,
): Promise<OpsAlert[]> {
  const result = await db
    .prepare(
      `SELECT * FROM ops_alerts ORDER BY sent_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<OpsAlert>();
  return result.results ?? [];
}

export async function getAlertsByType(
  db: D1DatabaseLike,
  alertType: string,
  since: string,
): Promise<OpsAlert[]> {
  const result = await db
    .prepare(
      `SELECT * FROM ops_alerts
       WHERE alert_type = ? AND sent_at >= ?
       ORDER BY sent_at DESC`,
    )
    .bind(alertType, since)
    .all<OpsAlert>();
  return result.results ?? [];
}
