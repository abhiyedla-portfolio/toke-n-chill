import { getFeaturedProducts } from '@/lib/products-service';
import HomePageClient from './HomePageClient';

export const revalidate = 300;

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();

  return <HomePageClient featuredProducts={featuredProducts} />;
}
