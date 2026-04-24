# Toke n Chill

Next.js storefront with live Clover inventory, Cloudflare D1 product metadata, and Cloudflare Workers deployment via OpenNext.

## What Changed

- Product prices are no longer shown in the live catalog UI.
- The public catalog now lives at `src/app/api/catalog/route.ts` instead of a Pages Functions sidecar.
- Product pages and detail routes now run as a real Next.js app on Cloudflare Workers, so `/products/[category]/[slug]` can resolve live Clover items that were not present at build time.
- Durable product metadata is stored in Cloudflare D1 using `cloudflare/d1/001_catalog.sql`.
- A one-time D1 seed/import script now exists at `scripts/seed-d1-from-inventory.cjs`.
- Browser-side catalog caching still happens through `src/components/CatalogProvider/CatalogProvider.tsx`, but the server render and the client refresh now share the same catalog source.

## Runtime Architecture

1. Next.js renders pages from the app router.
2. OpenNext converts the build output into a Cloudflare Worker bundle.
3. The Worker serves dynamic routes and the `/api/catalog` route.
4. The server-side catalog loader in `src/lib/server/public-catalog.ts`:
   - fetches Clover inventory,
   - reads D1 metadata when the `CATALOG_DB` binding is available,
   - merges them,
   - strips prices from the public payload.
5. The client-side `CatalogProvider` caches the sanitized catalog in `localStorage` and refreshes it in the background.

## Local Commands

```bash
npm run build
npm run preview
npm run deploy
npm run catalog:seed
```

## Cloudflare Worker Setup

### 1. Create the D1 database

Run the schema in:

```bash
cloudflare/d1/001_catalog.sql
```

### 2. Add the D1 binding to Wrangler

`wrangler.jsonc` already contains the Worker/OpenNext configuration. After creating the database, add this block back under the top-level config:

```jsonc
"d1_databases": [
  {
    "binding": "CATALOG_DB",
    "database_name": "your-database-name",
    "database_id": "your-database-uuid"
  }
]
```

### 3. Add environment variables and secrets in Cloudflare

Set these in your Worker/Pages project:

- `NEXT_PUBLIC_BRAND` set to `toke-and-chill` or `dizzy-dose`
- `CLOVER_API_BASE_URL` optional, defaults to `https://api.clover.com/v3`
- `CLOVER_CACHE_TTL` optional, defaults to `300`
- brand-specific Clover credentials:

- `CLOVER_MERCHANT_ID_TOKE`
- `CLOVER_API_TOKEN_TOKE`
- `CLOVER_MERCHANT_ID_DIZZY`
- `CLOVER_API_TOKEN_DIZZY`

If you only use one Clover merchant today, you can still populate both brand-specific pairs with the same merchant ID and token until the second store is ready.

### 4. Seed D1 from the current inventory TS file

Generate the SQL file:

```bash
npm run catalog:seed
```

This writes:

```bash
cloudflare/d1/seed-product-metadata.sql
```

Then import it into D1:

```bash
node scripts/seed-d1-from-inventory.cjs --execute --remote --database <your-database-name>
```

If you prefer, you can also import the generated SQL file manually with Wrangler:

```bash
npx wrangler d1 execute <your-database-name> --file cloudflare/d1/seed-product-metadata.sql --remote
```

## D1 Metadata Table

The `product_metadata` table stores site-facing overrides such as:

- `slug`
- `clover_id`
- `name`
- `brand`
- `category`
- `description`
- `image`
- `variants_json`
- `featured`
- `new_arrival`
- `sort_order`
- `is_active`
- `hide_from_catalog`

If `clover_id` is not filled yet, the catalog loader falls back to matching by `slug`.

## Dynamic Product Pages

`src/app/products/[category]/[slug]/page.tsx` no longer depends on `generateStaticParams()` from the inventory seed file. That means:

- known routes can still be cached and served efficiently,
- new Clover product slugs are no longer blocked by static export,
- product detail pages can render on demand in the Worker runtime.

## Caching

- Static assets are cached via `public/_headers`.
- `/api/catalog` returns:

```text
Cache-Control: public, max-age=60, s-maxage=120, stale-while-revalidate=600
```

- The browser stores only sanitized public catalog data in `localStorage`.
- No Clover token or product pricing is stored in the browser cache.

## Fallback Behavior

- If D1 is not bound yet, the app still works using Clover plus the build-time fallback catalog.
- If Clover is unavailable, the server falls back to D1 metadata only.
- If both live sources are unavailable, the browser falls back to the build-time static catalog.

## Verification

```bash
./node_modules/.bin/tsc --noEmit
npm run build
npx opennextjs-cloudflare build
```
