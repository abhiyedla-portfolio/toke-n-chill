-- Per-item annotations: notes and found-in-store status.
-- Managed via the admin dashboard. Survives catalog re-syncs.

CREATE TABLE IF NOT EXISTS item_annotations (
  clover_id      TEXT PRIMARY KEY,
  item_name      TEXT NOT NULL,
  note           TEXT,
  found_in_store INTEGER NOT NULL DEFAULT 0,  -- 1 = physically verified in store
  found_at       TEXT,                         -- ISO-8601 when last marked as found
  updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
