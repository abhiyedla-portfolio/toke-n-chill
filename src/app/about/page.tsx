'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Award, MapPin, Heart, Users, Leaf } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';

const whyChooseUs = [
  {
    icon: ShieldCheck,
    title: 'Trusted Products',
    description: 'We carry only authentic, lab-tested products from reputable brands.',
  },
  {
    icon: Award,
    title: 'Best Prices in Town',
    description: 'Competitive pricing and regular deals you won\'t find anywhere else.',
  },
  {
    icon: Users,
    title: 'Knowledgeable Staff',
    description: 'Our team is trained to help you find exactly what you need.',
  },
  {
    icon: Heart,
    title: 'Locally Owned',
    description: 'Proudly serving our Texas communities with a personal touch.',
  },
  {
    icon: Leaf,
    title: 'Wide Selection',
    description: 'From disposable vapes to premium glass, we stock it all.',
  },
  {
    icon: MapPin,
    title: 'Convenient Locations',
    description: 'Two stores across Austin and Leander for easy access.',
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutPage() {
  const brand = useBrand();

  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Page title */}
      <h1
        className="mb-10 text-4xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        {brand.name}: Our Story
      </h1>

      {/* Brand story */}
      <motion.section
        className="mb-12"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2
          className="mb-4 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Who We Are
        </h2>
        <div
          className="space-y-4 text-base leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <p>
            {brand.name} is a locally owned and operated smoke and vape shop proudly serving the
            {brand.storeLocation} community. What started as a passion for bringing high-quality
            products and a welcoming atmosphere to our neighborhood has grown into one of the most
            trusted names in the area.
          </p>
          <p>
            We believe that shopping for vapes, glass, accessories, and more should be an enjoyable
            experience &mdash; not a confusing one. That&apos;s why our knowledgeable team is
            always on hand to walk you through options, answer questions, and help you find
            the perfect product for your needs.
          </p>
          <p>
            From day one, we&apos;ve been committed to stocking only authentic, lab-tested products
            from brands you can trust. No knock-offs. No shortcuts. Just quality you can count on
            every time you visit.
          </p>
        </div>
      </motion.section>

      {/* Mission statement */}
      <motion.section
        className="mb-12 rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
        }}
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2
          className="mb-4 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Our Mission
        </h2>
        <p
          className="text-lg leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          To provide our community with a curated selection of premium smoke and vape products
          in a welcoming, judgment-free environment &mdash; backed by fair prices, genuine
          expertise, and a commitment to keeping things local.
        </p>
      </motion.section>

      {/* Why Choose Us */}
      <motion.section
        className="mb-12"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2
          className="mb-8 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Why Choose Us
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyChooseUs.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderWidth: '1px',
                borderColor: 'var(--color-border)',
              }}
            >
              <item.icon
                className="mb-3 h-8 w-8"
                style={{ color: 'var(--color-accent)' }}
              />
              <h3
                className="mb-1 text-base font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Sister store */}
      <motion.section
        className="mb-12 rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
        }}
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2
          className="mb-4 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Two Stores, One Family
        </h2>
        <p
          className="mb-4 text-base leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          We&apos;re proud to operate alongside our sister store,{' '}
          <a
            href={brand.sisterBrand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-primary)' }}
          >
            {brand.sisterBrand.name}
          </a>
          . Together, we serve the Austin and Leander communities with the same dedication to
          quality, service, and value. No matter which location you visit, you&apos;ll feel right
          at home.
        </p>
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <MapPin className="h-4 w-4" />
          View All Locations
        </Link>
      </motion.section>

      {/* Parent company */}
      <motion.p
        className="text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        Proudly operated by Deccan Chargers LLC &mdash; Austin &amp; Leander, Texas.
      </motion.p>
    </motion.main>
  );
}
