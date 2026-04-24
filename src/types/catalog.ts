export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  variants?: string[];
  featured?: boolean;
  newArrival?: boolean;
  cloverId?: string;
  inStock?: boolean;
  stockQuantity?: number;
  inventoryUpdatedAt?: string;
}

export interface CatalogResponse {
  products: Product[];
  generatedAt: string;
  source: 'clover' | 'clover+d1' | 'd1' | 'static';
}
