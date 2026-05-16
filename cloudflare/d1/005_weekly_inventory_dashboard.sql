-- Weekly inventory buying workspace.
-- Stores Clover price snapshots plus per-week notes, item decisions, and order source.

ALTER TABLE product_metadata ADD COLUMN price_cents INTEGER;

CREATE TABLE IF NOT EXISTS inventory_week_runs (
  week_id      TEXT PRIMARY KEY, -- Monday date in America/Chicago, YYYY-MM-DD
  week_start   TEXT NOT NULL,
  week_end     TEXT NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_week_items (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id              TEXT NOT NULL,
  clover_id            TEXT NOT NULL,
  item_name            TEXT NOT NULL,
  brand                TEXT,
  category             TEXT,
  stock_quantity       REAL NOT NULL DEFAULT 0,
  price_cents          INTEGER,
  units_sold_7d        INTEGER NOT NULL DEFAULT 0,
  units_sold_prev_7d   INTEGER NOT NULL DEFAULT 0,
  units_sold_30d       INTEGER NOT NULL DEFAULT 0,
  suggested_order_qty  INTEGER NOT NULL DEFAULT 0,
  item_status          TEXT NOT NULL DEFAULT 'active'
                       CHECK(item_status IN ('active', 'skipped', 'removed', 'ordered')),
  order_source         TEXT NOT NULL DEFAULT 'unknown'
                       CHECK(order_source IN ('unknown', 'warehouse', 'online')),
  note                 TEXT,
  skipped_until        TEXT,
  created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(week_id, clover_id),
  FOREIGN KEY (week_id) REFERENCES inventory_week_runs(week_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_week_items_week
  ON inventory_week_items (week_id, item_status, order_source);

CREATE INDEX IF NOT EXISTS idx_inventory_week_items_clover
  ON inventory_week_items (clover_id);
