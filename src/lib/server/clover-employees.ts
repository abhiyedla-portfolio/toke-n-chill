/**
 * clover-employees.ts
 * Fetch employees and today's shift records (clock-in/out) from the Clover API.
 *
 * Clover endpoints used:
 *   GET /v3/merchants/{mId}/employees
 *   GET /v3/merchants/{mId}/shifts
 *     ?filter=inTime>={epochMs}&filter=inTime<={epochMs}
 *     &expand=employee
 */

export interface CloverEmployee {
  id: string;
  name: string;
  nickname?: string;
  email?: string;
  role?: string;
  customId?: string;
}

export interface CloverShift {
  id: string;
  employee: { id: string; name?: string };
  inTime: number | null;   // epoch ms — when they clocked in
  outTime: number | null;  // epoch ms — when they clocked out (null = still working)
  serverBanking?: boolean;
}

interface CloverListResponse<T> {
  elements: T[];
}

interface CloverCredentials {
  merchantId: string;
  apiToken: string;
  baseUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────

async function cloverGet<T>(
  creds: CloverCredentials,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const url = new URL(`${creds.baseUrl}/merchants/${creds.merchantId}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') ?? '3', 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      return null; // caller can retry next cron tick
    }

    if (!res.ok) {
      console.error(`[CloverEmployees] ${endpoint} → ${res.status} ${res.statusText}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error('[CloverEmployees] fetch error', err);
    return null;
  }
}

/** Fetch with append-style filter params (Clover requires multiple filter= keys). */
async function cloverGetWithFilters<T>(
  creds: CloverCredentials,
  endpoint: string,
  filters: string[],
  extraParams: Record<string, string> = {},
): Promise<T | null> {
  const url = new URL(`${creds.baseUrl}/merchants/${creds.merchantId}/${endpoint}`);
  for (const f of filters) url.searchParams.append('filter', f);
  for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`[CloverEmployees] ${endpoint} → ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error('[CloverEmployees] fetch error', err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────

export function getCloverEmployeeCredentials(storeId: string): CloverCredentials | null {
  const baseUrl = process.env.CLOVER_API_BASE_URL ?? 'https://api.clover.com/v3';

  // Support two merchants — expand as needed
  if (storeId === 'dizzy') {
    const merchantId = process.env.CLOVER_MERCHANT_ID_DIZZY;
    const apiToken = process.env.CLOVER_API_TOKEN_DIZZY;
    if (!merchantId || !apiToken) return null;
    return { merchantId, apiToken, baseUrl };
  }

  // Default: toke-n-chill
  const merchantId = process.env.CLOVER_MERCHANT_ID_TOKE;
  const apiToken = process.env.CLOVER_API_TOKEN_TOKE;
  if (!merchantId || !apiToken) return null;
  return { merchantId, apiToken, baseUrl };
}

/** Fetch all active employees for a store. */
export async function fetchEmployees(storeId: string): Promise<CloverEmployee[]> {
  const creds = getCloverEmployeeCredentials(storeId);
  if (!creds) return [];

  const data = await cloverGet<CloverListResponse<CloverEmployee>>(
    creds,
    'employees',
    { limit: '200', filter: 'deleted=false' },
  );

  return data?.elements ?? [];
}

/**
 * Fetch all shift records that started within a given time window.
 * Typical usage: pass startOfDayMs and endOfDayMs for today.
 */
export async function fetchShiftsForWindow(
  storeId: string,
  startMs: number,
  endMs: number,
): Promise<CloverShift[]> {
  const creds = getCloverEmployeeCredentials(storeId);
  if (!creds) return [];

  const allShifts: CloverShift[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const data = await cloverGetWithFilters<CloverListResponse<CloverShift>>(
      creds,
      'shifts',
      [`inTime>=${startMs}`, `inTime<=${endMs}`],
      { expand: 'employee', limit: String(limit), offset: String(offset) },
    );

    if (!data?.elements?.length) break;
    allShifts.push(...data.elements);
    if (data.elements.length < limit) break;
    offset += limit;
  }

  return allShifts;
}

/**
 * Fetch today's shifts.
 * "Today" is computed in CST (UTC-5 CDT / UTC-6 CST).
 */
export async function fetchTodayShifts(storeId: string): Promise<{
  shifts: CloverShift[];
  todayDateCst: string;   // 'YYYY-MM-DD'
  startOfDayMs: number;
  endOfDayMs: number;
}> {
  const { startOfDayMs, endOfDayMs, dateCst } = getTodayCst();

  const shifts = await fetchShiftsForWindow(storeId, startOfDayMs, endOfDayMs);

  return { shifts, todayDateCst: dateCst, startOfDayMs, endOfDayMs };
}

// ── Timezone helpers ──────────────────────────────────────────

/**
 * Returns start/end of today in CST (UTC-5 during CDT, UTC-6 during CST).
 * We use the Intl API to find the correct offset at runtime.
 */
export function getTodayCst(): {
  startOfDayMs: number;
  endOfDayMs: number;
  dateCst: string;
  nowCst: Date;
} {
  const now = new Date();
  // Format current time in CST to get the date string
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const p: Record<string, string> = {};
  for (const part of parts) if (part.type !== 'literal') p[part.type] = part.value;

  const dateCst = `${p['year']}-${p['month']}-${p['day']}`;
  // hour '24' can appear at midnight — clamp to '00'
  const hour = p['hour'] === '24' ? '00' : p['hour'];
  const nowCstStr = `${dateCst}T${hour}:${p['minute']}:00`;
  const nowCst = new Date(nowCstStr); // used for comparisons

  // Build midnight start/end in UTC by finding CST offset
  const offset = getCstOffsetMs(now);
  const midnightUtcMs = Date.UTC(
    parseInt(p['year'], 10),
    parseInt(p['month'], 10) - 1,
    parseInt(p['day'], 10),
  ) + offset;

  return {
    startOfDayMs: midnightUtcMs,
    endOfDayMs: midnightUtcMs + 24 * 60 * 60 * 1000 - 1,
    dateCst,
    nowCst,
  };
}

/**
 * Returns the millisecond offset to add to midnight UTC to get midnight CST.
 * e.g. CDT = UTC-5 → offset = +5 * 3600000
 */
function getCstOffsetMs(date: Date): number {
  // Get the UTC offset for America/Chicago at this date by comparing
  // what the local time would display vs what UTC says.
  const utcHour = date.getUTCHours();
  const cstHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit',
      hour12: false,
    }).format(date),
    10,
  );
  const diff = utcHour - cstHour;
  // diff should be 5 (CDT) or 6 (CST)
  return diff * 60 * 60 * 1000;
}

/** Parse 'HH:MM' time string into a Date for a given CST date string. */
export function parseScheduleTime(dateCst: string, timeCst: string): Date {
  const [year, month, day] = dateCst.split('-').map(Number);
  const [hour, minute] = timeCst.split(':').map(Number);

  // Build a Date that represents this time in CST
  const offset = getCstOffsetMs(new Date());
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) + offset;
  return new Date(utcMs);
}
