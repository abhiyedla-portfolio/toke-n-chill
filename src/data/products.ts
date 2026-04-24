import type { Product } from '@/types/catalog';
import { sanitizeProduct } from '@/lib/catalog-utils';

// Import real inventory from Modisoft export
import { inventoryProducts } from './inventory';

export type { Product } from '@/types/catalog';

// Mark some products as featured for the home page
const featuredSlugs = new Set([
  // Products with real images
  'hometown-hero-live-resin-5g-amnesia-haze',
  'hometown-hero-live-resin-5g-white-rhino',
  'hh-lr-super-silver-haze',
  'hh-lr-blue-dream',
  'hh-lr-grand-daddy-purple',
  'd9-lr-canna-classic-gummies-prickly-pear-25mg-10ct',
  'home-town-hero-live-resin-5g-pink-panther',
  'hometown-hero-live-resin-5g-g13',
]);

export const products: Product[] = inventoryProducts.map((product) => sanitizeProduct({
  ...product,
  featured: featuredSlugs.has(product.slug),
}));

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  const featured = products.filter((p) => p.featured);
  if (featured.length > 0) return featured.slice(0, 8);
  // Fallback: pick one from each major category
  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.category)) return false;
    seen.add(p.category);
    return true;
  }).slice(0, 8);
}
