import 'server-only';

import { fetchAllCloverItems, fetchItemStocks } from './clover';
import { mapAllCloverItems } from './clover-mapper';
import {
  products as staticProducts,
  getProductsByCategory as staticGetByCategory,
  getProductBySlug as staticGetBySlug,
  getFeaturedProducts as staticGetFeatured,
  type Product,
} from '@/data/products';

/**
 * Fetch all products from Clover POS, falling back to static data.
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const [items, stocks] = await Promise.all([
      fetchAllCloverItems(),
      fetchItemStocks(),
    ]);

    if (items && items.length > 0) {
      return mapAllCloverItems(items, stocks);
    }
  } catch (err) {
    console.warn('[ProductsService] Clover fetch failed, using static fallback:', err);
  }

  return staticProducts;
}

/**
 * Get products filtered by category slug.
 */
export async function getProductsByCategory(category: string): Promise<Product[]> {
  const all = await getAllProducts();
  const filtered = all.filter((p) => p.category === category);

  // If Clover returned data but nothing matched this category, check static fallback
  if (filtered.length === 0) {
    return staticGetByCategory(category);
  }

  return filtered;
}

/**
 * Find a single product by its slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  const found = all.find((p) => p.slug === slug);

  if (!found) {
    return staticGetBySlug(slug);
  }

  return found;
}

/**
 * Get featured products for the home page.
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  const featured = all.filter((p) => p.featured);

  // If no products are tagged as featured, return first 4
  if (featured.length === 0) {
    const staticFeatured = staticGetFeatured();
    if (staticFeatured.length > 0) return staticFeatured;
    return all.slice(0, 4);
  }

  return featured.slice(0, 8);
}
