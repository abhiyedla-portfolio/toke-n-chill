// Clover Orders API — fetch sales line items for a given time window.
// unitQty in Clover is stored in thousandths: 1000 = 1 unit sold.

export interface CloverLineItem {
  id: string;
  name?: string;
  unitQty?: number; // thousandths — 1000 means 1 unit
  item?: { id: string };
}

export interface CloverOrder {
  id: string;
  createdTime: number; // epoch ms
  lineItems?: { elements: CloverLineItem[] };
}

interface CloverOrdersResponse {
  elements: CloverOrder[];
}

export interface ItemSalesSummary {
  itemId: string;
  name: string;
  unitsSold: number;
}

export interface CloverOrderCredentials {
  merchantId: string;
  apiToken: string;
  baseUrl: string;
}

export function getCloverOrderCredentials(): CloverOrderCredentials | null {
  const baseUrl = process.env.CLOVER_API_BASE_URL ?? 'https://api.clover.com/v3';
  const merchantId = process.env.CLOVER_MERCHANT_ID_TOKE;
  const apiToken = process.env.CLOVER_API_TOKEN_TOKE;

  if (!merchantId || !apiToken) return null;
  return { merchantId, apiToken, baseUrl };
}

async function fetchOrdersPage(
  creds: CloverOrderCredentials,
  startMs: number,
  endMs: number,
  offset: number,
): Promise<CloverOrder[]> {
  const url = new URL(`${creds.baseUrl}/merchants/${creds.merchantId}/orders`);

  // Clover requires multiple filter params — use append, not set
  url.searchParams.append('filter', `createdTime>=${startMs}`);
  url.searchParams.append('filter', `createdTime<=${endMs}`);
  url.searchParams.set('expand', 'lineItems');
  url.searchParams.set('limit', '200');
  url.searchParams.set('offset', String(offset));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '3', 10);
      console.warn(`[CloverOrders] Rate limited, waiting ${retryAfter}s`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return [];
    }

    if (!res.ok) {
      console.error(`[CloverOrders] API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as CloverOrdersResponse;
    return data.elements ?? [];
  } catch (err) {
    console.error('[CloverOrders] Fetch failed:', err);
    return [];
  }
}

/**
 * Fetch all orders in [startMs, endMs] and aggregate units sold per Clover item ID.
 * Returns a Map of itemId → ItemSalesSummary.
 */
export async function fetchWeeklySales(
  creds: CloverOrderCredentials,
  startMs: number,
  endMs: number,
): Promise<Map<string, ItemSalesSummary>> {
  const salesMap = new Map<string, ItemSalesSummary>();
  let offset = 0;
  const pageSize = 200;

  while (true) {
    const orders = await fetchOrdersPage(creds, startMs, endMs, offset);
    if (orders.length === 0) break;

    for (const order of orders) {
      for (const lineItem of order.lineItems?.elements ?? []) {
        const itemId = lineItem.item?.id;
        if (!itemId) continue;

        // Clover stores unitQty in thousandths (1000 = 1 unit)
        const units = Math.max(1, Math.round((lineItem.unitQty ?? 1000) / 1000));

        const existing = salesMap.get(itemId);
        if (existing) {
          existing.unitsSold += units;
        } else {
          salesMap.set(itemId, {
            itemId,
            name: lineItem.name ?? 'Unknown Item',
            unitsSold: units,
          });
        }
      }
    }

    if (orders.length < pageSize) break;
    offset += pageSize;
  }

  return salesMap;
}
