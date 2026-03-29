import 'server-only';

import { getBrandId } from '@/config/brands';

// --- Clover API Types ---

export interface CloverItem {
  id: string;
  name: string;
  price: number; // in cents
  description?: string;
  hidden?: boolean;
  available?: boolean;
  autoManage?: boolean;
  categories?: { elements: CloverCategory[] };
  tags?: { elements: { id: string; name: string }[] };
  modifierGroups?: { elements: CloverModifierGroup[] };
  itemStock?: { quantity: number };
}

export interface CloverCategory {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface CloverModifierGroup {
  id: string;
  name: string;
  modifiers?: { elements: CloverModifier[] };
}

export interface CloverModifier {
  id: string;
  name: string;
  price?: number;
}

export interface CloverItemStock {
  item: { id: string };
  quantity: number;
  stockCount?: number;
}

interface CloverListResponse<T> {
  elements: T[];
  href?: string;
}

// --- Credentials ---

interface CloverCredentials {
  merchantId: string;
  apiToken: string;
  baseUrl: string;
}

export function getCloverCredentials(): CloverCredentials | null {
  const brandId = getBrandId();
  const baseUrl = process.env.CLOVER_API_BASE_URL || 'https://api.clover.com/v3';

  let merchantId: string | undefined;
  let apiToken: string | undefined;

  if (brandId === 'toke-and-chill') {
    merchantId = process.env.CLOVER_MERCHANT_ID_TOKE;
    apiToken = process.env.CLOVER_API_TOKEN_TOKE;
  } else {
    merchantId = process.env.CLOVER_MERCHANT_ID_DIZZY;
    apiToken = process.env.CLOVER_API_TOKEN_DIZZY;
  }

  if (!merchantId || !apiToken) return null;

  return { merchantId, apiToken, baseUrl };
}

// --- Fetch Wrapper ---

const CACHE_TTL = parseInt(process.env.CLOVER_CACHE_TTL || '300', 10);

async function cloverFetch<T>(
  credentials: CloverCredentials,
  endpoint: string,
  params?: Record<string, string>,
): Promise<T | null> {
  const url = new URL(
    `${credentials.baseUrl}/merchants/${credentials.merchantId}/${endpoint}`,
  );
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        Accept: 'application/json',
      },
      next: { revalidate: CACHE_TTL, tags: ['clover-items'] },
    });

    if (res.status === 429) {
      console.warn('[Clover] Rate limited, will retry on next revalidation');
      return null;
    }

    if (!res.ok) {
      console.error(`[Clover] API error: ${res.status} ${res.statusText} for ${endpoint}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error('[Clover] Fetch failed:', err);
    return null;
  }
}

// --- Data Fetchers ---

export async function fetchAllCloverItems(): Promise<CloverItem[] | null> {
  const credentials = getCloverCredentials();
  if (!credentials) return null;

  const allItems: CloverItem[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await cloverFetch<CloverListResponse<CloverItem>>(
      credentials,
      'items',
      {
        expand: 'categories,tags,modifierGroups,itemStock',
        limit: String(limit),
        offset: String(offset),
        filter: 'hidden=false',
      },
    );

    if (!data || !data.elements) break;

    allItems.push(...data.elements);

    if (data.elements.length < limit) break;
    offset += limit;
  }

  return allItems.length > 0 ? allItems : null;
}

export async function fetchItemStocks(): Promise<Map<string, number> | null> {
  const credentials = getCloverCredentials();
  if (!credentials) return null;

  const data = await cloverFetch<CloverListResponse<CloverItemStock>>(
    credentials,
    'item_stocks',
    { limit: '1000' },
  );

  if (!data || !data.elements) return null;

  const stockMap = new Map<string, number>();
  for (const stock of data.elements) {
    stockMap.set(stock.item.id, stock.quantity ?? stock.stockCount ?? 0);
  }
  return stockMap;
}

export async function fetchCloverCategories(): Promise<CloverCategory[] | null> {
  const credentials = getCloverCredentials();
  if (!credentials) return null;

  const data = await cloverFetch<CloverListResponse<CloverCategory>>(
    credentials,
    'categories',
    { limit: '200' },
  );

  return data?.elements ?? null;
}
