import type { D1DatabaseLike } from './catalog-db';

export type InventoryStatus = 'critical' | 'at-risk' | 'ok';
export type WeekItemStatus = 'active' | 'skipped' | 'removed' | 'ordered';
export type OrderSource = 'unknown' | 'warehouse' | 'online';
export type SalesTrend = 'up' | 'down' | 'flat' | 'new';

export interface CentralWeekWindow {
  weekId: string;
  weekStart: string;
  weekEnd: string;
}

export interface InventoryComparableItem {
  cloverId: string;
  name: string;
  brand: string | null;
  category: string | null;
  stockQuantity: number;
  priceCents: number | null;
  unitsSold7d: number;
  unitsSoldPrev7d: number;
  unitsSold30d: number;
}

export interface RelatedInventoryItem {
  cloverId: string;
  name: string;
  line: string;
  flavor: string;
  stockQuantity: number;
  priceCents: number | null;
  unitsSold7d: number;
  reason: string;
  score: number;
}

export interface PriceVariantItem {
  cloverId: string;
  name: string;
  stockQuantity: number;
  priceCents: number | null;
}

export interface InventoryIntelligence {
  status: InventoryStatus;
  salesTrend: SalesTrend;
  suggestedOrderQty: number;
  productLine: string;
  flavorProfile: string;
  sameFlavorOtherLines: RelatedInventoryItem[];
  similarProducts: RelatedInventoryItem[];
  priceVariants: PriceVariantItem[];
}

interface ProductProfile {
  cloverId: string;
  brandKey: string;
  lineKey: string;
  lineLabel: string;
  flavorKey: string;
  flavorLabel: string;
  comparableKey: string;
  flavorBaseTokens: Set<string>;
  item: InventoryComparableItem;
}

const FLAVOR_WORDS = new Set([
  'apple',
  'alo',
  'banana',
  'berry',
  'black',
  'blue',
  'blueberry',
  'bubble',
  'candy',
  'cherry',
  'clear',
  'cola',
  'coconut',
  'coffee',
  'cranberry',
  'dragon',
  'fruit',
  'grape',
  'guava',
  'gummy',
  'ice',
  'iced',
  'kiwi',
  'lemon',
  'lime',
  'lush',
  'lychee',
  'mango',
  'melon',
  'menthol',
  'mint',
  'orange',
  'passion',
  'peach',
  'pear',
  'pineapple',
  'pop',
  'razz',
  'raspberry',
  'sour',
  'strawberry',
  'tobacco',
  'vanilla',
  'watermelon',
  'white',
]);

const FLAVOR_MODIFIERS = new Set([
  'b',
  'clear',
  'cool',
  'freeze',
  'ice',
  'iced',
  'lush',
  'menthol',
  'mint',
  'pop',
  'sour',
  'sweet',
]);

const GENERIC_TOKENS = new Set([
  'bar',
  'box',
  'ct',
  'count',
  'disposable',
  'each',
  'flavor',
  'pack',
  'pc',
  'pcs',
  'pod',
  'pods',
  'shop',
  'single',
  'the',
  'vape',
]);

export function getCurrentCentralWeekWindow(date = new Date()): CentralWeekWindow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const centralDateAtNoonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = centralDateAtNoonUtc.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const startAtNoonUtc = new Date(centralDateAtNoonUtc);
  startAtNoonUtc.setUTCDate(startAtNoonUtc.getUTCDate() - daysSinceMonday);

  const weekStartDate = startAtNoonUtc.toISOString().slice(0, 10);
  const weekEndAtNoonUtc = new Date(startAtNoonUtc);
  weekEndAtNoonUtc.setUTCDate(weekEndAtNoonUtc.getUTCDate() + 7);

  return {
    weekId: weekStartDate,
    weekStart: `${weekStartDate}T00:00:00.000Z`,
    weekEnd: `${weekEndAtNoonUtc.toISOString().slice(0, 10)}T00:00:00.000Z`,
  };
}

