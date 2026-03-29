'use client';

import { motion } from 'framer-motion';
import HeroBanner from '@/components/HeroBanner/HeroBanner';
import TrustBar from '@/components/TrustBar/TrustBar';
import StoreCard from '@/components/StoreCard/StoreCard';
import { DealCard } from '@/components/DealCard';
import { deals } from '@/data/deals';
import type { Product } from '@/data/products';
import ProductCard from '@/components/ProductCard/ProductCard';
import { NowHiring } from '@/components/NowHiring';
import { GoogleReviews } from '@/components/GoogleReviews';
import { useBrand } from '@/components/BrandProvider';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface HomePageClientProps {
  featuredProducts: Product[];
}

export default function HomePageClient({ featuredProducts }: HomePageClientProps) {
  const brand = useBrand();
  const featuredDeals = deals.slice(0, 2);

  return (
    <>
      <HeroBanner />

      {/* Featured Products */}
      <section className="py-20" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex items-end justify-between"
          >
            <div>
              <h2 className="font-display text-4xl font-bold text-white sm:text-5xl uppercase tracking-wide">
                Featured Products
              </h2>
              <p className="mt-3" style={{ color: '#888' }}>
                Our staff picks and bestsellers
              </p>
            </div>
            <Link
              href="/products"
              className="hidden items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors sm:flex"
              style={{ color: '#FF2D7B' }}
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 font-bold uppercase tracking-wider"
              style={{ color: '#FF2D7B' }}
            >
              View All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <h2 className="font-display text-4xl font-bold text-white sm:text-5xl uppercase tracking-wide">
              This Week&apos;s Deals
            </h2>
            <p className="mt-3" style={{ color: '#888' }}>
              In-store specials you won&apos;t want to miss
            </p>
          </div>
          <Link
            href="/deals"
            className="hidden items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors sm:flex"
            style={{ color: '#FF2D7B' }}
          >
            All Deals <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {featuredDeals.map((deal, i) => (
            <DealCard key={deal.id} deal={deal} index={i} />
          ))}
        </div>
      </section>

      <TrustBar />

      {/* Google Reviews */}
      <GoogleReviews />

      {/* Now Hiring */}
      <NowHiring />

      {/* Store Info */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl uppercase tracking-wide">
            Visit Us Today
          </h2>
          <p className="mt-3" style={{ color: '#888' }}>
            {brand.storeLocation} &mdash; Open 7 days a week
          </p>
        </motion.div>
        <StoreCard />
      </section>
    </>
  );
}
