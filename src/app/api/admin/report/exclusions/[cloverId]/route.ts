import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

// DELETE /api/admin/report/exclusions/[cloverId] — restore item to report
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cloverId: string }> },
) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'Database not available' }, { status: 503 });

  const { cloverId } = await params;

  await db
    .prepare(`DELETE FROM report_exclusions WHERE clover_id = ?`)
    .bind(cloverId)
    .run();

  return Response.json({ ok: true, restored: cloverId });
}
