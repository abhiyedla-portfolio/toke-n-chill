import 'server-only';

import { getFeaturedCatalogProducts } from '@/lib/catalog-utils';
import { slugify } from '@/lib/utils';
import type { CatalogResponse, Product } from '@/types/catalog';
import {
  getCatalogDb,
  type ProductCatalogRow,
} from './catalog-db';

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

function toProduct(row: ProductCatalogRow): Product | null {
  if (!row.clover_id) {
    return null;
  }

  const name = row.name?.trim();
  const category = row.category?.trim();

  if (!name || !category) {
    return null;
  }

  return {
    brand: row.brand ?? 'House Brand',
    category,
    cloverId: row.clover_id,
    description: row.description ?? '',
    featured: parseFlag(row.featured),
    id: row.clover_id,
    image: row.image ?? '/images/products/placeholder.jpg',
    inStock: row.in_stock == null ? undefined : parseFlag(row.in_stock),
    inventoryUpdatedAt:
      row.synced_at ??
      (row.clover_updated_at ? new Date(row.clover_updated_at).toISOString() : undefined),
    name,
    newArrival: parseFlag(row.new_arrival),
    slug: row.slug ?? slugify(name),
    stockQuantity: row.stock_quantity ?? undefined,
    variants: parseVariants(row.variants_json),
  };
}

async function loadCatalogRows(): Promise<ProductCatalogRow[]> {
  const db = await getCatalogDb();

  if (!db) {
    return [];
  }

  const response = await db.prepare(`
    SELECT
      slug,
      clover_id,
      name,
      brand,
      category,
      description,
      image,
      variants_json,
      featured,
      new_arrival,
      sort_order,
      is_active,
      hide_from_catalog,
      in_stock,
      stock_quantity,
      is_visible,
      clover_updated_at,
      synced_at
    FROM product_metadata
    WHERE clover_id IS NOT NULL
      AND is_active != 0
      AND hide_from_catalog = 0
      AND is_visible = 1
    ORDER BY sort_order ASC, featured DESC, name ASC
  `).all<ProductCatalogRow>();

  return response.results ?? [];
}

function getGeneratedAt(rows: ProductCatalogRow[]) {
  return rows
    .map((row) => row.synced_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? new Date().toISOString();
}

export async function getPublicCatalog(): Promise<CatalogResponse> {
  const rows = await loadCatalogRows();
  const products = rows
    .map(toProduct)
    .filter((product): product is Product => product !== null);

  return {
    generatedAt: getGeneratedAt(rows),
    products,
    source: products.length > 0 ? 'd1-sync' : 'empty',
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
