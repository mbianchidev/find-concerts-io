import type { MetadataRoute } from 'next';
import { appOrigin } from '@/server/config';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin();
  return [
    ...['', '/artists', '/venues', '/tours', '/sources'].map((path) => ({
      url: `${origin}${path}/`,
      changeFrequency: 'daily' as const,
    })),
    ...getStore()
      .events(null)
      .map((event) => ({
        url: `${origin}/events/${encodeURIComponent(event.id)}/`,
        lastModified: event.source.fetched_at,
        changeFrequency: 'daily' as const,
      })),
  ];
}
