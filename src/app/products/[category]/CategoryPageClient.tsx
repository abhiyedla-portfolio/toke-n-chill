'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/data/products';
import ProductGrid from '@/components/ProductGrid';

interface CategoryPageClientProps {
  categoryName: string;
  categoryDescription: string;
  products: Product[];
}

export default function CategoryPageClient({
  categoryName,
  categoryDescription,
  products,
}: CategoryPageClientProps) {
  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <nav className="mb-6 text-sm" style={{ color: '#888' }}>
        <Link href="/" className="hover:underline" style={{ color: '#FF2D7B' }}>Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:underline" style={{ color: '#FF2D7B' }}>Products</Link>
        <span className="mx-2">/</span>
        <span className="text-white">{categoryName}</span>
      </nav>

      <h1 className="mb-2 font-display text-5xl font-bold uppercase tracking-wide text-white">
        {categoryName}
      </h1>
      <p className="mb-8 text-base" style={{ color: '#888' }}>
        {categoryDescription}
      </p>

      <ProductGrid products={products} showFilters />
    </motion.main>
  );
}
