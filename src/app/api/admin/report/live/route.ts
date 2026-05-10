import { mapCloverCategory } from '@/config/clover-category-map';
import { extractBrandFromName } from '@/lib/brand-extraction';
import { fetchAllCloverItems, fetchItemStocks, type CloverItem } from '@/lib/clover';
import {
  fetchSalesForWindows,
  getCloverOrderCredentials,
} from '@/lib/clover-orders';
import { getCatalogDb, type D1DatabaseLike, type D1PreparedStatementLike } from '@/lib/server/catalog-db';
import {
  buildInventoryIntelligence,
  ensureInventoryDashboardSchema,
  getCurrentCentralWeekWindow,
  type InventoryComparableItem,
  type OrderSource,
  type WeekItemStatus,
} from '@/lib/server/inventory-intelligence';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

interface ProductRow {
  clover_id: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  stock_quantity: number | null;
  price_cents?: number | null;
}

interface ExclusionRow {
  clover_id: string;
  item_name: string;
  exclusion_type: string;
  excluded_until: string | null;
  excluded_at: string;
}

interface AnnotationRow {
  clover_id: string;
  note: string | null;
  found_in_store: number;
  found_at: string | null;
  updated_at: string;
}

interface WeekRunRow {
  week_id: string;
  week_start: string;
  week_end: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface WeekItemRow {
  week_id: string;
  clover_id: string;
  item_name: string;
  brand: string | null;
  category: string | null;
  stock_quantity: number | null;
  price_cents: number | null;
  units_sold_7d: number | null;
  units_sold_prev_7d: number | null;
  units_sold_30d: number | null;
  suggested_order_qty: number | null;
  item_status: WeekItemStatus;
  order_source: OrderSource;
  note: string | null;
  skipped_until: string | null;
  updated_at: string;
}

type SalesWindowKey = 'last7' | 'prev7' | 'last30';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

function extractBrand(item: CloverItem): string {
  const tagBrand = item.tags?.elements?.find((tag) =>
    tag.name.toLowerCase().startsWith('brand:'),
  );
  if (tagBrand) return tagBrand.name.replace(/^brand:\s*/i, '').trim();
  if (item.name.includes(' - ')) return item.name.split(' - ')[0].trim();
  return extractBrandFromName(item.name) ?? 'House Brand';
}

function normalizeName(item: CloverItem): string {
  if (!item.name.includes(' - ')) return item.name;
  return item.name.split(' - ').slice(1).join(' - ').trim();
}

function extractCategory(item: CloverItem): string {
  for (const category of item.categories?.elements ?? []) {
    const mapped = mapCloverCategory(category.name);
    if (mapped) return mapped;
  }
  return 'accessories';
}

function getStockQuantity(item: CloverItem, stockMap: Map<string, number> | null): number {
  return stockMap?.get(item.id) ?? item.itemStock?.quantity ?? 0;
}

async function queryD1Items(db: D1DatabaseLike): Promise<InventoryComparableItem[]> {
  let result: { results?: ProductRow[] };

  try {
    result = await db
      .prepare(
        `SELECT clover_id, name, brand, category, stock_quantity, price_cents
         FROM product_metadata
         WHERE is_active = 1
           AND clover_id IS NOT NULL
         ORDER BY
           LOWER(COALESCE(category, 'zzz')) ASC,
           LOWER(COALESCE(brand, 'zzz')) ASC,
           LOWER(COALESCE(name, '')) ASC`,
      )
      .all<ProductRow>();
  } catch {
    result = await db
      .prepare(
        `SELECT clover_id, name, brand, category, stock_quantity
       FROM product_metadata
       WHERE is_active = 1
         AND clover_id IS NOT NULL
       ORDER BY
         LOWER(COALESCE(category, 'zzz')) ASC,
         LOWER(COALESCE(brand, 'zzz')) ASC,
         LOWER(COALESCE(name, '')) ASC`,
      )
      .all<ProductRow>();
  }

  return (result.results ?? [])
    .filter((item): item is ProductRow & { clover_id: string; name: string } =>
      Boolean(item.clover_id && item.name),
    )
    .map((item) => ({
      cloverId: item.clover_id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      stockQuantity: Number(item.stock_quantity ?? 0),
      priceCents: item.price_cents ?? null,
      unitsSold7d: 0,
      unitsSoldPrev7d: 0,
      unitsSold30d: 0,
    }));
}

async function fetchCurrentComparableItems(db: D1DatabaseLike): Promise<InventoryComparableItem[]> {
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const creds = getCloverOrderCredentials();

  const salesPromise = creds
    ? fetchSalesForWindows<SalesWindowKey>(creds, [
        { key: 'last7', startMs: nowMs - 7 * dayMs, endMs: nowMs },
        { key: 'prev7', startMs: nowMs - 14 * dayMs, endMs: nowMs - 7 * dayMs },
        { key: 'last30', startMs: nowMs - 30 * dayMs, endMs: nowMs },
      ])
    : Promise.resolve({
        last7: new Map(),
        prev7: new Map(),
        last30: new Map(),
      } as Record<SalesWindowKey, Map<string, { itemId: string; name: string; unitsSold: number }>>);

  const [cloverItems, stockMap, sales] = await Promise.all([
    fetchAllCloverItems(),
    fetchItemStocks(),
    salesPromise,
  ]);

  if (!cloverItems || cloverItems.length === 0) {
    const d1Items = await queryD1Items(db);
    return d1Items.map((item) => ({
      ...item,
      unitsSold7d: sales.last7.get(item.cloverId)?.unitsSold ?? 0,
      unitsSoldPrev7d: sales.prev7.get(item.cloverId)?.unitsSold ?? 0,
      unitsSold30d: sales.last30.get(item.cloverId)?.unitsSold ?? 0,
    }));
  }

  return cloverItems.map((item) => ({
    cloverId: item.id,
    name: normalizeName(item),
    brand: extractBrand(item),
    category: extractCategory(item),
    stockQuantity: getStockQuantity(item, stockMap),
    priceCents: item.price ?? null,
    unitsSold7d: sales.last7.get(item.id)?.unitsSold ?? 0,
    unitsSoldPrev7d: sales.prev7.get(item.id)?.unitsSold ?? 0,
    unitsSold30d: sales.last30.get(item.id)?.unitsSold ?? 0,
  }));
}

async function runStatements(db: D1DatabaseLike, statements: D1PreparedStatementLike[]) {
  if (statements.length === 0) return;
  if (db.batch) {
    await db.batch(statements);
    return;
  }
  for (const statement of statements) {
    await statement.run();
  }
}

async function upsertWeekRun(db: D1DatabaseLike, week: { weekId: string; weekStart: string; weekEnd: string }) {
  await db.prepare(
    `INSERT INTO inventory_week_runs (week_id, week_start, week_end)
     VALUES (?, ?, ?)
     ON CONFLICT(week_id) DO UPDATE SET
       week_start = excluded.week_start,
       week_end = excluded.week_end,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(week.weekId, week.weekStart, week.weekEnd).run();
}

async function upsertWeekItems(
  db: D1DatabaseLike,
  weekId: string,
  items: InventoryComparableItem[],
  intelligence: ReturnType<typeof buildInventoryIntelligence>,
) {
  const statements = items.map((item) => {
    const insight = intelligence.get(item.cloverId);
    return db.prepare(
      `INSERT INTO inventory_week_items (
         week_id,
         clover_id,
         item_name,
         brand,
         category,
         stock_quantity,
         price_cents,
         units_sold_7d,
         units_sold_prev_7d,
         units_sold_30d,
         suggested_order_qty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_id, clover_id) DO UPDATE SET
         item_name = excluded.item_name,
         brand = excluded.brand,
         category = excluded.category,
         stock_quantity = excluded.stock_quantity,
         price_cents = excluded.price_cents,
         units_sold_7d = excluded.units_sold_7d,
         units_sold_prev_7d = excluded.units_sold_prev_7d,
         units_sold_30d = excluded.units_sold_30d,
         suggested_order_qty = excluded.suggested_order_qty,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(
      weekId,
      item.cloverId,
      item.name,
      item.brand,
      item.category,
      item.stockQuantity,
      item.priceCents,
      item.unitsSold7d,
      item.unitsSoldPrev7d,
      item.unitsSold30d,
      insight?.suggestedOrderQty ?? 0,
    );
  });

