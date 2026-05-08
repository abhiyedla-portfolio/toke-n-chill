import { getCatalogDb } from '@/lib/server/catalog-db';
import { getCloverOrderCredentials, fetchWeeklySales } from '@/lib/clover-orders';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

interface ProductRow {
  clover_id: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  stock_quantity: number | null;
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

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  const nowMs = Date.now();
  const startMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const nowIso = new Date(nowMs).toISOString();

  // Fetch items, exclusions, annotations in parallel
  const [itemsResult, exclusionsResult, annotationsResult] = await Promise.all([
    db.prepare(
      `SELECT clover_id, name, brand, category, stock_quantity
       FROM product_metadata
       WHERE is_active = 1 AND clover_id IS NOT NULL
       ORDER BY LOWER(COALESCE(category,'zzz')) ASC,
                LOWER(COALESCE(brand,'zzz')) ASC,
                LOWER(COALESCE(name,'')) ASC`,
    ).all<ProductRow>(),
    db.prepare(
      `SELECT clover_id, item_name, exclusion_type, excluded_until, excluded_at
       FROM report_exclusions ORDER BY excluded_at DESC`,
    ).all<ExclusionRow>(),
    db.prepare(
      `SELECT clover_id, note, found_in_store, found_at, updated_at
       FROM item_annotations`,
    ).all<AnnotationRow>(),
  ]);

  const allItems = itemsResult.results ?? [];
  const allExclusions = exclusionsResult.results ?? [];
  const allAnnotations = annotationsResult.results ?? [];

  // Index lookups
  const activeExclusionIds = new Set(
    allExclusions
      .filter((e) =>
        e.exclusion_type === 'permanent' ||
        (e.excluded_until && e.excluded_until > nowIso),
      )
      .map((e) => e.clover_id),
  );

  const annotationMap = new Map(allAnnotations.map((a) => [a.clover_id, a]));

  // Fetch weekly sales
  const creds = getCloverOrderCredentials();
  let salesMap = new Map<string, { itemId: string; name: string; unitsSold: number }>();
  if (creds) salesMap = await fetchWeeklySales(creds, startMs, nowMs);

  // Enrich items
  const items = allItems.map((item) => {
    const sales = item.clover_id ? salesMap.get(item.clover_id) : undefined;
    const annotation = item.clover_id ? annotationMap.get(item.clover_id) : undefined;
    const unitsSold = sales?.unitsSold ?? 0;
    const qty = item.stock_quantity ?? 0;
    const excluded = item.clover_id ? activeExclusionIds.has(item.clover_id) : false;

    let status: 'critical' | 'at-risk' | 'ok' = 'ok';
    if (qty < 3) status = 'critical';
    else if (unitsSold > 0 && qty <= 3) status = 'at-risk';

    return {
      cloverId: item.clover_id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      stockQuantity: qty,
      unitsSold,
      status,
      excluded,
      note: annotation?.note ?? null,
      foundInStore: (annotation?.found_in_store ?? 0) === 1,
      foundAt: annotation?.found_at ?? null,
    };
  });

  return Response.json({
    generatedAt: nowIso,
    weekStart: new Date(startMs).toISOString(),
    weekEnd: nowIso,
    items,
    exclusions: allExclusions,
  });
}
