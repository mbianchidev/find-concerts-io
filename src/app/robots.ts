import type { MetadataRoute } from 'next';
import { appOrigin } from '@/server/config';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account', '/import', '/saved', '/privacy'],
    },
    sitemap: `${appOrigin()}/sitemap.xml`,
  };
}