  await runStatements(db, statements);
}

async function queryWeekRun(db: D1DatabaseLike, weekId: string): Promise<WeekRunRow | null> {
  const result = await db.prepare(
    `SELECT week_id, week_start, week_end, note, created_at, updated_at
     FROM inventory_week_runs
     WHERE week_id = ?
     LIMIT 1`,
  ).bind(weekId).all<WeekRunRow>();
  return result.results?.[0] ?? null;
}

async function queryWeekItems(db: D1DatabaseLike, weekId: string): Promise<WeekItemRow[]> {
  const result = await db.prepare(
    `SELECT week_id, clover_id, item_name, brand, category, stock_quantity, price_cents,
            units_sold_7d, units_sold_prev_7d, units_sold_30d, suggested_order_qty,
            item_status, order_source, note, skipped_until, updated_at
     FROM inventory_week_items
     WHERE week_id = ?
     ORDER BY
       CASE item_status
         WHEN 'active' THEN 0
         WHEN 'ordered' THEN 1
         WHEN 'skipped' THEN 2
         ELSE 3
       END,
       suggested_order_qty DESC,
       LOWER(item_name) ASC`,
  ).bind(weekId).all<WeekItemRow>();
  return result.results ?? [];
}

async function queryRecentWeeks(db: D1DatabaseLike): Promise<WeekRunRow[]> {
  const result = await db.prepare(
    `SELECT week_id, week_start, week_end, note, created_at, updated_at
     FROM inventory_week_runs
     ORDER BY week_start DESC
     LIMIT 12`,
  ).all<WeekRunRow>();
  return result.results ?? [];
}

