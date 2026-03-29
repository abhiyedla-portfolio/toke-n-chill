'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Phone, MapPin } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';
import NicotineWarning from '@/components/NicotineWarning';
import ProductCard from '@/components/ProductCard';
import { StockBadge } from '@/components/StockBadge';
import type { Product } from '@/data/products';

interface ProductDetailClientProps {
  product: Product;
  categoryName: string;
  relatedProducts: Product[];
}

export default function ProductDetailClient({
  product,
  categoryName,
  relatedProducts,
}: ProductDetailClientProps) {
  const brand = useBrand();

  const hasRealImage =
    product.image && product.image !== '/images/products/placeholder.jpg';

  const ctaText =
    product.inStock === false
      ? 'Call to Check Availability'
      : product.inStock === true
        ? 'In Stock — Visit Us Today!'
        : 'Available In Store Only';

  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" style={{ color: '#888' }}>
        <Link href="/" className="hover:underline" style={{ color: '#FF2D7B' }}>Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:underline" style={{ color: '#FF2D7B' }}>Products</Link>
        <span className="mx-2">/</span>
        <Link href={`/products/${product.category}`} className="hover:underline" style={{ color: '#FF2D7B' }}>
          {categoryName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{product.name}</span>
      </nav>

      <div className="mb-8">
        <NicotineWarning />
      </div>

      {/* Product layout */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div
          className="flex aspect-square items-center justify-center overflow-hidden rounded-lg"
          style={{ backgroundColor: '#111' }}
        >
          {hasRealImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-24 w-24" style={{ color: '#333' }} />
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#888' }}>
            {product.brand}
          </span>

          <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-white lg:text-5xl">
            {product.name}
          </h1>

          <p className="text-2xl font-bold" style={{ color: '#FF2D7B' }}>
            {product.priceRange}
          </p>

          <StockBadge inStock={product.inStock} stockQuantity={product.stockQuantity} size="md" />

          {product.description && (
            <p className="text-base leading-relaxed" style={{ color: '#888' }}>
              {product.description}
            </p>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#888' }}>
                Available Variants
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <span
                    key={variant}
                    className="rounded border px-3 py-1 text-sm font-medium text-white transition-colors hover:border-[#FF2D7B]"
                    style={{ borderColor: '#333', backgroundColor: '#111' }}
                  >
                    {variant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* In Store CTA */}
          <div
            className="mt-4 rounded-lg border p-6"
            style={{ borderColor: '#222', backgroundColor: '#111' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: '#FF2D7B' }} />
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                {ctaText}
              </h3>
            </div>
            <p className="mb-4 text-sm" style={{ color: '#888' }}>
              {product.inStock === false
                ? 'This item may be temporarily out of stock. Call to confirm before visiting.'
                : 'Call ahead to check availability and reserve your product.'}
            </p>
            <a
              href={`tel:${brand.store.phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex items-center gap-2 rounded px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_16px_rgba(255,45,123,0.4)]"
              style={{ backgroundColor: '#FF2D7B' }}
            >
              <Phone className="h-4 w-4" />
              {brand.store.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
            More in {categoryName}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </motion.main>
  );
}
