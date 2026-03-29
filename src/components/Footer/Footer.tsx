'use client';

import Link from 'next/link';
import { MapPin, Phone, Clock } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';

const quickLinks = [
  { href: '/products', label: 'Products' },
  { href: '/deals', label: 'Deals' },
  { href: '/stores', label: 'Stores' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
];

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'Twitter / X', href: '#' },
];

export default function Footer() {
  const brand = useBrand();
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      {/* Top gradient line */}
      <div
        className="h-[2px] w-full"
        style={{
          background: 'linear-gradient(to right, #FF2D7B, #00E5FF)',
        }}
      />

      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand / About */}
          <div>
            <h3
              className="mb-3 text-xl font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#FFFFFF',
              }}
            >
              {brand.name}
            </h3>
            <p
              className="mb-4 text-sm leading-relaxed"
              style={{ color: '#888888' }}
            >
              {brand.tagline} Locally owned and operated in{' '}
              {brand.storeLocation}. Premium vapes, glass, accessories, and
              more.
            </p>
            <p className="text-sm" style={{ color: '#888888' }}>
              Visit our sister store:{' '}
              <a
                href={brand.sisterBrand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors"
                style={{ color: '#FF2D7B' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FF6DA0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FF2D7B')}
              >
                {brand.sisterBrand.name}
              </a>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="mb-3 text-xs font-semibold uppercase"
              style={{
                letterSpacing: '0.15em',
                color: '#FF2D7B',
              }}
            >
              Quick Links
            </h4>
            <ul className="flex flex-col gap-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{ color: '#888888' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = '#FFFFFF')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = '#888888')
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Store Info */}
          <div>
            <h4
              className="mb-3 text-xs font-semibold uppercase"
              style={{
                letterSpacing: '0.15em',
                color: '#FF2D7B',
              }}
            >
              Store Info
            </h4>
            <address
              className="flex flex-col gap-3 text-sm not-italic"
              style={{ color: '#FFFFFF' }}
            >
              <a
                href={brand.store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                <MapPin
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{ color: '#FF2D7B' }}
                />
                <span>
                  {brand.store.address}
                  <br />
                  {brand.store.city}, {brand.store.state} {brand.store.zip}
                </span>
              </a>
              <a
                href={`tel:${brand.store.phone.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-2 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              >
                <Phone
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: '#FF2D7B' }}
                />
                <span>{brand.store.phone}</span>
              </a>
              <div className="flex items-start gap-2">
                <Clock
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{ color: '#FF2D7B' }}
                />
                <div className="leading-relaxed">
                  <p>{brand.store.hours.weekday}</p>
                  <p>{brand.store.hours.sunday}</p>
                </div>
              </div>
            </address>
          </div>

          {/* Connect */}
          <div>
            <h4
              className="mb-3 text-xs font-semibold uppercase"
              style={{
                letterSpacing: '0.15em',
                color: '#FF2D7B',
              }}
            >
              Connect
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-md px-3 py-1.5 text-sm transition-all"
                  style={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #333333',
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF2D7B';
                    e.currentTarget.style.boxShadow =
                      '0 0 8px rgba(255, 45, 123, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#333333';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid #222222' }}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div
            className="flex flex-col items-center gap-3 text-center text-xs"
            style={{ color: '#888888' }}
          >
            <p>
              Operated by Deccan Chargers LLC &middot; Austin &amp; Leander, TX
            </p>
            <p>
              Sales restricted to adults 21+ as required by Texas law &middot;
              Must be 21+ to purchase
            </p>
            <p>
              &copy; {currentYear} {brand.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
