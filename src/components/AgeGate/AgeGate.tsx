'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';

const COOKIE_NAME = 'age_verified';
const COOKIE_EXPIRY_DAYS = 30;

export default function AgeGate() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const verified = Cookies.get(COOKIE_NAME);
    setIsVisible(verified !== 'true');
  }, []);

  const handleConfirmAge = useCallback(() => {
    Cookies.set(COOKIE_NAME, 'true', { expires: COOKIE_EXPIRY_DAYS });
    setIsVisible(false);
  }, []);

  const handleDenyAge = useCallback(() => {
    window.location.href = 'https://www.google.com';
  }, []);

  // Don't render anything until we've checked the cookie (avoids flash)
  if (isVisible === null || isVisible === false) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="age-gate-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Age verification"
          aria-describedby="age-gate-description"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            className="mx-4 w-full max-w-md rounded-lg border p-8 text-center"
            style={{
              backgroundColor: '#111111',
              borderColor: '#222222',
            }}
          >
            {/* Brand Name */}
            <h1
              className="mb-4 text-2xl font-bold uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#FF2D7B',
              }}
            >
              TOKE AND CHILL
            </h1>

            {/* Gradient divider */}
            <div
              className="mx-auto mb-6 h-0.5 w-20"
              style={{
                background: 'linear-gradient(to right, #FF2D7B, #00E5FF)',
              }}
            />

            {/* Main heading */}
            <p
              id="age-gate-description"
              className="mb-2 text-5xl font-bold uppercase text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              YOU MUST BE 21+
            </p>

            {/* Subtext */}
            <p
              className="mb-8 text-lg"
              style={{ color: '#888888' }}
            >
              to enter this site
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmAge}
                autoFocus
                className="w-full py-4 text-lg font-bold uppercase tracking-wider text-black transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,45,123,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: '#FF2D7B',
                  outlineColor: '#FF2D7B',
                }}
                aria-label="Confirm I am 21 or older"
              >
                I AM 21 OR OLDER
              </button>

              <button
                onClick={handleDenyAge}
                className="w-full py-3 font-bold uppercase tracking-wider border transition-colors duration-300 hover:border-[#555] focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: '#333333',
                  color: '#888888',
                  backgroundColor: 'transparent',
                  outlineColor: '#FF2D7B',
                }}
                aria-label="I am under 21, leave site"
              >
                I AM UNDER 21
              </button>
            </div>

            {/* Legal Disclaimer */}
            <p
              className="mt-8 text-xs leading-relaxed"
              style={{ color: '#888888' }}
            >
              By entering this site, you acknowledge that you are of legal age
              to purchase tobacco and vape products in your jurisdiction. This
              website is intended for adults only. All products are intended for
              legal use by persons 21 years of age or older.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
