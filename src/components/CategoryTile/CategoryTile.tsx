'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Wind,
  Battery,
  Droplets,
  Flame,
  Wrench,
  Leaf,
  Zap,
  Flower2,
  Candy,
  Heart,
  CloudHail,
  Cigarette,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Wind, Battery, Droplets, Flame, Wrench, Leaf,
  Zap, Flower2, Candy, Heart, CloudHail, Cigarette, ScrollText,
};

interface CategoryTileProps {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export default function CategoryTile({ slug, name, description, icon }: CategoryTileProps) {
  const Icon = iconMap[icon] ?? Leaf;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400 } }}
    >
      <Link
        href={`/products/${slug}`}
        className="group block rounded-lg border p-6 transition-all duration-300 hover:border-[rgba(255,45,123,0.4)] hover:shadow-[0_0_20px_rgba(255,45,123,0.15)]"
        style={{
          borderColor: '#222222',
          backgroundColor: '#111111',
        }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-lg mb-4"
          style={{ backgroundColor: '#FF2D7B' }}
        >
          <Icon className="w-6 h-6 text-black" />
        </div>

        <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
          {name}
        </h3>
        <p className="mt-1 text-sm" style={{ color: '#888888' }}>
          {description}
        </p>
      </Link>
    </motion.div>
  );
}
