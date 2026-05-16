/**
 * GET /api/admin/debug-ops
 * Diagnostic endpoint — shows exactly what the ops automation sees right now.
 * Hit this to diagnose missing shift data without waiting for cron.
 *
 * Returns:
 *   - env vars present (not values)
 *   - raw Clover shifts for today
 *   - store schedule from D1
 *   - recent ops alerts from D1
 *   - employee_shifts rows from D1
 */

import { NextResponse }  from 'next/server';
import { getCatalogDb }  from '@/lib/server/catalog-db';
import { fetchTodayShifts, getCloverEmployeeCredentials, getTodayCst } from '@/lib/server/clover-employees';

export const runtime = 'edge';

export async function GET() {
  const db = await getCatalogDb();
  if (!db) {
    return NextResponse.json({ error: 'D1 database not available — check CATALOG_DB binding' }, { status: 500 });
  }
  const { dateCst } = getTodayCst();

  // 1. Env var presence check
  const env = {
    CLOVER_MERCHANT_ID_TOKE:  !!process.env.CLOVER_MERCHANT_ID_TOKE,
    CLOVER_API_TOKEN_TOKE:    !!process.env.CLOVER_API_TOKEN_TOKE,
    WHATSAPP_SERVICE_URL:     !!process.env.WHATSAPP_SERVICE_URL,
    WHATSAPP_SERVICE_SECRET:  !!process.env.WHATSAPP_SERVICE_SECRET,
  };

  // 2. Clover credentials built for 'toke'
  const creds = getCloverEmployeeCredentials('toke');

  // 3. Raw shifts from Clover API
  let cloverShifts: unknown = null;
  let cloverError: string | null = null;
  try {
    const result = await fetchTodayShifts('toke');
    cloverShifts = result.shifts;
  } catch (err) {
    cloverError = String(err);
  }

  // 4. Store schedule from D1
  let schedule: unknown = null;
  let scheduleError: string | null = null;
  try {
    const rows = await db
      .prepare(`SELECT * FROM store_schedule WHERE store_id = 'toke' ORDER BY day_of_week`)
      .all();
    schedule = rows.results;
  } catch (err) {
    scheduleError = String(err);
  }

  // 5. employee_shifts rows for today
  let shiftsInD1: unknown = null;
  let shiftsError: string | null = null;
  try {
    const rows = await db
      .prepare(`SELECT * FROM employee_shifts WHERE store_id = 'toke' AND shift_date = ? ORDER BY clock_in_at`)
      .bind(dateCst)
      .all();
    shiftsInD1 = rows.results;
  } catch (err) {
    shiftsError = String(err);
  }

  // 6. Recent ops alerts
  let alerts: unknown = null;
  let alertsError: string | null = null;
  try {
    const rows = await db
      .prepare(`SELECT * FROM ops_alerts ORDER BY sent_at DESC LIMIT 20`)
      .all();
    alerts = rows.results;
  } catch (err) {
    alertsError = String(err);
  }

  return NextResponse.json({
    dateCst,
    env,
    cloverCredsBuilt: !!creds,
    cloverBaseUrl: creds?.baseUrl ?? null,
    cloverMerchantId: creds ? creds.merchantId.slice(0, 6) + '…' : null, // partial for safety
    cloverShifts,
    cloverError,
    schedule,
    scheduleError,
    shiftsInD1,
    shiftsError,
    alerts,
    alertsError,
  });
}
