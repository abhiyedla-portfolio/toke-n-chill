-- Items excluded from the weekly inventory report.
-- exclusion_type = 'permanent' → never appears in report
-- exclusion_type = 'temporary' → hidden until excluded_until date passes (auto-restores)

CREATE TABLE IF NOT EXISTS report_exclusions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  clover_id      TEXT NOT NULL UNIQUE,
  item_name      TEXT NOT NULL,
  exclusion_type TEXT NOT NULL CHECK(exclusion_type IN ('permanent', 'temporary')),
  excluded_until TEXT,                                  -- ISO-8601, NULL for permanent
  excluded_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_exclusions_clover_id
  ON report_exclusions (clover_id);
