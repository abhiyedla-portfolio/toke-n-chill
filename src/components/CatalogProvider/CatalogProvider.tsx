'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CatalogResponse, Product } from '@/types/catalog';
import {
  isCatalogCacheFresh,
  readCatalogCache,
  touchCatalogCache,
  writeCatalogCache,
} from '@/lib/catalog-browser-cache';
import { getFeaturedCatalogProducts } from '@/lib/catalog-utils';

type CatalogSource = 'empty' | 'cache' | 'network';
type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CatalogContextValue {
  featuredProducts: Product[];
  generatedAt?: string;
  products: Product[];
  refresh: () => Promise<void>;
  source: CatalogSource;
  status: CatalogStatus;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<CatalogStatus>('idle');
  const [source, setSource] = useState<CatalogSource>('empty');
  const [generatedAt, setGeneratedAt] = useState<string>();
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const cached = readCatalogCache();

    const request = (async () => {
      setStatus((current) => (current === 'ready' ? current : 'loading'));

      if (cached && cached.products.length > 0) {
        setProducts(cached.products);
        setGeneratedAt(cached.generatedAt);
        setSource('cache');
        setStatus('ready');
      }

      const headers: HeadersInit = {};

      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      if (cached && isCatalogCacheFresh(cached)) {
        return;
      }

      try {
        const response = await fetch('/api/catalog', {
          cache: 'default',
          headers,
        });

        if (response.status === 304 && cached) {
          touchCatalogCache(cached);
          setProducts(cached.products);
          setGeneratedAt(cached.generatedAt);
          setSource('cache');
          setStatus('ready');
          return;
        }

        if (!response.ok) {
          throw new Error(`Catalog request failed with ${response.status}`);
        }

        const data = (await response.json()) as CatalogResponse;
        const nextProducts = Array.isArray(data.products) ? data.products : [];
        const nextGeneratedAt = data.generatedAt ?? new Date().toISOString();

        writeCatalogCache({
          etag: response.headers.get('etag') ?? undefined,
          fetchedAt: Date.now(),
          generatedAt: nextGeneratedAt,
          products: nextProducts,
        });

        setProducts(nextProducts);
        setGeneratedAt(nextGeneratedAt);
        setSource('network');
        setStatus('ready');
      } catch (error) {
        if (cached && cached.products.length > 0) {
          setProducts(cached.products);
          setGeneratedAt(cached.generatedAt);
          setSource('cache');
          setStatus('ready');
          return;
        }

        console.warn('[CatalogProvider] Unable to load synced catalog.', error);
        setProducts([]);
        setGeneratedAt(undefined);
        setSource('empty');
        setStatus('error');
      }
    })();

    inFlightRef.current = request.finally(() => {
      inFlightRef.current = null;
    });

    return inFlightRef.current;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(() => ({
    featuredProducts: getFeaturedCatalogProducts(products),
    generatedAt,
    products,
    refresh,
    source,
    status,
  }), [generatedAt, products, refresh, source, status]);

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }

  return context;
}
