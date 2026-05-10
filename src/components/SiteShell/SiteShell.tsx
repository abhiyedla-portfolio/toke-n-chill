'use client';

import { usePathname } from 'next/navigation';
import AgeGate from '@/components/AgeGate';
import CookieBanner from '@/components/CookieBanner/CookieBanner';
import Footer from '@/components/Footer/Footer';
import Navbar from '@/components/Navbar/Navbar';
import SmokeParticles from '@/components/SmokeParticles/SmokeParticles';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AgeGate />
      <SmokeParticles />
      <Navbar />
      <main className="relative min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  );
}
