import { notFound } from 'next/navigation';
import { categories } from '@/config/categories';
import { getProductsByCategory } from '@/lib/products-service';
import CategoryPageClient from './CategoryPageClient';

export const revalidate = 300;
export const dynamicParams = true;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return categories.map((cat) => ({ category: cat.slug }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryInfo = categories.find((c) => c.slug === category);

  if (!categoryInfo) {
    notFound();
  }

  const products = await getProductsByCategory(category);

  return (
    <CategoryPageClient
      categoryName={categoryInfo.name}
      categoryDescription={categoryInfo.description}
      categorySlug={category}
      products={products}
    />
  );
}
