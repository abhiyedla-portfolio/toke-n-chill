/**
 * GET  /api/ops/schedule — fetch schedule for a store
 * POST /api/ops/schedule — update one or more days
 *
 * Body: { storeId: string, days: Array<{ dayOfWeek: number, openTime: string, closeTime: string, isClosed: boolean }> }
 */

import 'server-only';
import { getCatalogDb } from '@/lib/server/catalog-db';
import { getTokenFromRequest, verifySessionToken } from '@/lib/server/auth';
import { getStoreSchedule, upsertScheduleDay } from '@/lib/server/ops-db';

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
  const storeId = url.searchParams.get('storeId') ?? 'toke';

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'DB unavailable' }, { status: 503 });

  const schedule = await getStoreSchedule(db, storeId);
  return Response.json({ schedule });
}

interface ScheduleDayInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getCatalogDb();
  if (!db) return Response.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await request.json() as { storeId?: string; days?: ScheduleDayInput[] };
  const storeId = body.storeId ?? 'toke';
  const days = body.days ?? [];

  if (!Array.isArray(days) || days.length === 0) {
    return Response.json({ error: 'No days provided' }, { status: 400 });
  }

  // Validate time format HH:MM
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const day of days) {
    if (!timeRe.test(day.openTime) || !timeRe.test(day.closeTime)) {
      return Response.json({ error: `Invalid time format for day ${day.dayOfWeek}` }, { status: 400 });
    }
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      return Response.json({ error: 'dayOfWeek must be 0–6' }, { status: 400 });
    }
  }

  await Promise.all(
    days.map((d) =>
      upsertScheduleDay(db, {
        store_id: storeId,
        day_of_week: d.dayOfWeek,
        open_time: d.openTime,
        close_time: d.closeTime,
        is_closed: d.isClosed ? 1 : 0,
      }),
    ),
  );

  const updated = await getStoreSchedule(db, storeId);
  return Response.json({ ok: true, schedule: updated });
}
