'use client';

import { motion } from 'framer-motion';
import { Store, Award, Users, DollarSign, type LucideIcon } from 'lucide-react';

interface TrustItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const items: TrustItem[] = [
  { icon: Store, title: 'Locally Owned & Operated', subtitle: 'Proudly serving the community' },
  { icon: Award, title: 'Premium Brands Only', subtitle: 'Curated top-quality selection' },
  { icon: Users, title: 'Friendly Expert Staff', subtitle: 'Here to help you find your vibe' },
  { icon: DollarSign, title: 'Best Prices in Texas', subtitle: 'Unbeatable everyday value' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function TrustBar() {
  return (
    <section className="py-16 px-6" style={{ backgroundColor: '#0A0A0A' }}>
      <motion.div
        className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {items.map(({ icon: Icon, title, subtitle }) => (
          <motion.div
            key={title}
            className="flex flex-col items-center text-center"
            variants={itemVariants}
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-lg mb-3"
              style={{ backgroundColor: '#FF2D7B' }}
            >
              <Icon className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-white">
              {title}
            </h3>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: '#888888' }}>
              {subtitle}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
