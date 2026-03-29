/**
 * Maps Clover category names (case-insensitive) to site category slugs.
 * Edit this file when new Clover categories are created in the POS.
 */
export const cloverCategoryMap: Record<string, string> = {
  // Disposable Vapes
  'disposable vapes': 'disposables',
  'disposables': 'disposables',
  'disposable': 'disposables',

  // Devices & Mods
  'devices': 'devices',
  'devices & mods': 'devices',
  'mods': 'devices',
  'pod systems': 'devices',
  'starter kits': 'devices',
  'box mods': 'devices',

  // E-Liquids
  'e-liquids': 'eliquids',
  'e-liquid': 'eliquids',
  'eliquids': 'eliquids',
  'juice': 'eliquids',
  'vape juice': 'eliquids',

  // Glass & Pipes
  'glass': 'glass',
  'glass & pipes': 'glass',
  'pipes': 'glass',
  'water pipes': 'glass',
  'bubblers': 'glass',
  'bongs': 'glass',
  'hand pipes': 'glass',

  // Accessories
  'accessories': 'accessories',
  'rolling papers': 'accessories',
  'lighters': 'accessories',
  'grinders': 'accessories',
  'coils': 'accessories',
  'chargers': 'accessories',

  // CBD & Delta
  'cbd': 'cbd-delta',
  'cbd & delta': 'cbd-delta',
  'delta': 'cbd-delta',
  'delta-8': 'cbd-delta',
  'delta-9': 'cbd-delta',
  'delta 8': 'cbd-delta',
  'delta 9': 'cbd-delta',
  'hemp': 'cbd-delta',
  'gummies': 'cbd-delta',
};

/** Default category for unmapped Clover items */
export const DEFAULT_CATEGORY = 'accessories';

/**
 * Look up the site category slug for a Clover category name.
 * Returns the mapped slug or the default category.
 */
export function mapCloverCategory(cloverCategoryName: string): string {
  const normalized = cloverCategoryName.toLowerCase().trim();
  return cloverCategoryMap[normalized] ?? DEFAULT_CATEGORY;
}
