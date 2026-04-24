'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Store } from 'lucide-react';
import { StockBadge } from '@/components/StockBadge';
import type { Product } from '@/data/products';

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

interface QuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickView({ product, isOpen, onClose }: QuickViewProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!product) return null;

  const hasRealImage =
    product.image && product.image !== '/images/products/placeholder.jpg';
  const gradient =
    categoryGradients[product.category] || categoryGradients.accessories;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.80)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl"
              style={{
                backgroundColor: '#111111',
                border: '1px solid #222222',
              }}
              initial={{ y: 100, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 100, scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Gradient accent line */}
              <div
                className="h-[2px] w-full"
                style={{
                  background: 'linear-gradient(to right, #FF2D7B, #00E5FF)',
                }}
              />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-3 top-4 z-10 rounded-full p-2 transition-colors"
                style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                aria-label="Close quick view"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col sm:flex-row">
                {/* Image section */}
                <div
                  className="flex h-56 items-center justify-center sm:h-auto sm:w-1/2"
                  style={
                    hasRealImage
                      ? { backgroundColor: '#0A0A0A' }
                      : { background: gradient }
                  }
                >
                  {hasRealImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-6 text-center">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/30">
                        {product.brand}
                      </span>
                      <span className="text-lg font-semibold text-white/70">
                        {product.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details section */}
                <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
                    {product.brand}
                  </span>

                  <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                    {product.name}
                  </h2>

                  <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: '#FF2D7B' }}>
                    Live Inventory
                  </p>
                  <p className="text-sm" style={{ color: '#888' }}>
                    Pricing is available in store only.
                  </p>
                  <StockBadge inStock={product.inStock} stockQuantity={product.stockQuantity} size="md" />

                  {product.description && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-[#AAA]">
                      {product.description}
                    </p>
                  )}

                  {/* Variants */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((variant) => (
                        <span
                          key={variant}
                          className="rounded-full px-3 py-1 text-xs font-medium text-white/80"
                          style={{
                            backgroundColor: '#1A1A1A',
                            border: '1px solid #333',
                          }}
                        >
                          {variant}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* In Store Only badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: '#1A1A1A',
                        color: '#00E5FF',
                        border: '1px solid #222',
                      }}
                    >
                      <Store className="h-3 w-3" />
                      In Store Only
                    </span>
                    {product.newArrival && (
                      <span
                        className="inline-flex items-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: '#FF2D7B', color: '#000' }}
                      >
                        New
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <Link
                      href={`/products/${product.category}/${product.slug}`}
                      onClick={onClose}
                      className="inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,45,123,0.4)]"
                      style={{ backgroundColor: '#FF2D7B' }}
                    >
                      View Full Details
                    </Link>
                    <a
                      href="tel:+15551234567"
                      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-300"
                      style={{
                        backgroundColor: 'transparent',
                        color: '#00E5FF',
                        border: '1px solid #222',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#00E5FF';
                        e.currentTarget.style.backgroundColor =
                          'rgba(0, 229, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#222';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      Call to Reserve
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
