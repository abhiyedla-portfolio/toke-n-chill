'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';
import { products } from '@/data/products';

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 top-0 z-50 mx-auto max-w-3xl px-4 pt-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: '#888' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands..."
            className="w-full rounded-lg border py-4 pl-12 pr-12 text-lg text-white outline-none placeholder:text-[#555]"
            style={{ backgroundColor: '#111', borderColor: '#333' }}
          />
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: '#888' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2" style={{ backgroundColor: '#111', borderColor: '#222' }}>
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.category}/${product.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-[#1A1A1A]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#888' }}>
                    {product.brand}
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#FF2D7B' }}>
                    {product.priceRange}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="mt-3 rounded-lg border p-6 text-center" style={{ backgroundColor: '#111', borderColor: '#222' }}>
            <p style={{ color: '#888' }}>No products found for &quot;{query}&quot;</p>
          </div>
        )}
      </motion.div>
    </>
  );
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/deals', label: 'Deals' },
  { href: '/stores', label: 'Stores' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const brand = useBrand();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        backgroundColor: 'transparent',
        borderBottom: 'none',
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand text */}
        <Link
          href="/"
          className="text-xl font-bold uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#FFFFFF',
          }}
        >
          TOKE &amp; CHILL
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors"
                style={{
                  color: isActive(link.href) ? '#FF2D7B' : '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(link.href)) {
                    e.currentTarget.style.color = '#FF2D7B';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(link.href)) {
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
              >
                {link.label}
                {isActive(link.href) && (
                  <span
                    className="absolute bottom-0 left-3 right-3 rounded-full"
                    style={{
                      height: '2px',
                      backgroundColor: '#FF2D7B',
                    }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Search + Mobile toggle */}
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md p-2 transition-colors"
            style={{ color: '#FFFFFF' }}
            onClick={() => setSearchOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            aria-label="Search products"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 transition-colors md:hidden"
            style={{ color: '#FFFFFF' }}
            onClick={() => setMobileOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Search Overlay */}
        <AnimatePresence>
          {searchOpen && (
            <SearchOverlay onClose={() => setSearchOpen(false)} />
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col shadow-xl"
              style={{
                backgroundColor: '#111111',
                borderLeft: '1px solid #222222',
                color: '#FFFFFF',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Gradient line at top */}
              <div
                className="h-[2px] w-full"
                style={{
                  background: 'linear-gradient(to right, #FF2D7B, #00E5FF)',
                }}
              />

              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #222222' }}
              >
                <span
                  className="text-lg font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#FF2D7B',
                  }}
                >
                  {brand.name}
                </span>
                <button
                  className="rounded-md p-2 transition-colors"
                  style={{ color: '#FFFFFF' }}
                  onClick={() => setMobileOpen(false)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FF2D7B')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer links */}
              <ul className="flex flex-col gap-1 px-4 py-4">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-3 py-2.5 text-base font-medium transition-colors"
                      style={{
                        color: isActive(link.href) ? '#000000' : '#FFFFFF',
                        backgroundColor: isActive(link.href)
                          ? '#FF2D7B'
                          : 'transparent',
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
