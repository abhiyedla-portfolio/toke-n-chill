'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { categories } from '@/config/categories';
import { useCatalog } from '@/components/CatalogProvider';
import type { Product } from '@/data/products';
import ProductGrid from '@/components/ProductGrid';

const VAPE_SLUGS = new Set(['disposables', 'eliquids', 'devices', 'thca']);

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'vapes', label: 'Vapes' },
  ...categories.map((c) => ({ key: c.slug, label: c.name })),
];

interface ProductsPageClientProps {
  products: Product[];
}

export default function ProductsPageClient({ products }: ProductsPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>('vapes');
  const { products: liveProducts } = useCatalog();
  const allProducts = liveProducts.length > 0 ? liveProducts : products;

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return allProducts;
    if (activeCategory === 'vapes') return allProducts.filter((p) => VAPE_SLUGS.has(p.category));
    return allProducts.filter((p) => p.category === activeCategory);
  }, [activeCategory, allProducts]);

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
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className="rounded px-4 py-1.5 text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: activeCategory === tab.key ? '#FF2D7B' : '#111',
              color: activeCategory === tab.key ? '#000' : '#fff',
              border: `1px solid ${activeCategory === tab.key ? '#FF2D7B' : '#222'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ProductGrid products={filtered} showFilters />
    </motion.main>
  );
}
