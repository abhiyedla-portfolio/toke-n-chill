import { MetadataRoute } from 'next';
import { categories } from '@/config/categories';
import { getAllProducts } from '@/lib/products-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tokeandchill.com';

  const staticPages = [
    '',
    '/products',
    '/stores',
    '/deals',
    '/about',
    '/contact',
    '/legal/privacy-policy',
    '/legal/terms',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }));

  const categoryPages = categories.map((cat) => ({
    url: `${baseUrl}/products/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const products = await getAllProducts();
  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.category}/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
