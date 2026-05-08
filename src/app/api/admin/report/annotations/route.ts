import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

// POST /api/admin/report/annotations
// Body: { cloverId, itemName, note?, foundInStore? }
export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  let cloverId: string;
  let itemName: string;
  let note: string | null;
  let foundInStore: boolean | null;

  try {
    const body = await request.json() as {
      cloverId?: unknown;
      itemName?: unknown;
      note?: unknown;
      foundInStore?: unknown;
    };
    cloverId = typeof body.cloverId === 'string' ? body.cloverId.trim() : '';
    itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
    note = typeof body.note === 'string' ? body.note : null;
    foundInStore = typeof body.foundInStore === 'boolean' ? body.foundInStore : null;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!cloverId || !itemName) {
    return Response.json({ error: 'cloverId and itemName are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const foundAt = foundInStore === true ? now : null;

  // Build dynamic UPSERT — only update fields that were provided
  if (note !== null && foundInStore !== null) {
    await db.prepare(
      `INSERT INTO item_annotations (clover_id, item_name, note, found_in_store, found_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(clover_id) DO UPDATE SET
         item_name      = excluded.item_name,
         note           = excluded.note,
         found_in_store = excluded.found_in_store,
         found_at       = CASE WHEN excluded.found_in_store = 1 THEN excluded.found_at ELSE found_at END,
         updated_at     = excluded.updated_at`,
    ).bind(cloverId, itemName, note, foundInStore ? 1 : 0, foundAt, now).run();
  } else if (note !== null) {
    await db.prepare(
      `INSERT INTO item_annotations (clover_id, item_name, note, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(clover_id) DO UPDATE SET
         item_name  = excluded.item_name,
         note       = excluded.note,
         updated_at = excluded.updated_at`,
    ).bind(cloverId, itemName, note, now).run();
  } else if (foundInStore !== null) {
    await db.prepare(
      `INSERT INTO item_annotations (clover_id, item_name, found_in_store, found_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(clover_id) DO UPDATE SET
         item_name      = excluded.item_name,
         found_in_store = excluded.found_in_store,
         found_at       = CASE WHEN excluded.found_in_store = 1 THEN excluded.found_at ELSE found_at END,
         updated_at     = excluded.updated_at`,
    ).bind(cloverId, itemName, foundInStore ? 1 : 0, foundAt, now).run();
  }

  return Response.json({ ok: true });
}
