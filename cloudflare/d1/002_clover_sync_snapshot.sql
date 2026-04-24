ALTER TABLE product_metadata ADD COLUMN in_stock INTEGER;
ALTER TABLE product_metadata ADD COLUMN stock_quantity REAL;
ALTER TABLE product_metadata ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_metadata ADD COLUMN clover_updated_at INTEGER;
ALTER TABLE product_metadata ADD COLUMN synced_at TEXT;

CREATE INDEX IF NOT EXISTS idx_product_metadata_visibility
  ON product_metadata (is_active, is_visible, hide_from_catalog, category);
