import { getCatalogDb } from '@/lib/server/catalog-db';
import {
  ensureInventoryDashboardSchema,
  getCurrentCentralWeekWindow,
  type OrderSource,
  type WeekItemStatus,
} from '@/lib/server/inventory-intelligence';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

const ITEM_STATUSES: WeekItemStatus[] = ['active', 'skipped', 'removed', 'ordered'];
const ORDER_SOURCES: OrderSource[] = ['unknown', 'warehouse', 'online'];

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

function isWeekItemStatus(value: string): value is WeekItemStatus {
  return ITEM_STATUSES.includes(value as WeekItemStatus);
}

function isOrderSource(value: string): value is OrderSource {
  return ORDER_SOURCES.includes(value as OrderSource);
}

function nextWeekStartIso(): string {
  return getCurrentCentralWeekWindow(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).weekStart;
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  await ensureInventoryDashboardSchema(db);

  let body: {
    weekId?: unknown;
    note?: unknown;
    cloverId?: unknown;
    itemName?: unknown;
    itemStatus?: unknown;
    orderSource?: unknown;
    skippedUntil?: unknown;
    clearItemNotes?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const weekId = typeof body.weekId === 'string' ? body.weekId.trim() : '';
  if (!weekId) {
    return Response.json({ error: 'weekId is required' }, { status: 400 });
  }

  const cloverId = typeof body.cloverId === 'string' ? body.cloverId.trim() : '';
  const note = typeof body.note === 'string' ? body.note : null;
  const clearItemNotes = body.clearItemNotes === true;

  if (!cloverId) {
    if (clearItemNotes) {
      await db.prepare(
        `UPDATE inventory_week_runs
         SET note = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE week_id = ?`,
      ).bind(weekId).run();
      await db.prepare(
        `UPDATE inventory_week_items
         SET note = '', updated_at = CURRENT_TIMESTAMP
         WHERE week_id = ?`,
      ).bind(weekId).run();

      return Response.json({ ok: true, weekId, clearedItemNotes: true });
    }

    await db.prepare(
      `UPDATE inventory_week_runs
       SET note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE week_id = ?`,
    ).bind(note, weekId).run();
    return Response.json({ ok: true, weekId, note });
  }

  const itemName = typeof body.itemName === 'string' && body.itemName.trim()
    ? body.itemName.trim()
    : cloverId;
  const itemStatus = typeof body.itemStatus === 'string' && isWeekItemStatus(body.itemStatus)
    ? body.itemStatus
    : 'active';
  const orderSource = typeof body.orderSource === 'string' && isOrderSource(body.orderSource)
    ? body.orderSource
    : 'unknown';
  const skippedUntil = itemStatus === 'skipped'
    ? (typeof body.skippedUntil === 'string' && body.skippedUntil.trim()
        ? body.skippedUntil.trim()
        : nextWeekStartIso())
    : null;

  await db.prepare(
    `INSERT INTO inventory_week_items (
       week_id,
       clover_id,
       item_name,
       item_status,
       order_source,
       note,
       skipped_until
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(week_id, clover_id) DO UPDATE SET
       item_name = excluded.item_name,
       item_status = excluded.item_status,
       order_source = excluded.order_source,
       note = COALESCE(excluded.note, inventory_week_items.note),
       skipped_until = excluded.skipped_until,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    weekId,
    cloverId,
    itemName,
    itemStatus,
    orderSource,
    note,
    skippedUntil,
  ).run();

  return Response.json({
    ok: true,
    weekId,
    cloverId,
    itemStatus,
    orderSource,
    note,
    skippedUntil,
  });
}
