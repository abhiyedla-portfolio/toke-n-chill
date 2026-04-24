import 'server-only';

import type { Product } from '@/types/catalog';
import {
  getAllPublicProducts,
  getFeaturedPublicProducts,
  getPublicProductBySlug,
  getPublicProductsByCategory,
} from '@/lib/server/public-catalog';

export async function getAllProducts(): Promise<Product[]> {
  return getAllPublicProducts();
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return getPublicProductsByCategory(category);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return getPublicProductBySlug(slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return getFeaturedPublicProducts();
}
