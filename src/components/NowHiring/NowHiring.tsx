'use client';

import { motion } from 'framer-motion';
import { Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NowHiring() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <motion.div
        className="mx-auto max-w-4xl rounded-lg border overflow-hidden"
        style={{ borderColor: '#222', backgroundColor: '#111' }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* Gradient top accent */}
        <div
          className="h-[2px] w-full"
          style={{ background: 'linear-gradient(to right, #FF2D7B, #00E5FF)' }}
        />

        <div className="flex flex-col items-center gap-6 p-8 sm:p-12 text-center">
          {/* Animated icon */}
          <motion.div
            className="flex items-center justify-center w-16 h-16 rounded-lg"
            style={{ backgroundColor: 'rgba(255, 45, 123, 0.12)', border: '1px solid rgba(255, 45, 123, 0.25)' }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Briefcase className="h-7 w-7" style={{ color: '#FF2D7B' }} />
          </motion.div>

          {/* Badge */}
          <motion.span
            className="inline-flex items-center gap-2 rounded px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: 'rgba(0, 229, 255, 0.12)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.25)' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="h-2 w-2 rounded-full bg-[#00E5FF] animate-pulse" />
            Now Hiring
          </motion.span>

          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-white">
            Join Our Team
          </h2>

          <p className="max-w-lg text-base leading-relaxed" style={{ color: '#888' }}>
            We&apos;re growing fast and looking for friendly, knowledgeable people who love
            the industry. Competitive pay, flexible hours, and employee discounts across all
            3 locations in Austin &amp; Leander.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_20px_rgba(255,45,123,0.4)]"
              style={{ backgroundColor: '#FF2D7B' }}
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm" style={{ color: '#666' }}>
              Or drop your resume in-store at any location
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
