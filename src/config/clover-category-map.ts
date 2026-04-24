/**
 * Maps Clover category names (case-insensitive) to site category slugs.
 * Edit this file when new Clover categories are created in the POS.
 */
export const cloverCategoryMap: Record<string, string> = {
  // Disposable Vapes
  'disposable vapes': 'disposables',
  'disposables': 'disposables',
  'disposable': 'disposables',
  'vape': 'disposables',

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
  'cbd': 'cbd',
  'cbd & delta': 'cbd',
  'delta': 'gummies',
  'delta-8': 'gummies',
  'delta-9': 'gummies',
  'delta 8': 'gummies',
  'delta 9': 'gummies',
  'hemp': 'cbd',
  'gummies': 'gummies',

  // THCA & hemp flower
  'thca': 'thca',
  'thca prerolls': 'thca',
  'thca flower': 'thca-flower',
  'flower': 'thca-flower',

  // Kratom
  'kratom': 'kratom',
  '7oh kratom tablets': 'kratom',
  'kratom shots': 'kratom',
  'kratom extracts': 'kratom',

  // Hookah
  'hookah': 'hookah',
  'shisha': 'hookah',

  // Tobacco
  'tobacco': 'tobacco',
  'cigars': 'tobacco',
  'cigarettes': 'tobacco',
  'zyn': 'tobacco',

  // Papers and wraps
  'wraps': 'prerolls',
  'papers': 'prerolls',
  'cones': 'prerolls',

  // Misc storefront groupings seen in Clover exports
  'enhancement': 'accessories',
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
