'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/data/products';
import { StockBadge } from '@/components/StockBadge';

const categoryGradients: Record<string, string> = {
  disposables: 'linear-gradient(135deg, #1a0a0a 0%, #4A1A2E 50%, #FF2D7B 150%)',
  eliquids: 'linear-gradient(135deg, #0a0a1a 0%, #1A2A4A 50%, #00E5FF 150%)',
  devices: 'linear-gradient(135deg, #0a0a0a 0%, #2A2A2A 50%, #555 150%)',
  thca: 'linear-gradient(135deg, #0a051a 0%, #2A1A4A 50%, #A855F7 150%)',
  'thca-flower': 'linear-gradient(135deg, #0a0a05 0%, #1A2A1A 50%, #22C55E 150%)',
  gummies: 'linear-gradient(135deg, #1a0510 0%, #4A1A3A 50%, #FF2D7B 150%)',
  cbd: 'linear-gradient(135deg, #050a0a 0%, #1A3A2A 50%, #00E5FF 150%)',
  kratom: 'linear-gradient(135deg, #0a0a05 0%, #2A2A1A 50%, #EAB308 150%)',
  hookah: 'linear-gradient(135deg, #0a051a 0%, #2A1A4A 50%, #A855F7 150%)',
  tobacco: 'linear-gradient(135deg, #0a0805 0%, #2A1A0A 50%, #D97706 150%)',
  prerolls: 'linear-gradient(135deg, #0a0a05 0%, #1A1A0A 50%, #84CC16 150%)',
  glass: 'linear-gradient(135deg, #0a0a1a 0%, #1A2A3A 50%, #00E5FF 150%)',
  accessories: 'linear-gradient(135deg, #0a0a0a 0%, #1A1A1A 50%, #666 150%)',
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasRealImage =
    product.image && product.image !== '/images/products/placeholder.jpg';

  const gradient =
    categoryGradients[product.category] || categoryGradients.accessories;

  return (
    <motion.div
      className="group flex flex-col overflow-hidden rounded-lg border transition-all duration-300 hover:border-[rgba(255,45,123,0.4)] hover:shadow-[0_0_20px_rgba(255,45,123,0.15)]"
      style={{
        backgroundColor: '#111111',
        borderColor: '#222222',
      }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Image / Gradient */}
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={hasRealImage ? { backgroundColor: '#0A0A0A' } : { background: gradient }}
      >
        {hasRealImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              {product.brand}
            </span>
            <span className="line-clamp-2 text-sm font-semibold text-white/70">
              {product.name}
            </span>
          </div>
        )}
        {product.inStock === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80 border border-white/20">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
          {product.brand}
        </span>

        <h3 className="line-clamp-2 font-display text-base font-bold uppercase tracking-wide text-white">
          {product.name}
        </h3>

        <p className="text-sm font-bold" style={{ color: '#FF2D7B' }}>
          {product.priceRange}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: '#1A1A1A', color: '#00E5FF', border: '1px solid #222' }}>
            In Store Only
          </span>
          {product.newArrival && (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: '#FF2D7B', color: '#000' }}>
              New
            </span>
          )}
          <StockBadge inStock={product.inStock} stockQuantity={product.stockQuantity} />
        </div>

        <Link
          href={`/products/${product.category}/${product.slug}`}
          className="mt-auto inline-flex items-center justify-center rounded px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-all duration-300 hover:shadow-[0_0_16px_rgba(255,45,123,0.4)]"
          style={{ backgroundColor: '#FF2D7B' }}
        >
          View Details
        </Link>
      </div>
    </motion.div>
  );
}
