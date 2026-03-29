import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/age-verify'],
    },
    sitemap: 'https://tokeandchill.com/sitemap.xml',
  };
}
