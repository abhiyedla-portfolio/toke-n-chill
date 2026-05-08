/**
 * GET /api/ops/status
 * Returns today's store status + employee attendance for the Ops Dashboard.
 * Requires admin session.
 */

import 'server-only';
import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';
import {
  getStoreSchedule,
  getDailyStatus,
  getTodayShifts,
  getRecentDailyStatuses,
} from '@/lib/server/ops-db';
import { getTodayCst } from '@/lib/server/clover-employees';

async function isAuthorized(req: Request): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifySessionToken(token)) !== null;
}

const STORE_IDS = ['toke'];

export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'DB unavailable' }, { status: 503 });

  const { dateCst, nowCst } = getTodayCst();
  const dow = nowCst.getDay();

  const stores = await Promise.all(
    STORE_IDS.map(async (storeId) => {
      const [schedule, dailyStatus, todayShifts, recentStatuses] = await Promise.all([
        getStoreSchedule(db, storeId),
        getDailyStatus(db, storeId, dateCst),
        getTodayShifts(db, storeId, dateCst),
        getRecentDailyStatuses(db, storeId, 7),
      ]);

      const todaySchedule = schedule.find((s) => s.day_of_week === dow);

      return {
        storeId,
        todayDate: dateCst,
        schedule: todaySchedule ?? null,
        dailyStatus,
        todayShifts,
        recentStatuses,
        nowUtc: new Date().toISOString(),
      };
    }),
  );

  return Response.json({ stores, generatedAt: new Date().toISOString() });
}
