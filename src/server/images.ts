import { load } from 'cheerio';
import type { Event, VenueData } from '@/types';
import { artistKey, venueKey } from '@/lib/concerts';
import sources from '@/lib/image-sources.json';
import { logger } from './logger';

export interface PagePhoto {
  image_url?: string;
  image_kind?: Event['image_kind'];
  venue_url?: string;
}

export function trustedPhotoPageUrl(value: string): boolean {
  if (!URL.canParse(value) || value.length > 2048) return false;
  const url = new URL(value);
  return (
    !url.username && !url.password && sources.pageOrigins.includes(url.origin)
  );
}

export function supportedImage(
  value: unknown,
  base: string
): string | undefined {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().startsWith('#') ||
    value.length > 2048 ||
    !URL.canParse(value, base)
  )
    return undefined;
  const url = new URL(value, base);
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !sources.imageHosts.includes(url.hostname) ||
    /\.svg$/i.test(url.pathname) ||
    /(?:^|[\/_.-])(?:logo|placeholder|spacer|pixel|favicon|profilbild2_16)(?:[\/_.-]|$)/i.test(
      url.pathname
    )
  )
    return undefined;
  return url.href;
}

function imageValues(value: unknown, depth = 0): unknown[] {
  if (depth > 5 || !value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value))
    return value.flatMap((item) => imageValues(item, depth + 1));
  if (typeof value !== 'object') return [];
  return ['url', 'contentUrl', '@id'].flatMap((key) =>
    imageValues(Reflect.get(value, key), depth + 1)
  );
}

function responsiveImages(value = ''): string[] {
  return [...value.matchAll(/(\S+)\s+(\d+(?:\.\d+)?)[wx](?:\s*,|$)/g)]
    .sort((a, b) => Number(b[2]) - Number(a[2]))
    .map((match) => match[1]);
}

export function extractPagePhoto(html: string, url: string): PagePhoto {
  const $ = load(html);
  const eventImages: unknown[] = [];
  const artistImages: unknown[] = [];
  const venueImages: unknown[] = [];
  const inspect = (value: unknown, depth = 0) => {
    if (depth > 10 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => inspect(item, depth + 1));
      return;
    }
    const types = [Reflect.get(value, '@type')].flat();
    if (
      types.some((type) =>
        ['Event', 'MusicEvent', 'EventSeries'].includes(type)
      )
    ) {
      eventImages.push(...imageValues(Reflect.get(value, 'image')));
      const performers = [Reflect.get(value, 'performer')].flat();
      for (const performer of performers) {
        if (performer && typeof performer === 'object')
          artistImages.push(...imageValues(Reflect.get(performer, 'image')));
      }
      const location = Reflect.get(value, 'location');
      if (location && typeof location === 'object')
        venueImages.push(...imageValues(Reflect.get(location, 'image')));
    } else if (types.includes('MusicGroup')) {
      artistImages.push(...imageValues(Reflect.get(value, 'image')));
    } else if (types.some((type) => ['MusicVenue', 'Place'].includes(type))) {
      venueImages.push(...imageValues(Reflect.get(value, 'image')));
    }
    inspect(Reflect.get(value, '@graph'), depth + 1);
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      inspect(JSON.parse($(element).text()));
    } catch (error) {
      logger.warn(
        { url, error: error instanceof Error ? error.name : 'ParseError' },
        'Invalid public image JSON-LD block'
      );
    }
  });
  const markupImages = (selector: string) =>
    $(selector)
      .toArray()
      .flatMap((element) => {
        const node = $(element);
        if (
          (node.attr('width') && Number(node.attr('width')) <= 64) ||
          (node.attr('height') && Number(node.attr('height')) <= 64)
        )
          return [];
        return [
          node.attr('data-src'),
          node.attr('data-original'),
          node.attr('data-lazy-src'),
          ...responsiveImages(node.attr('data-srcset')),
          ...responsiveImages(node.attr('srcset')),
          node.attr('src'),
          /url\(['"]?([^'")]+)['"]?\)/i.exec(node.attr('style') || '')?.[1],
        ];
      });
  const candidates = [
    { values: eventImages, kind: 'event' },
    { values: artistImages, kind: 'artist' },
    {
      values: [
        ...markupImages(
          '.event-header-image img, .eventitem-column-content img'
        ),
        $('meta[property="og:image:secure_url"]').attr('content'),
        $('meta[property="og:image"]').attr('content'),
        $('meta[name="twitter:image"], meta[property="twitter:image"]').attr(
          'content'
        ),
        ...markupImages(
          'article img, article source, main img, main source, .agendapunt img, article [style*="background-image"], main [style*="background-image"]'
        ),
      ],
      kind: 'event',
    },
    { values: venueImages, kind: 'venue' },
  ] as const;
  const photo = candidates
    .flatMap(({ values, kind }) =>
      values.map((value) => ({
        image_url: supportedImage(value, url),
        image_kind: kind,
      }))
    )
    .find((candidate) => candidate.image_url);
  const website = $('a')
    .toArray()
    .map((element) => $(element).text().trim())
    .find((value) => trustedPhotoPageUrl(value));
  return {
    ...(photo || {}),
    ...(website ? { venue_url: website } : {}),
  };
}

export async function enrichConcertImages(
  events: Event[],
  venues: VenueData[],
  readPhoto: (url: string) => Promise<PagePhoto | undefined>,
  knownEvents: Event[] = []
): Promise<Event[]> {
  const pages = new Map<string, Promise<PagePhoto | undefined>>();
  const read = (url?: string) => {
    if (!url || !trustedPhotoPageUrl(url)) return Promise.resolve(undefined);
    if (!pages.has(url)) pages.set(url, readPhoto(url));
    return pages.get(url)!;
  };
  const result = events.map((event) => ({ ...event }));
  const artists = new Map<string, string>();
  const rememberArtist = (event: Event) => {
    if (
      !event.is_private &&
      event.lineup[0] &&
      event.image_url &&
      event.image_kind !== 'venue'
    )
      artists.set(artistKey(event.lineup[0]), event.image_url);
  };
  knownEvents.forEach(rememberArtist);
  for (const event of result) {
    if (event.is_private) continue;
    if (!event.image_url || event.image_kind === 'venue') {
      const photo = await read(event.url);
      if (photo?.image_url) {
        event.image_url = photo.image_url;
        event.image_kind = photo.image_kind || 'event';
      }
    }
    rememberArtist(event);
  }
  const catalogue = new Map(venues.map((venue) => [venue.id, venue]));
  const venuePhotos = new Map<string, string | undefined>();
  for (const event of result) {
    if (event.is_private || (event.image_url && event.image_kind !== 'venue'))
      continue;
    const artistImage = artists.get(artistKey(event.lineup[0] || ''));
    if (artistImage) {
      event.image_url = artistImage;
      event.image_kind = 'artist';
      continue;
    }
    const key = venueKey(event.venue);
    if (!venuePhotos.has(key)) {
      const venue = catalogue.get(key);
      const profile = await read(venue?.source_url);
      const website = await read(venue?.url || profile?.venue_url);
      venuePhotos.set(key, website?.image_url || profile?.image_url);
    }
    const image = venuePhotos.get(key);
    if (image) {
      event.image_url = image;
      event.image_kind = 'venue';
    }
  }
  return result;
}