export async function ensureInventoryDashboardSchema(db: D1DatabaseLike) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS inventory_week_runs (
       week_id      TEXT PRIMARY KEY,
       week_start   TEXT NOT NULL,
       week_end     TEXT NOT NULL,
       note         TEXT,
       created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS inventory_week_items (
       id                   INTEGER PRIMARY KEY AUTOINCREMENT,
       week_id              TEXT NOT NULL,
       clover_id            TEXT NOT NULL,
       item_name            TEXT NOT NULL,
       brand                TEXT,
       category             TEXT,
       stock_quantity       REAL NOT NULL DEFAULT 0,
       price_cents          INTEGER,
       units_sold_7d        INTEGER NOT NULL DEFAULT 0,
       units_sold_prev_7d   INTEGER NOT NULL DEFAULT 0,
       units_sold_30d       INTEGER NOT NULL DEFAULT 0,
       suggested_order_qty  INTEGER NOT NULL DEFAULT 0,
       item_status          TEXT NOT NULL DEFAULT 'active'
                            CHECK(item_status IN ('active', 'skipped', 'removed', 'ordered')),
       order_source         TEXT NOT NULL DEFAULT 'unknown'
                            CHECK(order_source IN ('unknown', 'warehouse', 'online')),
       note                 TEXT,
       skipped_until        TEXT,
       created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(week_id, clover_id)
     )`,
  ).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_inventory_week_items_week
       ON inventory_week_items (week_id, item_status, order_source)`,
  ).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_inventory_week_items_clover
       ON inventory_week_items (clover_id)`,
  ).run();
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromTokens(tokens: string[]): string {
  if (tokens.length === 0) return 'Unknown';
  return tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && !GENERIC_TOKENS.has(token) && !/^\d+(mg|ml|g|oz)?$/.test(token));
}

function stripBrandTokens(nameTokens: string[], brand: string | null): string[] {
  const brandTokens = new Set(tokenize(brand ?? ''));
  return nameTokens.filter((token) => !brandTokens.has(token));
}

function makeProfile(item: InventoryComparableItem): ProductProfile {
  const brandKey = normalizeText(item.brand ?? 'House Brand') || 'house brand';
  const tokens = stripBrandTokens(tokenize(item.name), item.brand);
  const firstFlavorIndex = tokens.findIndex((token) => FLAVOR_WORDS.has(token));
  const lineTokens = firstFlavorIndex > 0
    ? tokens.slice(0, firstFlavorIndex)
    : tokens.slice(0, Math.min(2, tokens.length));
  const flavorTokens = firstFlavorIndex >= 0
    ? tokens.slice(firstFlavorIndex)
    : tokens.slice(lineTokens.length);
  const normalizedLineTokens = lineTokens.length > 0 ? lineTokens : ['default'];
  const normalizedFlavorTokens = flavorTokens.length > 0 ? flavorTokens : tokens;
  const flavorBaseTokens = new Set(
    normalizedFlavorTokens.filter((token) => !FLAVOR_MODIFIERS.has(token)),
  );
  const comparableTokens = tokens.length > 0 ? tokens : tokenize(item.name);

  return {
    cloverId: item.cloverId,
    brandKey,
    lineKey: normalizedLineTokens.join(' '),
    lineLabel: titleFromTokens(normalizedLineTokens),
    flavorKey: normalizedFlavorTokens.join(' '),
    flavorLabel: titleFromTokens(normalizedFlavorTokens),
    comparableKey: `${brandKey}::${comparableTokens.join(' ')}`,
    flavorBaseTokens,
    item,
  };
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of Array.from(a)) {
    if (b.has(token)) shared += 1;
  }
  return shared / Math.max(1, Math.min(a.size, b.size));
}

function sharedTokenLabel(a: Set<string>, b: Set<string>): string {
  const shared = Array.from(a).filter((token) => b.has(token));
  return shared.length > 0 ? titleFromTokens(shared) : 'Shared flavor notes';
}

function toRelatedItem(profile: ProductProfile, score: number, reason: string): RelatedInventoryItem {
  return {
    cloverId: profile.cloverId,
    name: profile.item.name,
    line: profile.lineLabel,
    flavor: profile.flavorLabel,
    stockQuantity: profile.item.stockQuantity,
    priceCents: profile.item.priceCents,
    unitsSold7d: profile.item.unitsSold7d,
    reason,
    score,
  };
}

function getSalesTrend(unitsSold7d: number, unitsSoldPrev7d: number): SalesTrend {
  if (unitsSold7d > 0 && unitsSoldPrev7d === 0) return 'new';
  if (unitsSold7d >= unitsSoldPrev7d + 2) return 'up';
  if (unitsSoldPrev7d >= unitsSold7d + 2) return 'down';
  return 'flat';
}

function getInventoryStatus(item: InventoryComparableItem): InventoryStatus {
  const velocity = Math.max(item.unitsSold7d, item.unitsSoldPrev7d, item.unitsSold30d / 4);
  if (item.stockQuantity < 3) return 'critical';
  if (velocity > 0 && item.stockQuantity <= Math.max(3, Math.ceil(velocity * 0.75))) {
    return 'at-risk';
  }
  return 'ok';
}

function getSuggestedOrderQty(item: InventoryComparableItem): number {
  const velocity = Math.max(item.unitsSold7d, item.unitsSoldPrev7d, item.unitsSold30d / 4);
  if (velocity <= 0) return Math.max(0, 3 - item.stockQuantity);

  const trendBoost = item.unitsSold7d > item.unitsSoldPrev7d ? 2.5 : 2;
  const targetStock = Math.max(3, Math.ceil(velocity * trendBoost));
  return Math.max(0, Math.ceil(targetStock - item.stockQuantity));
}

export function buildInventoryIntelligence(
  items: InventoryComparableItem[],
): Map<string, InventoryIntelligence> {
  const profiles = items.map(makeProfile);
  const byBrand = new Map<string, ProductProfile[]>();
  const byComparable = new Map<string, ProductProfile[]>();

  for (const profile of profiles) {
    byBrand.set(profile.brandKey, [...(byBrand.get(profile.brandKey) ?? []), profile]);
    byComparable.set(profile.comparableKey, [...(byComparable.get(profile.comparableKey) ?? []), profile]);
  }

  const result = new Map<string, InventoryIntelligence>();

  for (const profile of profiles) {
    const brandProfiles = byBrand.get(profile.brandKey) ?? [];
    const sameFlavorOtherLines = brandProfiles
      .filter((candidate) => candidate.cloverId !== profile.cloverId && candidate.lineKey !== profile.lineKey)
      .map((candidate) => {
        const score = tokenOverlap(profile.flavorBaseTokens, candidate.flavorBaseTokens);
        return { candidate, score };
      })
      .filter(({ score }) => score >= 0.75)
      .sort((a, b) => b.score - a.score || b.candidate.item.stockQuantity - a.candidate.item.stockQuantity)
      .slice(0, 4)
      .map(({ candidate, score }) =>
        toRelatedItem(candidate, score, `${sharedTokenLabel(profile.flavorBaseTokens, candidate.flavorBaseTokens)} in another line`),
      );

    const similarProducts = brandProfiles
      .filter((candidate) => candidate.cloverId !== profile.cloverId && candidate.flavorKey !== profile.flavorKey)
      .map((candidate) => {
        const flavorScore = tokenOverlap(profile.flavorBaseTokens, candidate.flavorBaseTokens);
        const lineBonus = candidate.lineKey === profile.lineKey ? 0.15 : 0;
        return { candidate, score: flavorScore + lineBonus };
      })
      .filter(({ score }) => score >= 0.5)
      .sort((a, b) => b.score - a.score || b.candidate.item.unitsSold7d - a.candidate.item.unitsSold7d)
      .slice(0, 5)
      .map(({ candidate, score }) =>
        toRelatedItem(candidate, score, `${sharedTokenLabel(profile.flavorBaseTokens, candidate.flavorBaseTokens)} profile`),
      );

    const sameProductProfiles = byComparable.get(profile.comparableKey) ?? [];
    const prices = new Set(sameProductProfiles.map((candidate) => candidate.item.priceCents ?? -1));
    const priceVariants = prices.size > 1
      ? sameProductProfiles
          .filter((candidate) => candidate.cloverId !== profile.cloverId)
          .map((candidate) => ({
            cloverId: candidate.cloverId,
            name: candidate.item.name,
            stockQuantity: candidate.item.stockQuantity,
            priceCents: candidate.item.priceCents,
          }))
      : [];

    result.set(profile.cloverId, {
      status: getInventoryStatus(profile.item),
      salesTrend: getSalesTrend(profile.item.unitsSold7d, profile.item.unitsSoldPrev7d),
      suggestedOrderQty: getSuggestedOrderQty(profile.item),
      productLine: profile.lineLabel,
      flavorProfile: profile.flavorLabel,
      sameFlavorOtherLines,
      similarProducts,
      priceVariants,
    });
  }

  return result;
}
