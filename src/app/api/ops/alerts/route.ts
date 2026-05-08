/**
 * GET /api/ops/alerts
 * Returns the recent alerts feed for the Ops Dashboard.
 * Requires admin session.
 */

import 'server-only';
import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';
import { getRecentAlerts } from '@/lib/server/ops-db';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'DB unavailable' }, { status: 503 });

  const alerts = await getRecentAlerts(db, limit);
  return Response.json({ alerts, generatedAt: new Date().toISOString() });
}
