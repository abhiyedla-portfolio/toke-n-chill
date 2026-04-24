'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '@/data/products';
import ProductCard from '@/components/ProductCard';

interface ProductGridProps {
  products: Product[];
  showFilters?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export default function ProductGrid({ products, showFilters = false }: ProductGridProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

  // Reset brand filter whenever the category-filtered product list changes
  useEffect(() => {
    setSelectedBrand('all');
  }, [products]);

  const brands = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.brand)));
    return unique.sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (selectedBrand === 'all') return products;
    return products.filter((p) => p.brand === selectedBrand);
  }, [products, selectedBrand]);

  return (
    <div>
      {showFilters && brands.length > 1 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#555' }}>
            Brand
          </span>
          <button
            onClick={() => setSelectedBrand('all')}
            className="rounded px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: selectedBrand === 'all' ? '#fff' : 'transparent',
              color: selectedBrand === 'all' ? '#000' : '#888',
              border: `1px solid ${selectedBrand === 'all' ? '#fff' : '#333'}`,
            }}
          >
            All
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className="rounded px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                backgroundColor: selectedBrand === brand ? '#fff' : 'transparent',
                color: selectedBrand === brand ? '#000' : '#888',
                border: `1px solid ${selectedBrand === brand ? '#fff' : '#333'}`,
              }}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={selectedBrand}
      >
        {filtered.map((product) => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductCard product={product} />
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <p
          className="py-12 text-center text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No products found.
        </p>
      )}
    </div>
  );
}
