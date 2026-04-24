'use client';

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useBrand } from '@/components/BrandProvider';
import { categories } from '@/config/categories';
import { useEffect, useRef, useState } from 'react';

// ============================================================
// LOADING SCREEN — Animated counter + brand reveal
// ============================================================
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<'counting' | 'revealing' | 'done'>('counting');
  const target = 1200;

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= target) {
          clearInterval(interval);
          setPhase('revealing');
          setTimeout(() => {
            setPhase('done');
            setTimeout(onComplete, 400);
          }, 800);
          return target;
        }
        return prev + Math.floor(Math.random() * 35) + 10;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete, target]);

  if (phase === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >

      <motion.p
        className="text-[10px] uppercase tracking-[0.3em] mb-6"
        style={{ color: '#FF2D7B' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading Products
      </motion.p>

      <motion.p
        className="font-display text-8xl sm:text-9xl font-bold text-white tabular-nums"
        key={count}
        initial={{ opacity: 0.5, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {Math.min(count, target)}
      </motion.p>

      {/* Progress bar */}
      <div className="mt-8 w-48 h-[2px] overflow-hidden" style={{ backgroundColor: '#222' }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: '#FF2D7B' }}
          animate={{ width: `${Math.min((count / target) * 100, 100)}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {phase === 'revealing' && (
        <motion.p
          className="absolute font-display text-6xl sm:text-8xl font-bold text-white uppercase tracking-tighter"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          TOKE &amp; CHILL
        </motion.p>
      )}
    </motion.div>
  );
}

// ============================================================
// CATEGORY SHOWCASE — Numbered ritual-style sections
// ============================================================
function CategoryShowcase() {
  const featured = categories.slice(0, 4);
  const labels = ['MOST POPULAR', 'TRENDING', 'PREMIUM', 'ESSENTIALS'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px]" style={{ backgroundColor: '#222' }}>
      {featured.map((cat, i) => (
        <motion.div
          key={cat.slug}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.6 }}
        >
          <Link
            href={`/products/${cat.slug}`}
            className="group block p-8 sm:p-10 transition-colors duration-500 relative overflow-hidden"
            style={{ backgroundColor: '#0A0A0A' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0A0A0A';
            }}
          >
            {/* Number */}
            <p className="font-display text-6xl sm:text-7xl font-bold leading-none"
              style={{ color: 'rgba(255,45,123,0.15)' }}>
              {(i + 1).toString().padStart(2, '0')}
            </p>

            {/* Label */}
            <p className="mt-4 text-[10px] uppercase tracking-[0.2em]" style={{ color: '#FF2D7B' }}>
              {labels[i]}
            </p>

            {/* Category name */}
            <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white uppercase tracking-wide">
              {cat.name}
            </h3>

            {/* Description */}
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#666' }}>
              {cat.description}
            </p>

            {/* Hover arrow */}
            <motion.div
              className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest"
              style={{ color: '#FF2D7B' }}
              initial={{ x: 0 }}
              whileHover={{ x: 8 }}
            >
              Explore →
            </motion.div>

            {/* Hover glow line at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-500 opacity-0 group-hover:opacity-100"
              style={{ background: 'linear-gradient(to right, #FF2D7B, #00E5FF)' }}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// SCROLLING TEXT BANNER
// ============================================================
function ScrollingBanner() {
  const text = 'VAPES • THCA • GUMMIES • KRATOM • HOOKAH • GLASS • CBD • E-LIQUIDS • PAPERS • ACCESSORIES • ';
  const repeated = text.repeat(4);

  return (
    <div className="overflow-hidden py-6 border-y" style={{ borderColor: '#222' }}>
      <motion.p
        className="whitespace-nowrap font-display text-4xl sm:text-5xl font-bold uppercase"
        style={{ color: 'rgba(255,255,255,0.06)' }}
        animate={{ x: ['0%', '-25%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {repeated}
      </motion.p>
    </div>
  );
}

// ============================================================
// MAIN HERO
// ============================================================
export default function HeroBanner() {
  useBrand();
  const [loaded, setLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const fwdRef = useRef<HTMLVideoElement>(null);
  const revRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Ping-pong: forward video ends → play reverse video, and vice versa
  useEffect(() => {
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (!fwd || !rev) return;

    const swap = (hide: HTMLVideoElement, show: HTMLVideoElement) => {
      hide.style.opacity = '0';
      show.currentTime = 0;
      show.style.opacity = '0.6';
      void show.play();
    };

    const onFwdEnded = () => swap(fwd, rev);
    const onRevEnded = () => swap(rev, fwd);

    fwd.addEventListener('ended', onFwdEnded);
    rev.addEventListener('ended', onRevEnded);
    return () => {
      fwd.removeEventListener('ended', onFwdEnded);
      rev.removeEventListener('ended', onRevEnded);
    };
  }, []);

  // Skip loader if returning to page (already in session)
  useEffect(() => {
    if (sessionStorage.getItem('hero_loaded')) {
      setShowLoader(false);
      setLoaded(true);
    }
  }, []);

  const handleLoadComplete = () => {
    setShowLoader(false);
    setLoaded(true);
    sessionStorage.setItem('hero_loaded', 'true');
  };

  return (
    <>
      {/* Loading Screen */}
      <AnimatePresence>
        {showLoader && <LoadingScreen onComplete={handleLoadComplete} />}
      </AnimatePresence>

      {/* Hero Section */}
      <section ref={heroRef} className="relative bg-black overflow-hidden">

        {/* Join Our Team — top right like SŌM's waitlist button */}
        <motion.div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
          initial={{ opacity: 0, y: -10 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-none border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300"
            style={{ borderColor: '#fff', color: '#fff', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FF2D7B';
              e.currentTarget.style.borderColor = '#FF2D7B';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#fff';
              e.currentTarget.style.color = '#fff';
            }}
          >
            Join Our Team →
          </Link>
        </motion.div>

        {/* === SECTION 1: Title === */}
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(255,45,123,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(0,229,255,0.08) 0%, transparent 50%)',
            }}
          />

          {/* Animated sparkles */}
          {loaded && [...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                backgroundColor: i % 2 === 0 ? '#FF2D7B' : '#00E5FF',
                left: `${8 + (i * 7.7) % 85}%`,
                top: `${10 + (i * 8.3) % 80}%`,
              }}
              animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.6 }}
            />
          ))}

          {/* Smoke video — ping-pong between forward and pre-encoded reverse */}
          <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
            <video
              ref={fwdRef}
              autoPlay
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ mixBlendMode: 'screen', opacity: 0.6 }}
            >
              <source src="/videos/smoke.mp4" type="video/mp4" />
            </video>
            <video
              ref={revRef}
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ mixBlendMode: 'screen', opacity: 0 }}
            >
              <source src="/videos/smoke-reverse.mp4" type="video/mp4" />
            </video>
          </div>

          <motion.div
            className="relative z-10 text-center max-w-5xl"
            style={{ y: titleY, opacity: titleOpacity }}
          >
            {/* Overline */}
            <motion.p
              className="text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-6"
              style={{ color: '#FF2D7B' }}
              initial={{ opacity: 0, y: 20 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Premium Smoke &amp; Vape Experience
            </motion.p>

            {/* Main title — stacked bold lines */}
            <motion.h1
              className="font-display leading-[0.85] tracking-tighter text-6xl sm:text-8xl md:text-9xl font-bold uppercase"
              style={{
                color: '#FFFFFF',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              TOKE &amp; CHILL
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-8 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
              style={{ color: '#888' }}
              initial={{ opacity: 0 }}
              animate={loaded ? { opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              1200+ products. 50+ premium brands. 13 categories.
              3 locations across Austin &amp; Leander, Texas.
              Open 7 days a week.
            </motion.p>

            {/* Location pill */}
            <motion.div
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-widest"
              style={{ backgroundColor: '#111', border: '1px solid #222', color: '#888' }}
              initial={{ opacity: 0 }}
              animate={loaded ? { opacity: 1 } : {}}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: '#00E5FF' }} />
              Austin &amp; Leander, TX
            </motion.div>

            {/* CTAs */}
            <motion.div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={loaded ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <Link
                href="/products"
                className="group relative inline-flex items-center justify-center px-10 py-4 text-sm font-bold uppercase tracking-widest text-black overflow-hidden rounded-none"
                style={{ backgroundColor: '#FF2D7B' }}
              >
                <motion.span
                  className="absolute inset-0 bg-white"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.4 }}
                  style={{ opacity: 0.2 }}
                />
                <span className="relative">Explore Products</span>
              </Link>
              <Link
                href="/stores"
                className="inline-flex items-center justify-center px-10 py-4 text-sm font-bold uppercase tracking-widest transition-all duration-300 border hover:text-black rounded-none"
                style={{ borderColor: '#333', color: '#fff', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#000';
                  e.currentTarget.style.borderColor = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                Visit a Store
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="mt-12 grid grid-cols-3 sm:grid-cols-5 gap-6 sm:gap-8 text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.3, duration: 0.6 }}
          >
            {[
              { n: '1200+', label: 'Products' },
              { n: '13', label: 'Categories' },
              { n: '50+', label: 'Top Brands' },
              { n: '3', label: 'Stores' },
              { n: '7', label: 'Days Open' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl sm:text-4xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{s.n}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/70">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
          >
            <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: '#555' }}>Scroll</p>
            <ChevronDown className="w-4 h-4" style={{ color: '#555' }} />
          </motion.div>
        </div>

        {/* === SECTION 2: Scrolling text banner === */}
        <ScrollingBanner />

        {/* === SECTION 3: Category Showcase (numbered rituals) === */}
        <CategoryShowcase />

        {/* === SECTION 4: Another scrolling banner === */}
        <ScrollingBanner />
      </section>
    </>
  );
}
