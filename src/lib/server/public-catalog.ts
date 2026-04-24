import 'server-only';

import { mapCloverCategory } from '@/config/clover-category-map';
import { products as staticProducts } from '@/data/products';
import { fetchAllCloverItems, fetchItemStocks, type CloverItem } from '@/lib/clover';
import { getFeaturedCatalogProducts } from '@/lib/catalog-utils';
import { slugify } from '@/lib/utils';
import type { CatalogResponse, Product } from '@/types/catalog';

type D1DatabaseLike = {
  prepare: (query: string) => {
    all: <T = unknown>() => Promise<{ results?: T[] }>;
  };
};

interface ProductMetadataRow {
  brand: string | null;
  category: string | null;
  clover_id: string | null;
  description: string | null;
  featured: number | null;
  hide_from_catalog: number | null;
  image: string | null;
  is_active: number | null;
  name: string | null;
  new_arrival: number | null;
  slug: string | null;
  sort_order: number | null;
  variants_json: string | null;
}

function parseFlag(value: number | null | undefined) {
  return value === 1;
}

function parseVariants(variantsJson: string | null | undefined): string[] | undefined {
  if (!variantsJson) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(variantsJson) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : undefined;
  } catch {
    return undefined;
  }
}

function extractBrand(item: CloverItem): string {
  const tagBrand = item.tags?.elements?.find((tag) =>
    tag.name.toLowerCase().startsWith('brand:'),
  );

  if (tagBrand) {
    return tagBrand.name.replace(/^brand:\s*/i, '').trim();
  }

  if (item.name.includes(' - ')) {
    return item.name.split(' - ')[0].trim();
  }

  return 'House Brand';
}

function normalizeName(item: CloverItem): string {
  if (!item.name.includes(' - ')) {
    return item.name;
  }

  return item.name.split(' - ').slice(1).join(' - ').trim();
}

function extractVariants(item: CloverItem): string[] | undefined {
  const variants: string[] = [];

  for (const group of item.modifierGroups?.elements ?? []) {
    for (const modifier of group.modifiers?.elements ?? []) {
      variants.push(modifier.name);
    }
  }

  return variants.length > 0 ? variants : undefined;
}

function extractCategory(item: CloverItem): string {
  for (const category of item.categories?.elements ?? []) {
    const mapped = mapCloverCategory(category.name);

    if (mapped) {
      return mapped;
    }
  }

  return 'accessories';
}

function buildD1OnlyProduct(
  row: ProductMetadataRow,
  inventoryUpdatedAt: string,
): Product | null {
  if (!row.slug || !row.name || !row.category) {
    return null;
  }

  return {
    brand: row.brand ?? 'House Brand',
    category: row.category,
    cloverId: row.clover_id ?? undefined,
    description: row.description ?? '',
    featured: parseFlag(row.featured),
    id: row.clover_id ?? row.slug,
    image: row.image ?? '/images/products/placeholder.jpg',
    inventoryUpdatedAt,
    name: row.name,
    newArrival: parseFlag(row.new_arrival),
    slug: row.slug,
    variants: parseVariants(row.variants_json),
  };
}

function mergeProduct(
  item: CloverItem,
  stockMap: Map<string, number>,
  metadata: ProductMetadataRow | undefined,
  inventoryUpdatedAt: string,
): Product {
  const stockQuantity = stockMap.get(item.id) ?? item.itemStock?.quantity;

  return {
    brand: metadata?.brand ?? extractBrand(item),
    category: metadata?.category ?? extractCategory(item),
    cloverId: item.id,
    description: metadata?.description ?? item.description ?? '',
    featured:
      metadata?.featured != null
        ? parseFlag(metadata.featured)
        : item.tags?.elements?.some((tag) => tag.name.toLowerCase() === 'featured') ?? false,
    id: item.id,
    image: metadata?.image ?? '/images/products/placeholder.jpg',
    inStock: stockQuantity != null ? stockQuantity > 0 : undefined,
    inventoryUpdatedAt,
    name: metadata?.name ?? normalizeName(item),
    newArrival:
      metadata?.new_arrival != null
        ? parseFlag(metadata.new_arrival)
        : item.tags?.elements?.some((tag) => {
          const normalized = tag.name.toLowerCase();
          return normalized === 'new' || normalized === 'new arrival';
        }) ?? false,
    slug: metadata?.slug ?? slugify(item.name),
    stockQuantity,
    variants: parseVariants(metadata?.variants_json) ?? extractVariants(item),
  };
}

