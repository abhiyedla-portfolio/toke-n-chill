import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

// GET /api/admin/report/exclusions — list all exclusions
export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  const result = await db
    .prepare(`SELECT * FROM report_exclusions ORDER BY excluded_at DESC`)
    .all();

  return Response.json({ exclusions: result.results ?? [] });
}

// POST /api/admin/report/exclusions — add an exclusion
// Body: { cloverId, itemName, type: 'permanent' | 'temporary' }
export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  let cloverId: string;
  let itemName: string;
  let type: string;

  try {
    const body = await request.json() as {
      cloverId?: unknown;
      itemName?: unknown;
      type?: unknown;
    };
    cloverId = typeof body.cloverId === 'string' ? body.cloverId.trim() : '';
    itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
    type = typeof body.type === 'string' ? body.type : '';
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!cloverId || !itemName) {
    return Response.json({ error: 'cloverId and itemName are required' }, { status: 400 });
  }

  if (type !== 'permanent' && type !== 'temporary') {
    return Response.json({ error: 'type must be "permanent" or "temporary"' }, { status: 400 });
  }

  // Temporary = skip for 8 days (covers the full next report cycle)
  const excludedUntil =
    type === 'temporary'
      ? new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  await db
    .prepare(
      `INSERT INTO report_exclusions (clover_id, item_name, exclusion_type, excluded_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(clover_id) DO UPDATE SET
         item_name      = excluded.item_name,
         exclusion_type = ?,
         excluded_until = ?,
         excluded_at    = CURRENT_TIMESTAMP`,
    )
    .bind(cloverId, itemName, type, excludedUntil, type, excludedUntil)
    .run();

  return Response.json({ ok: true, type, excludedUntil });
}
