export type BrandId = 'toke-and-chill' | 'dizzy-dose';

export interface BrandConfig {
  id: BrandId;
  name: string;
  tagline: string;
  entity: string;
  storeLocation: string;
  sisterBrand: {
    name: string;
    url: string;
  };
  stores: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    hours: {
      weekday: string;
      sunday: string;
    };
    mapsUrl: string;
    placeId: string;
    note?: string;
  }[];
  /** Primary store (first in array) for quick access */
  store: {
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    hours: {
      weekday: string;
      sunday: string;
    };
    mapsUrl: string;
    placeId: string;
  };
  fonts: {
    display: string;
    body: string;
    displayClass: string;
    bodyClass: string;
  };
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
}

const brands: Record<BrandId, BrandConfig> = {
  'toke-and-chill': {
    id: 'toke-and-chill',
    name: 'Toke and Chill',
    tagline: 'Your vibe, your store.',
    entity: 'Deccan Vape Austin LLC',
    storeLocation: 'Austin & Leander, TX',
    sisterBrand: {
      name: 'Dizzy Dose',
      url: 'https://dizzydose.com',
    },
    stores: [
      {
        name: 'Toke and Chill — Leander (Main)',
        address: '15181 Ronald Reagan Blvd Suite 302',
        city: 'Leander',
        state: 'TX',
        zip: '78641',
        phone: '(512) 456-0259',
        hours: {
          weekday: 'Mon–Sat: 9am – 10pm',
          sunday: 'Sunday: 10am – 9pm',
        },
        mapsUrl: 'https://maps.google.com/?q=15181+Ronald+Reagan+Blvd+Suite+302+Leander+TX+78641',
        placeId: '',
      },
      {
        name: 'Toke and Chill — Austin (Anderson Ln)',
        address: '1810 W Anderson Ln.',
        city: 'Austin',
        state: 'TX',
        zip: '78757',
        phone: '(512) 456-0259',
        hours: {
          weekday: 'Mon–Sat: 9am – 10pm',
          sunday: 'Sunday: 10am – 9pm',
        },
        mapsUrl: 'https://maps.google.com/?q=1810+W+Anderson+Ln+Austin+TX+78757',
        placeId: '',
      },
    ],
    store: {
      address: '15181 Ronald Reagan Blvd Suite 302',
      city: 'Leander',
      state: 'TX',
      zip: '78641',
      phone: '(512) 456-0259',
      hours: {
        weekday: 'Mon–Sat: 9am – 10pm',
        sunday: 'Sunday: 10am – 9pm',
      },
      mapsUrl: 'https://maps.google.com/?q=15181+Ronald+Reagan+Blvd+Suite+302+Leander+TX+78641',
      placeId: '',
    },
    fonts: {
      display: 'Bebas Neue',
      body: 'DM Sans',
      displayClass: 'font-display',
      bodyClass: 'font-body',
    },
    meta: {
      title: 'Toke and Chill | Austin & Leander TX Smoke & Vape Shop',
      description:
        "Austin and Leander's favorite locally owned smoke shop. Premium vapes, glass, accessories, and e-liquids. Visit us today.",
      keywords: [
        'smoke shop austin tx',
        'vape store austin',
        'disposable vapes austin',
        'glass pipes austin',
        'cbd austin tx',
      ],
    },
  },
  'dizzy-dose': {
    id: 'dizzy-dose',
    name: 'Dizzy Dose',
    tagline: 'Hit different.',
    entity: 'Deccan Vape Ronald Reagan LLC',
    storeLocation: 'South Austin, TX',
    sisterBrand: {
      name: 'Toke and Chill',
      url: 'https://tokeandchill.com',
    },
    stores: [
      {
        name: 'Dizzy Dose — South Austin',
        address: '4415 Menchaca Rd Ste #B',
        city: 'Austin',
        state: 'TX',
        zip: '78745',
        phone: '(512) 456-0259',
        hours: {
          weekday: 'Mon–Sat: 9am – 10pm',
          sunday: 'Sunday: 10am – 9pm',
        },
        mapsUrl: 'https://maps.google.com/?q=4415+Menchaca+Rd+Ste+B+Austin+TX+78745',
        placeId: '',
      },
    ],
    store: {
      address: '4415 Menchaca Rd Ste #B',
      city: 'Austin',
      state: 'TX',
      zip: '78745',
      phone: '(512) 456-0259',
      hours: {
        weekday: 'Mon–Sat: 9am – 10pm',
        sunday: 'Sunday: 10am – 9pm',
      },
      mapsUrl: 'https://maps.google.com/?q=4415+Menchaca+Rd+Ste+B+Austin+TX+78745',
      placeId: '',
    },
    fonts: {
      display: 'Bebas Neue',
      body: 'Space Mono',
      displayClass: 'font-display',
      bodyClass: 'font-body',
    },
    meta: {
      title: 'Dizzy Dose | South Austin TX Vape & Smoke Shop',
      description:
        "South Austin's boldest vape and smoke shop on Menchaca Rd. Premium brands, best prices.",
      keywords: [
        'smoke shop south austin tx',
        'vape store menchaca',
        'vape shop austin 78745',
        'disposable vapes south austin',
        'smoke shop near me',
      ],
    },
  },
};

export function getBrand(): BrandConfig {
  const brandId = (process.env.NEXT_PUBLIC_BRAND || 'toke-and-chill') as BrandId;
  return brands[brandId] || brands['toke-and-chill'];
}

export function getBrandId(): BrandId {
  return (process.env.NEXT_PUBLIC_BRAND || 'toke-and-chill') as BrandId;
}

export default brands;
