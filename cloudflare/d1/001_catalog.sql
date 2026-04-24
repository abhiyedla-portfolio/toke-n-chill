CREATE TABLE IF NOT EXISTS product_metadata (
  slug TEXT PRIMARY KEY,
  clover_id TEXT UNIQUE,
  name TEXT,
  brand TEXT,
  category TEXT,
  description TEXT,
  image TEXT,
  variants_json TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  new_arrival INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  hide_from_catalog INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_metadata_clover_id
  ON product_metadata (clover_id);

CREATE INDEX IF NOT EXISTS idx_product_metadata_category
  ON product_metadata (category);

CREATE INDEX IF NOT EXISTS idx_product_metadata_sort_order
  ON product_metadata (sort_order, featured DESC, name ASC);

CREATE TRIGGER IF NOT EXISTS trg_product_metadata_updated_at
AFTER UPDATE ON product_metadata
FOR EACH ROW
BEGIN
  UPDATE product_metadata
  SET updated_at = CURRENT_TIMESTAMP
  WHERE slug = NEW.slug;
END;
