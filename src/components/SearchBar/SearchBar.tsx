'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useCatalog } from '@/components/CatalogProvider';
import { StockBadge } from '@/components/StockBadge';

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} style={{ color: '#FF2D7B', fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { products, status } = useCatalog();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, query]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center justify-center rounded-md p-2 transition-colors"
        style={{ color: '#FFFFFF' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
        aria-label="Open search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Search overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.80)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="w-full max-w-3xl px-4 pt-24">
              {/* Search input row */}
              <motion.div
                className="relative flex items-center"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <Search
                  className="pointer-events-none absolute left-4 h-6 w-6"
                  style={{ color: '#666' }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg py-4 pl-14 pr-14 text-xl font-medium text-white placeholder-[#666] outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #222222',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF2D7B';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 2px rgba(255, 45, 123, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#222222';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handleClose}
                  className="absolute right-4 rounded-md p-1 transition-colors"
                  style={{ color: '#666' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                  aria-label="Close search"
                >
                  <X className="h-6 w-6" />
                </button>
              </motion.div>

              {/* Results */}
              {query.trim() && (
                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {results.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {results.map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.category}/${product.slug}`}
                          onClick={handleClose}
                          className="flex items-center gap-3 rounded-lg p-3 transition-colors"
                          style={{
                            backgroundColor: '#111111',
                            border: '1px solid #222222',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              'rgba(255, 45, 123, 0.4)';
                            e.currentTarget.style.backgroundColor = '#1A1A1A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#222222';
                            e.currentTarget.style.backgroundColor = '#111111';
                          }}
                        >
                          {/* Product image or gradient placeholder */}
                          <div
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded"
                            style={{
                              background:
                                product.image &&
                                product.image !== '/images/products/placeholder.jpg'
                                  ? `url(${product.image}) center/cover`
                                  : 'linear-gradient(135deg, #1a0a0a 0%, #4A1A2E 50%, #FF2D7B 150%)',
                            }}
                          >
                            {(!product.image ||
                              product.image ===
                                '/images/products/placeholder.jpg') && (
                              <span className="text-[8px] font-bold uppercase text-white/50">
                                {product.category.slice(0, 3)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">
                              {highlightMatch(product.name, query)}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#888]">
                                {highlightMatch(product.brand, query)}
                              </span>
                              <span className="text-xs text-[#444]">&middot;</span>
                              <span className="text-xs capitalize text-[#888]">
                                {highlightMatch(product.category, query)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#FF2D7B' }}>
                                Inventory Only
                              </span>
                              <StockBadge inStock={product.inStock} stockQuantity={product.stockQuantity} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
                      {status === 'loading' ? (
                        <>
                          <p className="text-lg font-medium text-[#666]">
                            Loading live inventory…
                          </p>
                          <p className="mt-1 text-sm text-[#444]">
                            Results will appear once the catalog finishes syncing.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium text-[#666]">
                            No results found for &ldquo;{query}&rdquo;
                          </p>
                          <p className="mt-1 text-sm text-[#444]">
                            Try a different search term or browse our categories
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
