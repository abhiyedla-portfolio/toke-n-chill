'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tag, Sparkles, Percent, Package } from 'lucide-react';
import { deals, type Deal } from '@/data/deals';

type Filter = 'all' | 'weekly' | 'clearance' | 'new-arrival';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'weekly', label: 'This Week' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'new-arrival', label: 'New Arrivals' },
];

const badgeColors: Record<Deal['category'], string> = {
  weekly: '#2563eb',
  clearance: '#dc2626',
  'new-arrival': '#059669',
};

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function DealsPage() {
  const [active, setActive] = useState<Filter>('all');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const filtered = useMemo(() => {
    if (active === 'all') return deals;
    return deals.filter((d) => d.category === active);
  }, [active]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="mb-8 text-4xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Deals &amp; Promotions
      </h1>

      {/* Filter tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: active === f.key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: active === f.key ? '#ffffff' : 'var(--color-text)',
              borderWidth: '1px',
              borderColor: active === f.key ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Deal cards grid */}
      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={active}
      >
        {filtered.map((deal) => (
          <motion.div
            key={deal.id}
            variants={cardVariants}
            className="flex flex-col rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderWidth: '1px',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Badge */}
            <span
              className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: badgeColors[deal.category] }}
            >
              {deal.category === 'weekly' && <Percent className="h-3 w-3" />}
              {deal.category === 'clearance' && <Tag className="h-3 w-3" />}
              {deal.category === 'new-arrival' && <Sparkles className="h-3 w-3" />}
              {deal.discount}
            </span>

            <h3
              className="mb-2 text-lg font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {deal.title}
            </h3>

            <p
              className="mb-4 flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {deal.description}
            </p>

            {deal.expiresAt && (
              <p
                className="mt-auto text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                Available: {deal.expiresAt}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <Package className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>
            No deals in this category right now. Check back soon!
          </p>
        </div>
      )}

      {/* Email sign-up */}
      <section
        className="mt-12 rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="mb-2 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Sign Up for Deal Alerts
        </h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Be the first to know about new promotions and exclusive offers.
        </p>

        {subscribed ? (
          <p className="font-semibold" style={{ color: 'var(--color-accent)' }}>
            You&apos;re signed up! We&apos;ll keep you posted.
          </p>
        ) : (
          <form
            onSubmit={handleSubscribe}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg px-4 py-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                borderWidth: '1px',
                borderColor: 'var(--color-border)',
              }}
            />
            <button
              type="submit"
              className="rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
              }}
            >
              Subscribe
            </button>
          </form>
        )}
      </section>

      {/* Legal note */}
      <p className="mt-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Deals available in-store only while supplies last. Prices and availability subject to change
        without notice. Must be 21+ to purchase.
      </p>
    </motion.main>
  );
}
