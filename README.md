# Toke n Chill

Next.js storefront deployed to Cloudflare Workers with OpenNext.

## Current Catalog Model

- Clover is the source of truth for products and inventory.
- A background sync writes the Clover catalog into Cloudflare D1.
- The storefront reads only from D1.
- Public catalog responses never include prices.
- The browser caches only the sanitized `/api/catalog` payload.

## Runtime Flow

1. Cloudflare Cron triggers the custom worker in [custom-worker.ts](/Users/abhinavyedla/Desktop/Code/toke-n-chill/custom-worker.ts).
2. The scheduled job runs [src/lib/server/clover-sync.ts](/Users/abhinavyedla/Desktop/Code/toke-n-chill/src/lib/server/clover-sync.ts) and upserts Clover inventory into `product_metadata`.
3. The public API in [src/app/api/catalog/route.ts](/Users/abhinavyedla/Desktop/Code/toke-n-chill/src/app/api/catalog/route.ts) reads the synced D1 snapshot from [src/lib/server/public-catalog.ts](/Users/abhinavyedla/Desktop/Code/toke-n-chill/src/lib/server/public-catalog.ts).
4. The browser caches that sanitized response through [src/components/CatalogProvider/CatalogProvider.tsx](/Users/abhinavyedla/Desktop/Code/toke-n-chill/src/components/CatalogProvider/CatalogProvider.tsx).

## Commands

```bash
npm run build
npm run preview
npm run deploy
npm run catalog:seed
```

`npm run catalog:seed` is now optional legacy tooling. The live catalog no longer depends on a seeded TS product list.

## Cloudflare Setup

### 1. Create D1

Pick a name like `toke-n-chill-catalog`:

```bash
npx wrangler d1 create toke-n-chill-catalog
```

### 2. Add the D1 binding

Update [wrangler.jsonc](/Users/abhinavyedla/Desktop/Code/toke-n-chill/wrangler.jsonc) with the real D1 binding:

```jsonc
"d1_databases": [
  {
    "binding": "CATALOG_DB",
    "database_name": "toke-n-chill-catalog",
    "database_id": "your-database-uuid"
  }
]
```

### 3. Run the schema

Fresh database:

```bash
npx wrangler d1 execute toke-n-chill-catalog --file cloudflare/d1/001_catalog.sql --remote
```

If you already created the earlier schema before the Clover sync refactor, also run:

```bash
npx wrangler d1 execute toke-n-chill-catalog --file cloudflare/d1/002_clover_sync_snapshot.sql --remote
```

### 4. Configure secrets and env vars

Set these in Cloudflare:

- `NEXT_PUBLIC_BRAND=toke-and-chill` or `dizzy-dose`
- `CLOVER_MERCHANT_ID_TOKE`
- `CLOVER_API_TOKEN_TOKE`
- `CLOVER_MERCHANT_ID_DIZZY`
- `CLOVER_API_TOKEN_DIZZY`
- `CLOVER_SYNC_SECRET`
- optional `CLOVER_API_BASE_URL`
- optional `CLOVER_CACHE_TTL`

If you only have one Clover merchant right now, it is fine to populate both brand-specific credential pairs with the same merchant ID and token until the second store is ready.

### 5. Deploy

```bash
npm run deploy
```

### 6. Trigger the first sync manually

Cron will keep the database fresh every 10 minutes, but you should trigger the first sync immediately after deploy:

```bash
curl -X POST https://your-domain.com/api/admin/clover-sync \
  -H "Authorization: Bearer $CLOVER_SYNC_SECRET"
```

### 7. Verify the public catalog

```bash
curl -sS https://your-domain.com/api/catalog
```

You should see:

- products sourced from Clover-backed D1 rows
- `inStock` and `stockQuantity`
- no `price` field

## Optional Legacy Metadata Import

If you want to preserve legacy slugs, images, featured flags, or sort order from the old TS catalog, you can still generate and import the one-time seed:

```bash
npm run catalog:seed
npx wrangler d1 execute toke-n-chill-catalog --file cloudflare/d1/seed-product-metadata.sql --remote
```

That import is optional now. Unmatched seeded rows are not shown publicly unless Clover sync links them to a real Clover item.

## Caching

- Static assets are cached via [public/_headers](/Users/abhinavyedla/Desktop/Code/toke-n-chill/public/_headers).
- `/api/catalog` returns `ETag` plus:

```text
Cache-Control: public, max-age=60, s-maxage=120, stale-while-revalidate=600
```

- The browser caches only the sanitized public catalog payload in `localStorage`.
- Clover credentials and raw prices never reach the browser.

## Verification

```bash
./node_modules/.bin/tsc --noEmit
npm run build
npx opennextjs-cloudflare build
```
