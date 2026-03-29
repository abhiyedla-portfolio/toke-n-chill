import type { CloverItem } from './clover';
import type { Product } from '@/data/products';
import { mapCloverCategory } from '@/config/clover-category-map';
import { slugify, formatPriceRange } from './utils';

/**
 * Extract brand name from a Clover item.
 * Tries: tags first, then "Brand - Name" pattern, then defaults.
 */
function extractBrand(item: CloverItem): string {
  // Check tags for brand info
  if (item.tags?.elements?.length) {
    const brandTag = item.tags.elements.find(
      (t) => t.name.toLowerCase().startsWith('brand:'),
    );
    if (brandTag) return brandTag.name.replace(/^brand:\s*/i, '').trim();
  }

  // Check "Brand - Product Name" pattern
  if (item.name.includes(' - ')) {
    return item.name.split(' - ')[0].trim();
  }

  return 'House Brand';
}

/**
 * Get the site category slug for a Clover item from its categories.
 */
function extractCategory(item: CloverItem): string {
  if (item.categories?.elements?.length) {
    for (const cat of item.categories.elements) {
      const mapped = mapCloverCategory(cat.name);
      if (mapped) return mapped;
    }
  }
  return 'accessories'; // default catch-all
}

/**
 * Build a price range string from item price and modifier prices.
 */
function buildPriceRange(item: CloverItem): string {
  const basePrice = item.price || 0;
  let minPrice = basePrice;
  let maxPrice = basePrice;

  if (item.modifierGroups?.elements) {
    for (const group of item.modifierGroups.elements) {
      if (group.modifiers?.elements) {
        for (const mod of group.modifiers.elements) {
          if (mod.price !== undefined) {
            const total = basePrice + mod.price;
            minPrice = Math.min(minPrice, total);
            maxPrice = Math.max(maxPrice, total);
          }
        }
      }
    }
  }

  return formatPriceRange(minPrice, maxPrice);
}

/**
 * Extract variant names from modifier groups.
 */
function extractVariants(item: CloverItem): string[] | undefined {
  const variants: string[] = [];

  if (item.modifierGroups?.elements) {
    for (const group of item.modifierGroups.elements) {
      if (group.modifiers?.elements) {
        for (const mod of group.modifiers.elements) {
          variants.push(mod.name);
        }
      }
    }
  }

  return variants.length > 0 ? variants : undefined;
}

/**
 * Map a single Clover item to the site's Product interface.
 */
export function mapCloverItemToProduct(
  item: CloverItem,
  stockMap?: Map<string, number> | null,
): Product {
  const stockQty = stockMap?.get(item.id);
  const hasStockTracking = stockQty !== undefined;

  return {
    id: item.id,
    cloverId: item.id,
    slug: slugify(item.name),
    name: item.name.includes(' - ') ? item.name.split(' - ').slice(1).join(' - ').trim() : item.name,
    brand: extractBrand(item),
    category: extractCategory(item),
    description: item.description || '',
    price: item.price,
    priceRange: buildPriceRange(item),
    image: '/images/products/placeholder.jpg', // Clover doesn't serve images via REST API
    variants: extractVariants(item),
    inStock: hasStockTracking ? (stockQty ?? 0) > 0 : undefined,
    stockQuantity: hasStockTracking ? stockQty : undefined,
    featured: false, // Can be overridden by tags
    newArrival: false,
  };
}

/**
 * Map all Clover items to Products, filtering out unavailable ones.
 */
export function mapAllCloverItems(
  items: CloverItem[],
  stockMap?: Map<string, number> | null,
): Product[] {
  return items
    .filter((item) => !item.hidden && item.price != null && item.price > 0)
    .map((item) => {
      const product = mapCloverItemToProduct(item, stockMap);

      // Mark items with "featured" tag
      if (item.tags?.elements?.some((t) => t.name.toLowerCase() === 'featured')) {
        product.featured = true;
      }

      // Mark items with "new" tag
      if (item.tags?.elements?.some((t) => t.name.toLowerCase() === 'new' || t.name.toLowerCase() === 'new arrival')) {
        product.newArrival = true;
      }

      return product;
    });
}
