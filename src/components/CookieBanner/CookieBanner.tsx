'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { Shield } from 'lucide-react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = Cookies.get('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    Cookies.set('cookie_consent', 'accepted', { expires: 365 });
    setShow(false);
  };

  const handleDecline = () => {
    Cookies.set('cookie_consent', 'declined', { expires: 365 });
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div
            className="mx-auto max-w-4xl rounded-lg border p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4"
            style={{ backgroundColor: '#111111', borderColor: '#222222' }}
          >
            <div className="flex items-start gap-3 sm:items-center">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" style={{ color: '#FF2D7B' }} />
              <p className="text-sm text-white">
                We use essential cookies to make this site work. No third-party
                ad tracking.{' '}
                <a href="/legal/privacy-policy" className="underline" style={{ color: '#00E5FF' }}>
                  Privacy Policy
                </a>
              </p>
            </div>
            <div className="mt-3 flex gap-2 sm:mt-0 sm:shrink-0">
              <button
                onClick={handleDecline}
                className="rounded px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: '1px solid #333', color: '#888' }}
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="rounded px-4 py-2 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_12px_rgba(255,45,123,0.4)]"
                style={{ backgroundColor: '#FF2D7B' }}
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
