export interface Deal {
  id: string;
  title: string;
  description: string;
  discount: string;
  category: 'weekly' | 'clearance' | 'new-arrival';
  image: string;
  expiresAt?: string;
}

export const deals: Deal[] = [
  {
    id: 'deal-1',
    title: 'Elf Bar 2-for-1 Tuesdays',
    description: 'Buy any Elf Bar disposable, get the second half off. Every Tuesday.',
    discount: '50% OFF 2nd',
    category: 'weekly',
    image: '/images/deals/placeholder.jpg',
    expiresAt: 'Every Tuesday',
  },
  {
    id: 'deal-2',
    title: 'RAZ CA6000 Launch Special',
    description: 'Try the new RAZ CA6000 at an introductory price. Limited time only.',
    discount: '$3 OFF',
    category: 'new-arrival',
    image: '/images/deals/placeholder.jpg',
  },
  {
    id: 'deal-3',
    title: 'Glass Clearance Event',
    description: 'Select glass pieces marked down to make room for new inventory.',
    discount: 'UP TO 40% OFF',
    category: 'clearance',
    image: '/images/deals/placeholder.jpg',
  },
  {
    id: 'deal-4',
    title: 'Weekend E-Liquid Bundle',
    description: 'Buy 2 bottles of premium e-liquid, get a 3rd free. Fri-Sun only.',
    discount: 'BUY 2 GET 1',
    category: 'weekly',
    image: '/images/deals/placeholder.jpg',
    expiresAt: 'Fri–Sun',
  },
  {
    id: 'deal-5',
    title: 'Delta Extrax Grand Opening Deal',
    description: 'New in store! 20% off all Delta Extrax products this month.',
    discount: '20% OFF',
    category: 'new-arrival',
    image: '/images/deals/placeholder.jpg',
  },
  {
    id: 'deal-6',
    title: 'Accessory Blowout',
    description: 'Rolling papers, lighters, and grinders — all marked down.',
    discount: 'FROM $1.99',
    category: 'clearance',
    image: '/images/deals/placeholder.jpg',
  },
];
