import { mapCloverCategory } from '../../config/clover-category-map';
import {
  fetchAllCloverItems,
  fetchItemStocks,
  type CloverItem,
} from '../clover';
import { extractBrandFromName } from '../brand-extraction';
import { slugify } from '../utils';
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  ExistingCatalogKeyRow,
} from './catalog-db';

interface SyncCatalogOptions {
  triggeredBy?: 'cron' | 'manual';
}

export interface SyncCatalogResult {
  activeProducts: number;
  deactivatedProducts: number;
  generatedAt: string;
  source: 'clover-sync';
  totalProducts: number;
  triggeredBy: 'cron' | 'manual';
}

const INSERT_PRODUCT_SQL = `
  INSERT INTO product_metadata (
    slug,
    clover_id,
    name,
    brand,
    category,
    description,
    image,
    variants_json,
    featured,
    new_arrival,
    sort_order,
    is_active,
    hide_from_catalog,
    in_stock,
    stock_quantity,
    is_visible,
    clover_updated_at,
    synced_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_PRODUCT_SQL = `
  UPDATE product_metadata
  SET
    clover_id = ?,
    name = ?,
    brand = CASE WHEN brand != 'House Brand' THEN brand ELSE ? END,
    category = ?,
    description = ?,
    variants_json = ?,
    featured = CASE WHEN featured = 1 THEN featured ELSE ? END,
    new_arrival = CASE WHEN new_arrival = 1 THEN new_arrival ELSE ? END,
    is_active = 1,
    in_stock = ?,
    stock_quantity = ?,
    is_visible = ?,
    clover_updated_at = ?,
    synced_at = ?
  WHERE slug = ?
`;

const DEACTIVATE_PRODUCT_SQL = `
  UPDATE product_metadata
  SET
    is_active = 0,
    is_visible = 0,
    in_stock = 0,
    stock_quantity = NULL,
    synced_at = ?
  WHERE clover_id = ?
