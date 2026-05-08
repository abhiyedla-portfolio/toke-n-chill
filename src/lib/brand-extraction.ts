/**
 * Brand extraction from Clover item names.
 *
 * Clover has no real brand field — everything synced so far landed as "House Brand".
 * This module maps known name-prefixes → normalized brand names.
 *
 * ORDERING IS CRITICAL: more-specific prefixes must appear BEFORE shorter ones
 * that would otherwise match them first (e.g. "Smokah" before "Smok").
 *
 * To add a new brand: append a tuple at the appropriate place.
 * To re-run the backfill: `npx tsx scripts/backfill-brands.ts`
 */

// [prefix (matched case-insensitively), normalized brand name]
const BRAND_MAP: ReadonlyArray<readonly [string, string]> = [

  // ── Hookah tobaccos ────────────────────────────────────────────────────────
  ['Diamond Dust Al Fakher', 'Al Fakher'],   // "Diamond Dust Al Fakher" product
  ['AL Fakher',              'Al Fakher'],
  ['Al Fakher',              'Al Fakher'],
  ['AL Fakhercgum',          'Al Fakher'],   // typo variant in DB
  ['Adalya',                 'Adalya'],
  ['Afzal',                  'Afzal'],
  ['Avalon',                 'Avalon'],
  ['Coco Nara',              'Coco Nara'],
  ['Fumari',                 'Fumari'],
  ['Hookalit',               'Hookalit'],
  ['Mazaya',                 'Mazaya'],
  ['Starbuzz',               'Starbuzz'],

  // ── Cigarettes / cigars / tobacco / nicotine ───────────────────────────────
  ['Natural American Spirit', 'American Spirit'],  // must be before 'American Spirit'
  ['American Spirit',         'American Spirit'],
  ['Marlboro',                'Marlboro'],
  ['Camel',                   'Camel'],
  ['Newport',                 'Newport'],
  ['Parliament',              'Parliament'],
  ['ZYN',                     'ZYN'],
  ['Juul',                    'JUUL'],
  ['Djarum',                  'Djarum'],
  ['Cohiba',                  'Cohiba'],
  ['Macanudo',                'Macanudo'],
  ['Montecristo',             'Montecristo'],
  ['Romeo Y Julieta',         'Romeo Y Julieta'],
  ['La Gloria Cubana',        'La Gloria Cubana'],
  ['Partagas',                'Partagas'],
  ['A Fuente',                'Arturo Fuente'],
  ['Bugler',                  'Bugler'],
  ['Capri',                   'Capri'],
  ['Deadwood',                'Deadwood'],
  ['Cao ',                    'CAO'],         // trailing space avoids false positives
  ['Kuba Kuba',               'Kuba Kuba'],
  ['Nub ',                    'Nub'],
  ['Punch ',                  'Punch'],
  ['Papas Fritas',            'Papas Fritas'],
  ['Flathead',                'Flathead'],
  ['Swisher Sweets',          'Swisher Sweets'],
  ['Backwoods',               'Backwoods'],
  ['Packwraps',               'Packwraps'],
  ['Camo Wraps',              'Camo Wraps'],
  ['Grabba Leaf',             'Grabba Leaf'],
  ['Fronto Leafmaster',       'Fronto Leafmaster'],

  // ── Disposable vapes ────────────────────────────────────────────────────────
  // Geek family — longest prefix first
  ['Geek  Pulse',  'Geek Bar'],    // double-space typo in DB ("Geek  Pulse X  25k...")
  ['Geek Bar',     'Geek Bar'],
  ['Geek Pulse',   'Geek Bar'],
  ['Geek X Lite',  'Geek Bar'],
  ['Geek Vape',    'Geek Vape'],

  ['Lost Mary',    'Lost Mary'],
  ['Fifty Bar',    'Fifty Bar'],

  // Foger/Fogger family — most specific first
  ['Fogger-X',     'Fogger-X'],
  ['Fogger-',      'Fogger-X'],
  ['Fogger',       'Foger'],       // normalise "Fogger" → "Foger" (same brand)
  ['Foger',        'Foger'],

  ['Beast',        'Beast'],
  ['Breeze Smoke', 'Breeze Smoke'],
  ['Cali Ul',      'Cali UL'],
  ['Chillax',      'Chillax'],
  ['Extre Bar',    'Extre Bar'],
  ['One Tank',     'One Tank'],
  ['Salt Bae',     'Salt Bae'],
  ['Olive Bar',    'Olive Bar'],
  ['Nova Bar',     'Nova Bar'],
  ['Balance Bar',  'Balance Bar'],
  ['Nimmbox',      'Nimmbox'],
  ['Thunder',      'Thunder'],
  ['Woodstock',    'Woodstock'],
  ['Looper',       'Looper'],

  // ── E-liquids ────────────────────────────────────────────────────────────────
  ['Coadtal Clouds',  'Coastal Clouds'],   // typo variant
  ['Coastal Clouds',  'Coastal Clouds'],
  ['Georgie Porgie',  'Georgie Porgie'],
  ['Pod Juice',       'Pod Juice'],
  ['Pacha',           'Pacha'],

  // ── Kratom / kava / botanicals ─────────────────────────────────────────────
  ['Blue Magic',    'Blue Magic'],
  ['Earth Kratom',  'Earth Kratom'],
  ['GRH Kratom',    'GRH Kratom'],
  ['Magic Trip',    'Magic Trip'],
  ['NUMBZ',         'Numbz'],
  ['Numbz',         'Numbz'],
  ['OPIA',          'Opia'],
  ['Opia',          'Opia'],
  ["Press'd",       "Press'd"],
  ['Pressd',        "Press'd"],
  ['Third Eye',     'Third Eye'],
  ['Rapture',       'Rapture'],
  ['Kanva',         'Kanva'],
  ['Mit 45',        'MIT 45'],
  ['Big Mit',       'Big Mit'],
  ['Feel Free',     'Feel Free'],

  // ── THCA / prerolls ───────────────────────────────────────────────────────
  ['Black Market',      'Black Market'],    // covers "Black Markets" too
  ['Fly Trip',          'Fly Trip'],        // must be before bare 'Fly'
  ['Flying Monkey',     'Flying Monkey'],
  ['Half Baked',        'Half Baked'],
  ['Hidden Hills',      'Hidden Hills'],
  ['LIT!',              'LIT!'],
  ['Lil Hash Homies',   'Lil Hash Homies'],
  ['Narco',             'Narco'],
  ['Snow Cones',        'Snow Cones'],
  ['The Dope Company',  'The Dope Company'],
  ['Wild Cat',          'Wild Cat'],
  ['Zour Stash',        'Zour Stash'],
  ['Mamba',             'Mamba'],

  // ── THCA flower ──────────────────────────────────────────────────────────
  ['Wildwood',    'Wildwood'],
  ['Wyatt Purp',  'Wyatt Purp'],
  ['Budda',       'Budda'],

  // ── Gummies / edibles ────────────────────────────────────────────────────
  ['Affinity',         'Affinity'],
  ['Cycling Frog',     'Cycling Frog'],
  ['Double Stacked',   'Double Stacked'],
  ['Fly High Urb',     'URB'],             // must be before 'Fly Trip'
  ["Half Bak'd",       "Half Bak'd"],
  ['Hometown Hero',    'Hometown Hero'],
  ['Hometowm Hero',    'Hometown Hero'],   // typo variant
  ['Home Town Hero',   'Hometown Hero'],
  ['Just CBD',         'Just CBD'],
  ['Just Cbd',         'Just CBD'],
  ['Microdosed Blend', 'Microdosed Blend'],
  ["Minds Eye",        "Mind's Eye"],
  ['Road Trip',        'Road Trip'],
  ['Space Gods',       'Space Gods'],
  ['Stoned mushroom',  'Stoned Mushroom'],
  ['Stoned Mushroom',  'Stoned Mushroom'],
  // "TH Mushrooms" line — explicit prefixes to avoid collisions
  ['TH Blue',          'TH Mushrooms'],
  ['TH Juicy',         'TH Mushrooms'],
  ['TH Sour',          'TH Mushrooms'],
  ['TH Strawberry',    'TH Mushrooms'],
  ['TH watermelon',    'TH Mushrooms'],
  ['TH Water',         'TH Mushrooms'],
  ['Wonder Mushroom',  'Wonder Mushroom'],
  ['Wunder',           'Wunder'],
  ['Sivan',            'Sivan'],

  // ── Accessories & general merchandise ────────────────────────────────────
  ['Aleaf',             'Aleaf'],
  ['Amigos',            'Amigos'],
  ['Bic',               'Bic'],
  ['Blazy Suzan',       'Blazy Susan'],    // correct spelling is "Susan"
  ['BREZ',              'Brez'],
  ['Brez',              'Brez'],
  ['Buddah',            'Buddah'],
  ['Cann ',             'Cann'],
  ['Cantrip',           'Cantrip'],
  ['Earlybird',         'Earlybird'],
  ['Elements ',         'Elements'],
  ['Happie',            'Happie'],
  ['Hier Boy',          'Hi Boy'],          // spelling variant
  ['Hi Boy',            'Hi Boy'],
  ['Kaviva',            'Kaviva'],
  ['Magnum',            'Magnum'],
  ['Maven',             'Maven'],
  ['Mentos',            'Mentos'],
  ['New Brew',          'New Brew'],
  ['NYB',               'NYB'],
  ['Raw',               'Raw'],
  ['Red Bull',          'Red Bull'],
  // SMOK family — Smokah & Smokebuddy MUST be before "Smok"
  ['Smokah',            'Smokah'],
  ['Smokebuddy',        'Smokebuddy'],
  ['SmokeBuddy',        'Smokebuddy'],
  ['Smok',              'SMOK'],
  ['Somk',              'SMOK'],           // "Somk Novo 2x" typo in DB
  ['Special Blue',      'Special Blue'],
  ['Stinger Detox',     'Stinger Detox'],
  ['Susans Own',        "Susan's Own"],
  ['Tejas',             'Tejas'],
  ['Torch',             'Torch'],
  ['Trojan',            'Trojan'],
  ['Truweigh',          'Truweigh'],
  ['Uchie',             'Uchie'],
  ['Vaporesso',         'Vaporesso'],
  ['Doodle',            'Doodle'],
  ['Novo ',             'SMOK'],           // "Novo 2x Pod" — SMOK hardware
  ['Geek Vape J',       'Geek Vape'],
  ['Just Cbd',          'Just CBD'],
  ['Hometown Hero',     'Hometown Hero'],

  // ── Beverages / consumables ────────────────────────────────────────────────
  ['Coca-cola',  'Coca-Cola'],
  ['Red Bull',   'Red Bull'],
  ['Dr Pepper',  'Dr Pepper'],
  ['Mentos',     'Mentos'],

  // ── Lighters & fuels ────────────────────────────────────────────────────────
  ['Zippo',      'Zippo'],
  ['Ronsonol',   'Ronsonol'],

  // ── Rolling papers / wraps ──────────────────────────────────────────────────
  ['Zig Zag',    'Zig Zag'],
  ["Randy's",    "Randy's"],

  // ── Humidity / storage ───────────────────────────────────────────────────────
  ['Boveda',     'Boveda'],

  // ── Health / wellness / novelty ──────────────────────────────────────────────
  ['Visine',     'Visine'],
  ['Chore Boy',  'Chore Boy'],
  ['Quick Fix',  'Quick Fix'],
  ['Royal Honey','Royal Honey'],
  ['Royal Vip Honey', 'Royal Honey'],
  ['Sweet Jane', 'Sweet Jane'],
  ['Poseidon',   'Poseidon'],
  ['Labubu',     'Labubu'],
];

/**
 * Extract brand from a Clover item name.
 * Returns the normalized brand string, or null if no known brand matches.
 * Callers can fall back to 'House Brand' or any other default.
 */
export function extractBrandFromName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const [prefix, brand] of BRAND_MAP) {
    if (lower.startsWith(prefix.toLowerCase())) {
      return brand;
    }
  }
  return null;
}

/**
 * All known normalized brand names, deduplicated and sorted.
 * Useful for populating filter dropdowns or seeding reference data.
 */
export const KNOWN_BRANDS: ReadonlyArray<string> = Array.from(
  new Set(BRAND_MAP.map(([, brand]) => brand)),
).sort((a, b) => a.localeCompare(b));
