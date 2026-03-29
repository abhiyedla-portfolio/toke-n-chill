'use client';

import { createContext, useContext, ReactNode } from 'react';
import { getBrand, BrandConfig } from '@/config/brands';

const BrandContext = createContext<BrandConfig>(getBrand());

export function BrandProvider({ children }: { children: ReactNode }) {
  const brand = getBrand();
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
