'use client';

import { MapPin, Phone, Clock } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';

export default function StoreCard() {
  const { store } = useBrand();
  const fullAddress = `${store.address}, ${store.city}, ${store.state} ${store.zip}`;

  return (
    <section
      className="py-6 px-6 border-t border-b"
      style={{ borderColor: '#222222', backgroundColor: '#111111' }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: '#FF2D7B' }} />
          <span>{fullAddress}</span>
        </div>
        <a
          href={`tel:${store.phone.replace(/[^+\d]/g, '')}`}
          className="flex items-center gap-2 text-white hover:underline"
        >
          <Phone className="w-4 h-4 shrink-0" style={{ color: '#FF2D7B' }} />
          <span>{store.phone}</span>
        </a>
        <div className="flex items-center gap-2" style={{ color: '#888888' }}>
          <Clock className="w-4 h-4 shrink-0" style={{ color: '#FF2D7B' }} />
          <span>{store.hours.weekday} &middot; {store.hours.sunday}</span>
        </div>
        <a
          href={store.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_16px_rgba(255,45,123,0.4)]"
          style={{ backgroundColor: '#FF2D7B' }}
        >
          <MapPin className="w-4 h-4" />
          Get Directions
        </a>
      </div>
    </section>
  );
}
