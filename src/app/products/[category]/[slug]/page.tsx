import { notFound } from 'next/navigation';
import { categories } from '@/config/categories';
import { getProductBySlug, getProductsByCategory } from '@/lib/products-service';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 300;
export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ category: string; slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { category, slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.category !== category) {
    notFound();
  }

  const categoryInfo = categories.find((c) => c.slug === category);
  const allInCategory = await getProductsByCategory(category);
  const related = allInCategory
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <ProductDetailClient
      product={product}
      categoryName={categoryInfo?.name ?? category}
      relatedProducts={related}
    />
  );
}
