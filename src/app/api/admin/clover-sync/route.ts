import { getCatalogDb } from '@/lib/server/catalog-db';
import { syncCatalogFromClover } from '@/lib/server/clover-sync';

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CLOVER_SYNC_SECRET;

  if (!expectedSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      },
    );
  }

  const db = await getCatalogDb();

  try {
    const result = await syncCatalogFromClover(db, { triggeredBy: 'manual' });

    return Response.json(result, {
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('[CloverSync] Manual sync failed.', error);

    return Response.json(
      { error: 'Sync failed' },
      {
        status: 500,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      },
    );
  }
}
