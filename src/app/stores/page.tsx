'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Navigation } from 'lucide-react';
import brands from '@/config/brands';

// All stores from both brands, flattened
const allStores = Object.values(brands).flatMap((b) =>
  b.stores.map((store) => ({
    ...store,
    brandName: b.name,
    brandId: b.id,
  })),
);

export default function StoresPage() {
  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="mb-3 font-display text-5xl font-bold uppercase tracking-wide text-white">
        Our Stores
      </h1>
      <p className="mb-10" style={{ color: '#888' }}>
        3 locations across Austin &amp; Leander, TX
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {allStores.map((store, i) => (
          <motion.div
            key={store.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex flex-col rounded-lg border p-6"
            style={{ backgroundColor: '#111', borderColor: '#222' }}
          >
            {/* Brand badge */}
            <span
              className="mb-3 inline-flex w-fit rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                backgroundColor: store.brandId === 'dizzy-dose' ? '#A855F7' : '#FF2D7B',
                color: '#000',
              }}
            >
              {store.brandName}
            </span>

            {/* Store name */}
            <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide text-white">
              {store.name}
            </h2>

            {/* Note */}
            {store.note && (
              <div
                className="mb-4 rounded px-4 py-2.5 text-sm font-medium"
                style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.2)' }}
              >
                {store.note}
              </div>
            )}

            {/* Address */}
            <div className="mb-3 flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#FF2D7B' }} />
              <p className="text-white">
                {store.address}
                <br />
                {store.city}, {store.state} {store.zip}
              </p>
            </div>

            {/* Phone */}
            <div className="mb-3 flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0" style={{ color: '#FF2D7B' }} />
              <a
                href={`tel:${store.phone.replace(/[^+\d]/g, '')}`}
                className="text-white underline-offset-2 hover:underline"
              >
                {store.phone}
              </a>
            </div>

            {/* Hours */}
            <div className="mb-6 flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#FF2D7B' }} />
              <div className="text-white">
                <p>{store.hours.weekday}</p>
                <p>{store.hours.sunday}</p>
              </div>
            </div>

            {/* Get Directions */}
            <a
              href={store.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_16px_rgba(255,45,123,0.4)]"
              style={{ backgroundColor: '#FF2D7B' }}
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </a>
          </motion.div>
        ))}
      </div>

      {/* Map section */}
      <section className="mt-12">
        <h2 className="mb-6 font-display text-3xl font-bold uppercase tracking-wide text-white">
          Find Us
        </h2>
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: '#222' }}>
          <iframe
            title="Store Locations Map"
            className="h-80 w-full"
            src={`https://maps.google.com/maps?q=Toke+and+Chill+Austin+TX&output=embed`}
            style={{ border: 0, backgroundColor: '#111' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </motion.main>
  );
}
