export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
}

export const categories: Category[] = [
  {
    slug: 'disposables',
    name: 'Disposable Vapes',
    description: 'Geek Bar, Lost Mary, RAZ, Foger, Elf Bar, and more top brands.',
    icon: 'Wind',
  },
  {
    slug: 'eliquids',
    name: 'E-Liquids & Salts',
    description: 'Premium juice, salt nic, and freebase in every flavor.',
    icon: 'Droplets',
  },
  {
    slug: 'devices',
    name: 'Devices & Mods',
    description: 'Vaporesso pod systems, box mods, and starter kits.',
    icon: 'Battery',
  },
  {
    slug: 'thca',
    name: 'THCA Vapes',
    description: 'THCA disposables, live resin carts, and concentrates.',
    icon: 'Zap',
  },
  {
    slug: 'thca-flower',
    name: 'THCA Flower',
    description: 'Premium THCA flower in indica, sativa, and hybrid strains.',
    icon: 'Flower2',
  },
  {
    slug: 'gummies',
    name: 'Gummies & Edibles',
    description: 'Delta-9, live rosin, and hemp-derived THC gummies.',
    icon: 'Candy',
  },
  {
    slug: 'cbd',
    name: 'CBD Products',
    description: 'CBD vapes, gummies, tinctures, and topicals.',
    icon: 'Heart',
  },
  {
    slug: 'kratom',
    name: 'Kratom',
    description: 'Capsules, extracts, and shots from top kratom brands.',
    icon: 'Leaf',
  },
  {
    slug: 'hookah',
    name: 'Hookah & Shisha',
    description: 'Fumari, Starbuzz, Al Fakher, and hookah accessories.',
    icon: 'CloudHail',
  },
  {
    slug: 'tobacco',
    name: 'Tobacco & Cigars',
    description: 'Cigarettes, cigarillos, pipe tobacco, and JUUL pods.',
    icon: 'Cigarette',
  },
  {
    slug: 'prerolls',
    name: 'Wraps & Papers',
    description: 'Rolling papers, cones, blunt wraps, and pre-rolls.',
    icon: 'ScrollText',
  },
  {
    slug: 'glass',
    name: 'Glass & Pipes',
    description: 'Hand pipes, water pipes, bubblers, and rigs.',
    icon: 'Flame',
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Lighters, torches, grinders, coils, and more.',
    icon: 'Wrench',
  },
];