`;

function parseTagFlag(item: CloverItem, values: string[]) {
  const normalizedValues = new Set(values.map((value) => value.toLowerCase()));

  return item.tags?.elements?.some((tag) => normalizedValues.has(tag.name.toLowerCase())) ?? false;
}

function extractBrand(item: CloverItem): string {
  // 1. Explicit Clover tag wins: e.g. tag named "brand: Geek Bar"
  const tagBrand = item.tags?.elements?.find((tag) =>
    tag.name.toLowerCase().startsWith('brand:'),
  );
  if (tagBrand) {
    return tagBrand.name.replace(/^brand:\s*/i, '').trim();
  }

  // 2. Legacy " - " naming convention: "Geek Bar - Mango Ice" → "Geek Bar"
  if (item.name.includes(' - ')) {
    return item.name.split(' - ')[0].trim();
  }

  // 3. Name-prefix dictionary (covers all known brands in the catalog)
  const extracted = extractBrandFromName(item.name);
  if (extracted) return extracted;

  // 4. Genuine unknown — keep as "House Brand" rather than leaving it blank
  return 'House Brand';
}

function normalizeName(item: CloverItem): string {
  if (!item.name.includes(' - ')) {
    return item.name;
  }

  return item.name.split(' - ').slice(1).join(' - ').trim();
}

function extractVariants(item: CloverItem): string[] | undefined {
  const variants: string[] = [];

  for (const group of item.modifierGroups?.elements ?? []) {
    for (const modifier of group.modifiers?.elements ?? []) {
      variants.push(modifier.name);
    }
  }

  return variants.length > 0 ? variants : undefined;
}

function extractCategory(item: CloverItem): string {
  for (const category of item.categories?.elements ?? []) {
    const mapped = mapCloverCategory(category.name);

    if (mapped) {
      return mapped;
    }
  }

  return 'accessories';
}

function getStockQuantity(
  item: CloverItem,
  stockMap: Map<string, number> | null,
) {
  return stockMap?.get(item.id) ?? item.itemStock?.quantity ?? 0;
}

function buildInsertStatement(
  db: D1DatabaseLike,
  item: CloverItem,
  stockMap: Map<string, number> | null,
  slug: string,
  syncedAt: string,
): D1PreparedStatementLike {
  const stockQuantity = getStockQuantity(item, stockMap);

  return db.prepare(INSERT_PRODUCT_SQL).bind(
    slug,
    item.id,
    normalizeName(item),
    extractBrand(item),
    extractCategory(item),
    item.description ?? '',
    null,
    JSON.stringify(extractVariants(item) ?? []),
    parseTagFlag(item, ['featured']) ? 1 : 0,
    parseTagFlag(item, ['new', 'new arrival']) ? 1 : 0,
    0,
    1,
    0,
    stockQuantity > 0 ? 1 : 0,
    stockQuantity,
    !item.hidden && item.available !== false ? 1 : 0,
    item.itemStock?.modifiedTime ?? item.modifiedTime ?? Date.now(),
    syncedAt,
  );
}

function buildUpdateStatement(
  db: D1DatabaseLike,
  item: CloverItem,
  stockMap: Map<string, number> | null,
  rowSlug: string,
  syncedAt: string,
): D1PreparedStatementLike {
  const stockQuantity = getStockQuantity(item, stockMap);

  return db.prepare(UPDATE_PRODUCT_SQL).bind(
    item.id,
    normalizeName(item),
    extractBrand(item),
    extractCategory(item),
    item.description ?? '',
    JSON.stringify(extractVariants(item) ?? []),
    parseTagFlag(item, ['featured']) ? 1 : 0,
    parseTagFlag(item, ['new', 'new arrival']) ? 1 : 0,
    stockQuantity > 0 ? 1 : 0,
    stockQuantity,
    !item.hidden && item.available !== false ? 1 : 0,
    item.itemStock?.modifiedTime ?? item.modifiedTime ?? Date.now(),
    syncedAt,
    rowSlug,
  );
}

async function runStatements(
  db: D1DatabaseLike,
  statements: D1PreparedStatementLike[],
) {
  if (statements.length === 0) {
    return;
  }

  if (db.batch) {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
}

function createUniqueSlug(
  baseSlug: string,
  itemId: string,
  usedSlugs: Set<string>,
) {
  let candidate = baseSlug || slugify(itemId);

  if (!usedSlugs.has(candidate)) {
    return candidate;
  }

  const suffix = itemId.toLowerCase().slice(-6);
  candidate = `${candidate}-${suffix}`;

  if (!usedSlugs.has(candidate)) {
    return candidate;
  }

  let index = 2;
  while (usedSlugs.has(`${candidate}-${index}`)) {
    index += 1;
  }

  return `${candidate}-${index}`;
}

export async function syncCatalogFromClover(
  db: D1DatabaseLike | undefined,
  options: SyncCatalogOptions = {},
): Promise<SyncCatalogResult> {
  if (!db) {
    throw new Error('CATALOG_DB binding is not configured.');
  }

  const [items, stockMap, existingKeysResponse] = await Promise.all([
    fetchAllCloverItems(),
    fetchItemStocks(),
    db.prepare(`
      SELECT slug, clover_id
      FROM product_metadata
    `).all<ExistingCatalogKeyRow>(),
  ]);

  if (!items || items.length === 0) {
    throw new Error('No Clover inventory items were returned.');
  }

  const syncedAt = new Date().toISOString();
  const triggeredBy = options.triggeredBy ?? 'manual';
  const existingRows = existingKeysResponse.results ?? [];
  const existingByCloverId = new Map(
    existingRows
      .filter((row) => row.clover_id && row.slug)
      .map((row) => [row.clover_id as string, row.slug as string]),
  );
  const existingBySlug = new Map(
    existingRows
      .filter((row) => row.slug)
      .map((row) => [row.slug as string, row.clover_id ?? null]),
  );
  const usedSlugs = new Set(
    existingRows
      .map((row) => row.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );
  const seenCloverIds = new Set<string>();
  const statements: D1PreparedStatementLike[] = [];

  for (const item of items) {
    seenCloverIds.add(item.id);

    const defaultSlug = slugify(item.name) || slugify(item.id);
    const existingSlug = existingByCloverId.get(item.id);

    if (existingSlug) {
      statements.push(
        buildUpdateStatement(db, item, stockMap, existingSlug, syncedAt),
      );
      continue;
    }

    const slugOwner = existingBySlug.get(defaultSlug);
    if (slugOwner === null || slugOwner === item.id) {
      statements.push(
        buildUpdateStatement(db, item, stockMap, defaultSlug, syncedAt),
      );
      existingByCloverId.set(item.id, defaultSlug);
      continue;
    }

    const insertSlug = createUniqueSlug(defaultSlug, item.id, usedSlugs);
    usedSlugs.add(insertSlug);
    existingByCloverId.set(item.id, insertSlug);
    statements.push(
      buildInsertStatement(db, item, stockMap, insertSlug, syncedAt),
    );
  }

  await runStatements(db, statements);

  const staleIds = Array.from(existingByCloverId.keys()).filter(
    (cloverId) => !seenCloverIds.has(cloverId),
  );

  await runStatements(
    db,
    staleIds.map((cloverId) =>
      db.prepare(DEACTIVATE_PRODUCT_SQL).bind(syncedAt, cloverId),
    ),
  );

  return {
    activeProducts: items.filter((item) => item.available !== false).length,
    deactivatedProducts: staleIds.length,
    generatedAt: syncedAt,
    source: 'clover-sync',
    totalProducts: items.length,
    triggeredBy,
  };
}
