import type { Product } from '@/types/catalog';

interface ProductLike extends Product {
  price?: number;
  priceRange?: string;
}

export function sanitizeProduct(product: ProductLike): Product {
  return {
    brand: product.brand,
    category: product.category,
    cloverId: product.cloverId,
    description: product.description,
    featured: product.featured,
    id: product.id,
    image: product.image,
    inStock: product.inStock,
    inventoryUpdatedAt: product.inventoryUpdatedAt,
    name: product.name,
    newArrival: product.newArrival,
    slug: product.slug,
    stockQuantity: product.stockQuantity,
    variants: product.variants,
  };
}

export function sanitizeProducts(products: ProductLike[]): Product[] {
  return products.map(sanitizeProduct);
}

export function getFeaturedCatalogProducts(products: Product[]): Product[] {
  const featured = products.filter((product) => product.featured);

  if (featured.length > 0) {
    return featured.slice(0, 8);
  }

  const seenCategories = new Set<string>();

  return products
    .filter((product) => {
      if (seenCategories.has(product.category)) {
        return false;
      }

      seenCategories.add(product.category);
      return true;
    })
    .slice(0, 8);
}

export function getRelatedCatalogProducts(
  products: Product[],
  product: Product,
  limit = 3,
): Product[] {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
    .slice(0, limit);
}
