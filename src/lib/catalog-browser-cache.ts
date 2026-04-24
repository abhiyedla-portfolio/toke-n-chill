import type { Product } from '@/types/catalog';

const STORAGE_KEY = 'toke-n-chill.catalog.v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CatalogCacheRecord {
  fetchedAt: number;
  etag?: string;
  generatedAt?: string;
  products: Product[];
  version: 1;
}

export function readCatalogCache(): CatalogCacheRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CatalogCacheRecord;

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.products) ||
      typeof parsed.fetchedAt !== 'number'
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeCatalogCache(record: Omit<CatalogCacheRecord, 'version'>) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: CatalogCacheRecord = {
    ...record,
    version: 1,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function touchCatalogCache(record: CatalogCacheRecord) {
  writeCatalogCache({
    ...record,
    fetchedAt: Date.now(),
  });
}

export function isCatalogCacheFresh(record: CatalogCacheRecord) {
  return Date.now() - record.fetchedAt < CACHE_TTL_MS;
}
