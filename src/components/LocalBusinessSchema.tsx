import { getBrand } from '@/config/brands';

export function LocalBusinessSchema() {
  const brand = getBrand();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: brand.name,
    image: '/images/store-front.jpg',
    description: brand.meta.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.store.address,
      addressLocality: brand.store.city,
      addressRegion: brand.store.state,
      postalCode: brand.store.zip,
      addressCountry: 'US',
    },
    openingHours: ['Mo-Sa 09:00-22:00', 'Su 10:00-21:00'],
    telephone: brand.store.phone,
    priceRange: '$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card',
    url: typeof window !== 'undefined' ? window.location.origin : '',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