function toComparableFromWeekRow(row: WeekItemRow): InventoryComparableItem {
  return {
    cloverId: row.clover_id,
    name: row.item_name,
    brand: row.brand,
    category: row.category,
    stockQuantity: Number(row.stock_quantity ?? 0),
    priceCents: row.price_cents,
    unitsSold7d: Number(row.units_sold_7d ?? 0),
    unitsSoldPrev7d: Number(row.units_sold_prev_7d ?? 0),
    unitsSold30d: Number(row.units_sold_30d ?? 0),
  };
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  await ensureInventoryDashboardSchema(db);

  const currentWeek = getCurrentCentralWeekWindow();
  const url = new URL(request.url);
  const requestedWeekId = url.searchParams.get('weekId')?.trim() || currentWeek.weekId;
  const isCurrentWeek = requestedWeekId === currentWeek.weekId;
  const generatedAt = new Date().toISOString();
  const nowIso = generatedAt;
  const salesDataAvailable = Boolean(getCloverOrderCredentials());

  const [exclusionsResult, annotationsResult] = await Promise.all([
    db.prepare(
      `SELECT clover_id, item_name, exclusion_type, excluded_until, excluded_at
       FROM report_exclusions ORDER BY excluded_at DESC`,
    ).all<ExclusionRow>(),
    db.prepare(
      `SELECT clover_id, note, found_in_store, found_at, updated_at
       FROM item_annotations`,
    ).all<AnnotationRow>(),
  ]);

  const exclusions = exclusionsResult.results ?? [];
  const annotationMap = new Map((annotationsResult.results ?? []).map((annotation) => [annotation.clover_id, annotation]));
  const activeExclusionIds = new Set(
    exclusions
      .filter((exclusion) =>
        exclusion.exclusion_type === 'permanent' ||
        (exclusion.excluded_until && exclusion.excluded_until > nowIso),
      )
      .map((exclusion) => exclusion.clover_id),
  );

  let weekRun: WeekRunRow | null;
  let comparableItems: InventoryComparableItem[];

  if (isCurrentWeek) {
    comparableItems = await fetchCurrentComparableItems(db);
    const currentInsights = buildInventoryIntelligence(comparableItems);
    await upsertWeekRun(db, currentWeek);
    await upsertWeekItems(db, currentWeek.weekId, comparableItems, currentInsights);
    weekRun = await queryWeekRun(db, currentWeek.weekId);
  } else {
    weekRun = await queryWeekRun(db, requestedWeekId);
    if (!weekRun) {
      return Response.json({ error: 'Week not found' }, { status: 404 });
    }
    comparableItems = (await queryWeekItems(db, requestedWeekId)).map(toComparableFromWeekRow);
  }

  const weekItems = await queryWeekItems(db, requestedWeekId);
  const weekItemMap = new Map(weekItems.map((item) => [item.clover_id, item]));
  const insights = buildInventoryIntelligence(comparableItems);

  const items = comparableItems.map((item) => {
    const weekItem = weekItemMap.get(item.cloverId);
    const insight = insights.get(item.cloverId);
    const annotation = annotationMap.get(item.cloverId);
    const excluded = activeExclusionIds.has(item.cloverId);

    return {
      cloverId: item.cloverId,
      name: item.name,
      brand: item.brand ?? 'House Brand',
      category: item.category ?? 'accessories',
      stockQuantity: item.stockQuantity,
      priceCents: item.priceCents,
      unitsSold: item.unitsSold7d,
      unitsSold7d: item.unitsSold7d,
      unitsSoldPrev7d: item.unitsSoldPrev7d,
      unitsSold14d: item.unitsSold7d + item.unitsSoldPrev7d,
      unitsSold30d: item.unitsSold30d,
      status: insight?.status ?? 'ok',
      salesTrend: insight?.salesTrend ?? 'flat',
      suggestedOrderQty: weekItem?.suggested_order_qty ?? insight?.suggestedOrderQty ?? 0,
      productLine: insight?.productLine ?? 'Unknown',
      flavorProfile: insight?.flavorProfile ?? 'Unknown',
      sameFlavorOtherLines: insight?.sameFlavorOtherLines ?? [],
      similarProducts: insight?.similarProducts ?? [],
      priceVariants: insight?.priceVariants ?? [],
      excluded,
      note: annotation?.note ?? null,
      foundInStore: (annotation?.found_in_store ?? 0) === 1,
      foundAt: annotation?.found_at ?? null,
      weekStatus: weekItem?.item_status ?? 'active',
      orderSource: weekItem?.order_source ?? 'unknown',
      weekNote: weekItem?.note ?? null,
      skippedUntil: weekItem?.skipped_until ?? null,
    };
  });

  const recentWeeks = await queryRecentWeeks(db);

  return Response.json({
    generatedAt,
    weekStart: weekRun?.week_start ?? currentWeek.weekStart,
    weekEnd: weekRun?.week_end ?? currentWeek.weekEnd,
    currentWeekId: currentWeek.weekId,
    selectedWeekId: requestedWeekId,
    isCurrentWeek,
    week: weekRun,
    weeks: recentWeeks,
    salesDataAvailable,
    salesDataMessage: salesDataAvailable
      ? null
      : 'Clover order credentials are not available locally, so sales counts cannot be calculated.',
    items,
    exclusions,
  });
}
