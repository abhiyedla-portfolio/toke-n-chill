import { getAllProducts } from '@/lib/products-service';
import ProductsPageClient from './ProductsPageClient';

export const revalidate = 300;

export default async function ProductsPage() {
  const products = await getAllProducts();

  return <ProductsPageClient products={products} />;
}
