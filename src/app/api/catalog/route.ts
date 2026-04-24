import { getPublicCatalog } from '@/lib/server/public-catalog';

async function createEtag(payload: string) {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
  return `"${hash}"`;
}

export async function GET(request: Request) {
  const catalog = await getPublicCatalog();
  const body = JSON.stringify(catalog);
  const etag = await createEtag(body);
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