async function getCatalogDb(): Promise<D1DatabaseLike | undefined> {
  const globalScope = globalThis as Record<PropertyKey, unknown>;
  const context = globalScope[Symbol.for('__cloudflare-context__')] as
    | { env?: { CATALOG_DB?: D1DatabaseLike } }
    | undefined;

  return context?.env?.CATALOG_DB;
}

async function loadMetadata(): Promise<ProductMetadataRow[]> {
  const db = await getCatalogDb();

  if (!db) {
    return [];
  }

  const response = await db.prepare(`
    SELECT
      clover_id,
      slug,
      name,
      brand,
      category,
      description,
      image,
      featured,
      new_arrival,
      sort_order,
      is_active,
      hide_from_catalog,
      variants_json
    FROM product_metadata
  `).all<ProductMetadataRow>();

  return response.results ?? [];
}

function sortProducts(products: Product[], metadataRows: ProductMetadataRow[]) {
  const sortOrderById = new Map<string, number>();

  for (const row of metadataRows) {
    const key = row.clover_id ?? row.slug ?? undefined;

    if (key) {
      sortOrderById.set(key, row.sort_order ?? 0);
    }
  }

  return [...products].sort((left, right) => {
    const leftSort = sortOrderById.get(left.cloverId ?? left.slug) ?? 0;
    const rightSort = sortOrderById.get(right.cloverId ?? right.slug) ?? 0;

    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function getPublicCatalog(): Promise<CatalogResponse> {
  const metadataRows = await loadMetadata();
  const activeMetadataRows = metadataRows.filter(
    (row) => !parseFlag(row.hide_from_catalog) && row.is_active !== 0,
  );
  const metadataByCloverId = new Map(
    activeMetadataRows
      .filter((row) => row.clover_id)
      .map((row) => [row.clover_id as string, row]),
  );
  const metadataBySlug = new Map(
    activeMetadataRows
      .filter((row) => row.slug)
      .map((row) => [row.slug as string, row]),
  );
  const inventoryUpdatedAt = new Date().toISOString();

  try {
    const [items, stockMap] = await Promise.all([
      fetchAllCloverItems(),
      fetchItemStocks(),
    ]);

    if (items && items.length > 0) {
      const liveProducts = items
        .filter((item) => !item.hidden && item.available !== false)
        .filter((item) => {
          const metadata =
            metadataByCloverId.get(item.id) ??
            metadataBySlug.get(slugify(item.name));

          return !metadata || !parseFlag(metadata.hide_from_catalog);
        })
        .map((item) => {
          const metadata =
            metadataByCloverId.get(item.id) ??
            metadataBySlug.get(slugify(item.name));

          return mergeProduct(item, stockMap ?? new Map(), metadata, inventoryUpdatedAt);
        });

      return {
        generatedAt: inventoryUpdatedAt,
        products: sortProducts(liveProducts, activeMetadataRows),
        source: activeMetadataRows.length > 0 ? 'clover+d1' : 'clover',
      };
    }
  } catch (error) {
    console.warn('[PublicCatalog] Clover sync failed, falling back.', error);
  }

  if (activeMetadataRows.length > 0) {
    const fallbackProducts = activeMetadataRows
      .map((row) => buildD1OnlyProduct(row, inventoryUpdatedAt))
      .filter((product): product is Product => product !== null);

    return {
      generatedAt: inventoryUpdatedAt,
      products: sortProducts(fallbackProducts, activeMetadataRows),
      source: 'd1',
    };
  }

  return {
    generatedAt: inventoryUpdatedAt,
    products: staticProducts,
    source: 'static',
  };
}

export async function getAllPublicProducts(): Promise<Product[]> {
  const catalog = await getPublicCatalog();
  return catalog.products;
}

export async function getPublicProductsByCategory(category: string): Promise<Product[]> {
  const products = await getAllPublicProducts();
  return products.filter((product) => product.category === category);
}

export async function getPublicProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getAllPublicProducts();
  return products.find((product) => product.slug === slug);
}

export async function getFeaturedPublicProducts(): Promise<Product[]> {
  const products = await getAllPublicProducts();
  return getFeaturedCatalogProducts(products);
}
