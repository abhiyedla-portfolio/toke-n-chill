'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/data/products';
import ProductCard from '@/components/ProductCard/ProductCard';

interface ProductCarouselProps {
  products: Product[];
  title?: string;
}

export default function ProductCarousel({ products, title }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [dragConstraint, setDragConstraint] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    const updateConstraint = () => {
      setDragConstraint(-(el.scrollWidth - el.clientWidth));
    };
    updateConstraint();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', () => {
      checkScroll();
      updateConstraint();
    });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', updateConstraint);
    };
  }, [products, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative w-full">
      {title && (
        <h2
          className="mb-6 font-display text-2xl font-bold uppercase tracking-wider md:text-3xl"
          style={{ color: '#FFFFFF' }}
        >
          {title}
        </h2>
      )}

      <div className="relative">
        {/* Left gradient fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 md:w-20"
          style={{
            background: 'linear-gradient(to right, #000000, transparent)',
            opacity: canScrollLeft ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Right gradient fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 md:w-20"
          style={{
            background: 'linear-gradient(to left, #000000, transparent)',
            opacity: canScrollRight ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300 hover:shadow-[0_0_14px_rgba(255,45,123,0.4)]"
            style={{
              backgroundColor: '#111111',
              borderColor: '#222222',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} color="#FF2D7B" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300 hover:shadow-[0_0_14px_rgba(255,45,123,0.4)]"
            style={{
              backgroundColor: '#111111',
              borderColor: '#222222',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} color="#FF2D7B" />
          </button>
        )}

        {/* Scrollable container */}
        <motion.div
          ref={scrollRef}
          className="carousel-hide-scrollbar flex gap-4 overflow-x-scroll px-1 py-2"
          style={{
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          drag="x"
          dragConstraints={{ left: dragConstraint, right: 0 }}
          dragElastic={0.1}
          dragMomentum
          onDragEnd={() => {
            // Re-check scroll position after drag ends
            setTimeout(checkScroll, 100);
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[280px] flex-shrink-0 md:w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
