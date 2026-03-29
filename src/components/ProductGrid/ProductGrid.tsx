'use client';

import { useState, useMemo } from 'react';
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
        <div className="mb-6">
          <label
            htmlFor="brand-filter"
            className="mr-2 text-sm font-medium"
            style={{ color: '#888' }}
          >
            Filter by brand:
          </label>
          <select
            id="brand-filter"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
            style={{
              borderColor: '#222',
              backgroundColor: '#111',
              color: '#fff',
            }}
          >
            <option value="all">All Brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
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
