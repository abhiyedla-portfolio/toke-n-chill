export interface D1PreparedStatementLike {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  all: <T = unknown>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
  batch?: (statements: D1PreparedStatementLike[]) => Promise<unknown[]>;
}

export interface ProductCatalogRow {
  brand: string | null;
  category: string | null;
  clover_id: string | null;
  clover_updated_at: number | null;
  description: string | null;
  featured: number | null;
  hide_from_catalog: number | null;
  image: string | null;
  in_stock: number | null;
  is_active: number | null;
  is_visible: number | null;
  name: string | null;
  new_arrival: number | null;
  price_cents: number | null;
  slug: string | null;
  sort_order: number | null;
  stock_quantity: number | null;
  synced_at: string | null;
  variants_json: string | null;
}

export interface ExistingCatalogKeyRow {
  clover_id: string | null;
  slug: string | null;
}

export async function getCatalogDb(): Promise<D1DatabaseLike | undefined> {
  const globalScope = globalThis as Record<PropertyKey, unknown>;
  const context = globalScope[Symbol.for('__cloudflare-context__')] as
    | { env?: { CATALOG_DB?: D1DatabaseLike } }
    | undefined;

  return context?.env?.CATALOG_DB;
}
