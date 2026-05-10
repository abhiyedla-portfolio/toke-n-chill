import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, Bebas_Neue, Space_Mono } from 'next/font/google';
import './globals.css';
import { getBrand, getBrandId } from '@/config/brands';
import { BrandProvider } from '@/components/BrandProvider';
import { CatalogProvider } from '@/components/CatalogProvider';
import { LocalBusinessSchema } from '@/components/LocalBusinessSchema';
import SiteShell from '@/components/SiteShell';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

const brand = getBrand();
const brandId = getBrandId();

export const metadata: Metadata = {
  title: brand.meta.title,
  description: brand.meta.description,
  keywords: brand.meta.keywords,
  openGraph: {
    title: brand.meta.title,
    description: brand.meta.description,
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pick the right font variables based on brand
  const isToke = brandId === 'toke-and-chill';
  const displayFont = isToke ? playfairDisplay : bebasNeue;
  const bodyFont = isToke ? dmSans : spaceMono;

  return (
    <html lang="en" data-brand={brandId}>
      <head>
        <LocalBusinessSchema />
      </head>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${playfairDisplay.variable} ${dmSans.variable} ${bebasNeue.variable} ${spaceMono.variable} antialiased`}
      >
        <BrandProvider>
          <CatalogProvider>
            <SiteShell>{children}</SiteShell>
          </CatalogProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
