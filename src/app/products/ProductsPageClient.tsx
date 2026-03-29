'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { categories } from '@/config/categories';
import type { Product } from '@/data/products';
import ProductGrid from '@/components/ProductGrid';

interface ProductsPageClientProps {
  products: Product[];
}

export default function ProductsPageClient({ products }: ProductsPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [activeCategory, products]);

  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <nav className="mb-6 text-sm" style={{ color: '#888' }}>
        <Link href="/" className="hover:underline" style={{ color: '#FF2D7B' }}>
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>Products</span>
      </nav>

      <h1 className="mb-8 font-display text-5xl font-bold uppercase tracking-wide text-white">
        Our Products
      </h1>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className="rounded px-4 py-1.5 text-sm font-bold uppercase tracking-wider transition-all"
          style={{
            backgroundColor: activeCategory === 'all' ? '#FF2D7B' : '#111',
            color: activeCategory === 'all' ? '#000' : '#fff',
            border: `1px solid ${activeCategory === 'all' ? '#FF2D7B' : '#222'}`,
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className="rounded px-4 py-1.5 text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: activeCategory === cat.slug ? '#FF2D7B' : '#111',
              color: activeCategory === cat.slug ? '#000' : '#fff',
              border: `1px solid ${activeCategory === cat.slug ? '#FF2D7B' : '#222'}`,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <ProductGrid products={filtered} showFilters />
    </motion.main>
  );
}
