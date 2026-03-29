export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPriceRange(minCents: number, maxCents: number): string {
  if (minCents === maxCents) return formatPrice(minCents);
  return `${formatPrice(minCents)} – ${formatPrice(maxCents)}`;
}
