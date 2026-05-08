-- ============================================================
-- Toke-N-Chill Operations Automation — D1 Migration
-- Run via: wrangler d1 execute CATALOG_DB --file=src/db/ops-migration.sql
-- ============================================================

-- ── Store schedule ────────────────────────────────────────────
-- Expected open/close times per store per day of week
CREATE TABLE IF NOT EXISTS store_schedule (
  store_id     TEXT    NOT NULL,          -- 'toke', 'dizzy', etc.
  day_of_week  INTEGER NOT NULL,          -- 0=Sun 1=Mon … 6=Sat
  open_time    TEXT    NOT NULL,          -- 'HH:MM' 24-hour CST
  close_time   TEXT    NOT NULL,          -- 'HH:MM' 24-hour CST
  is_closed    INTEGER NOT NULL DEFAULT 0,-- 1 = store closed this day
  updated_at   TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (store_id, day_of_week)
);

-- ── Daily store open/close status ────────────────────────────
CREATE TABLE IF NOT EXISTS store_daily_status (
  store_id            TEXT NOT NULL,
  date                TEXT NOT NULL,   -- 'YYYY-MM-DD' CST
  first_order_at      TEXT,            -- ISO-8601 of first order detected
  last_order_at       TEXT,            -- ISO-8601 of most recent order (updated throughout day)
  opened_on_time      INTEGER,         -- 1=yes 0=no NULL=not yet determined
  closed_on_time      INTEGER,         -- 1=yes 0=no NULL=not yet determined
  open_alert_sent     INTEGER NOT NULL DEFAULT 0,
  close_alert_sent    INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (store_id, date)
);

-- ── Employee shift records (synced from Clover) ───────────────
CREATE TABLE IF NOT EXISTS employee_shifts (
  shift_id        TEXT NOT NULL PRIMARY KEY,  -- Clover shift ID
  store_id        TEXT NOT NULL,
  employee_id     TEXT NOT NULL,
  employee_name   TEXT NOT NULL,
  shift_date      TEXT NOT NULL,              -- 'YYYY-MM-DD' CST
  clock_in_at     TEXT,                       -- ISO-8601 or NULL if not yet clocked in
  clock_out_at    TEXT,                       -- ISO-8601 or NULL if still working
  late_alert_sent INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_date     ON employee_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_store    ON employee_shifts(store_id, shift_date);

-- ── Alert log ─────────────────────────────────────────────────
-- dedup_key prevents sending the same alert twice (e.g., same employee, same day)
CREATE TABLE IF NOT EXISTS ops_alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id    TEXT,
  alert_type  TEXT NOT NULL,   -- 'late_open' | 'no_close' | 'employee_late' | 'no_show' | 'refund' | 'void'
  message     TEXT NOT NULL,
  channel     TEXT NOT NULL,   -- 'telegram' | 'discord' | 'both'
  sent_at     TEXT DEFAULT (datetime('now')),
  dedup_key   TEXT UNIQUE      -- e.g. 'late_open:toke:2026-05-01' — NULL allows duplicates
);

CREATE INDEX IF NOT EXISTS idx_ops_alerts_sent_at ON ops_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_alerts_type    ON ops_alerts(alert_type);

-- ── Seed default schedules ────────────────────────────────────
-- Mon–Sat 10 AM–9 PM, closed Sunday. Edit in the Ops Dashboard.
INSERT OR IGNORE INTO store_schedule (store_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('toke', 0, '10:00', '21:00', 1),
  ('toke', 1, '10:00', '21:00', 0),
  ('toke', 2, '10:00', '21:00', 0),
  ('toke', 3, '10:00', '21:00', 0),
  ('toke', 4, '10:00', '21:00', 0),
  ('toke', 5, '10:00', '21:00', 0),
  ('toke', 6, '10:00', '21:00', 0);
