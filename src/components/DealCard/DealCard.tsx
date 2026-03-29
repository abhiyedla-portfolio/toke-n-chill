'use client';

import { motion } from 'framer-motion';
import { Tag, Clock } from 'lucide-react';
import type { Deal } from '@/data/deals';

interface DealCardProps {
  deal: Deal;
  index?: number;
}

export default function DealCard({ deal, index = 0 }: DealCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-lg border transition-all duration-300 hover:border-[rgba(255,45,123,0.4)] hover:shadow-[0_0_20px_rgba(255,45,123,0.15)]"
      style={{ backgroundColor: '#111111', borderColor: '#222222' }}
    >
      <div
        className="relative h-40"
        style={{ background: 'linear-gradient(135deg, #1a0510 0%, #111 50%, rgba(255,45,123,0.15) 100%)' }}
      >
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-bold uppercase tracking-wider text-black"
            style={{ backgroundColor: '#FF2D7B' }}>
            <Tag className="h-3.5 w-3.5" />
            {deal.discount}
          </span>
        </div>
        {deal.category === 'new-arrival' && (
          <div className="absolute right-4 top-4">
            <span className="rounded px-3 py-1 text-xs font-bold uppercase tracking-wider text-black"
              style={{ backgroundColor: '#00E5FF' }}>
              NEW
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
          {deal.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#888888' }}>
          {deal.description}
        </p>
        {deal.expiresAt && (
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: '#00E5FF' }}>
            <Clock className="h-3.5 w-3.5" />
            <span>{deal.expiresAt}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
