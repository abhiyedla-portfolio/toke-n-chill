import { getCatalogDb } from '@/lib/server/catalog-db';
import { generateAndSendReport } from '@/lib/server/inventory-report';

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INVENTORY_REPORT_SECRET;
  if (!expectedSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  }

  const db = await getCatalogDb();
  if (!db) {
    return Response.json(
      { error: 'Database not available' },
      { status: 503, headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  }

  try {
    const result = await generateAndSendReport(db);
    return Response.json(result, {
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('[InventoryReport] On-demand report failed:', error);
    return Response.json(
      { error: 'Report generation failed' },
      { status: 500, headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  }
}
