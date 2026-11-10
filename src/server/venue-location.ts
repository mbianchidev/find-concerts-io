import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Event, Venue, VenueCoordinates } from '@/types';
import { artistKey, venueKey } from '@/lib/concerts';
import { getVenueCoordinates } from '@/lib/maps';
import { venueCoordinatesSchema } from '@/lib/schema';
import { AppError } from './errors';
import { APP_USER_AGENT, readLimitedBody } from './http';
import { logger } from './logger';
import type { ConcertStore } from './store';

const DEFAULT_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const DAY = 86400000;
const cacheSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('resolved'), point: venueCoordinatesSchema }),
  z.object({
    status: z.literal('missing'),
    reason: z.enum(['not-found', 'ambiguous']),
  }),
]);
const placeSchema = z.object({
  lat: z.string().max(80),
  lon: z.string().max(80),
  name: z.string().max(2000).nullish(),
  display_name: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  class: z.string().max(100).optional(),
  namedetails: z.record(z.string(), z.string().max(2000).nullable()).optional(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      municipality: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
    })
    .optional(),
});

function normalized(value: string): string {
  return artistKey(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/^the\s+/, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function matchingPlace(
  place: z.infer<typeof placeSchema>,
  venue: Venue
): boolean {
  const category = (place.category || place.class || '').trim().toLowerCase();
  if (
    ![
      'amenity',
      'leisure',
      'tourism',
      'building',
      'shop',
      'historic',
      'office',
      'craft',
      'man_made',
    ].includes(category)
  )
    return false;
  const expected = new Set([normalized(venue.name)]);
  const name = artistKey(venue.name);
  const suffix = ` ${artistKey(venue.city)}`;
  if (name.endsWith(suffix))
    expected.add(normalized(name.slice(0, -suffix.length)));
  const names = [
    place.name,
    place.display_name?.split(',')[0],
    ...Object.entries(place.namedetails || {})
      .filter(
        ([key]) =>
          key === 'name' ||
          key.startsWith('name:') ||
          ['official_name', 'short_name', 'alt_name'].includes(key)
      )
      .map(([, value]) => value),
  ].flatMap((value) => value?.split(';') || []);
  const address = place.address;
  return (
    names.some((value) => expected.has(normalized(value))) &&
    [
      address?.city,
      address?.town,
      address?.village,
      address?.municipality,
    ].some((value) => value && normalized(value) === normalized(venue.city)) &&
    [address?.country, address?.country_code].some(
      (value) => value && normalized(value) === normalized(venue.country)
    )
  );
}

function missingLocation(reason: 'not-found' | 'ambiguous'): AppError {
  return new AppError(
    422,
    reason === 'ambiguous'
      ? 'VENUE_LOCATION_AMBIGUOUS'
      : 'VENUE_LOCATION_NOT_FOUND',
    reason === 'ambiguous'
      ? 'Several places match this venue. Search OpenStreetMap to choose the right one.'
      : 'A venue location could not be verified. Search OpenStreetMap to choose a match.'
  );
}

function configuredEndpoint(value: string): URL {
  if (!value)
    throw new AppError(
      503,
      'VENUE_LOOKUP_DISABLED',
      'Venue lookups are disabled on this server. You can still search OpenStreetMap.'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError(
      500,
      'INVALID_GEOCODER_CONFIGURATION',
      'NOMINATIM_ENDPOINT must be a Nominatim-compatible search URL.'
    );
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new AppError(
      500,
      'INVALID_GEOCODER_CONFIGURATION',
      'Use an HTTPS geocoder URL, or HTTP localhost, without embedded credentials or a fragment.'
    );
  return url;
}

export async function resolveVenueLocation(
  event: Event,
  store: ConcertStore,
  fetcher: typeof fetch = fetch,
  endpointValue = process.env.NOMINATIM_ENDPOINT ?? DEFAULT_ENDPOINT
): Promise<VenueCoordinates> {
  if (event.is_private)
    throw new AppError(
      403,
      'PRIVATE_MAP_DISABLED',
      'Private import locations are not sent to map services.'
    );
  const existing = getVenueCoordinates(event.venue);
  if (existing) return existing;
  const venue = event.venue;
  if (
    ![venue.name, venue.city, venue.country].every((value) => normalized(value))
  )
    throw new AppError(
      422,
      'VENUE_LOCATION_INCOMPLETE',
      'The listing needs a venue name, city, and country for a verified map lookup.'
    );
  const query = [venue.name, venue.city, venue.country]
    .map((value) => value.trim())
    .join(', ');
  if (query.length > 500)
    throw new AppError(
      422,
      'VENUE_LOCATION_INCOMPLETE',
      'The venue location is too long to look up. Use OpenStreetMap search instead.'
    );
  const endpoint = configuredEndpoint(endpointValue);
  const fingerprint = (value: string) =>
    createHash('sha256').update(value).digest('hex').slice(0, 16);
  const cacheKey = `venue-location:${fingerprint(endpoint.href)}:${venueKey(venue)}`;
  const rateKey = `venue-geocoder:${fingerprint(endpoint.origin)}`;
  const cached = store.db
    .prepare('SELECT payload FROM cache WHERE key = ? AND expires_at > ?')
    .get(cacheKey, Date.now());
  if (cached) {
    let value: unknown;
    try {
      value = JSON.parse(String(cached.payload));
    } catch {
      logger.error(
        { service: 'venue-location' },
        'Venue location cache is not valid JSON'
      );
      throw new AppError(
        500,
        'INVALID_VENUE_LOCATION_CACHE',
        'The stored venue location could not be read. Check the server logs.'
      );
    }
    const parsed = cacheSchema.safeParse(value);
    if (!parsed.success) {
      logger.error(
        { service: 'venue-location' },
        'Venue location cache has an invalid shape'
      );
      throw new AppError(
        500,
        'INVALID_VENUE_LOCATION_CACHE',
        'The stored venue location could not be read. Check the server logs.'
      );
    }
    if (parsed.data.status === 'missing')
      throw missingLocation(parsed.data.reason);
    return parsed.data.point;
  }

  store.rateLimit(rateKey, 1, 1000);
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('limit', '5');
  endpoint.searchParams.set('addressdetails', '1');
  endpoint.searchParams.set('namedetails', '1');
  endpoint.searchParams.set('dedupe', '1');
  let response: Response;
  try {
    response = await fetcher(endpoint.href, {
      headers: {
        'User-Agent': APP_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    logger.error(
      {
        provider: endpoint.hostname,
        error: error instanceof Error ? error.name : 'NetworkError',
      },
      'Venue map provider could not be reached'
    );
    throw new AppError(
      502,
      'VENUE_PROVIDER_UNREACHABLE',
      'The venue lookup service could not be reached. Try again or search OpenStreetMap.'
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) {
      const retry = response.headers.get('retry-after') || '';
      const delay = /^\d+$/.test(retry)
        ? Number(retry) * 1000
        : Date.parse(retry) - Date.now();
      const until =
        Date.now() +
        (Number.isFinite(delay) && delay > 0 ? Math.max(1000, delay) : 60000);
      store.db
        .prepare('UPDATE rate_limits SET reset_at = ? WHERE key = ?')
        .run(Number.isSafeInteger(until) ? until : Date.now() + 60000, rateKey);
    }
    throw new AppError(
      response.status === 429 ? 503 : 502,
      'VENUE_PROVIDER_REJECTED',
      `The venue lookup service returned HTTP ${response.status}. Try again later or search OpenStreetMap.`
    );
  }
  const bytes = await readLimitedBody(
    response.body,
    256 * 1024,
    new AppError(
      502,
      'VENUE_PROVIDER_TOO_LARGE',
      'The venue lookup response exceeded its size limit.'
    )
  );
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new AppError(
      502,
      'INVALID_VENUE_PROVIDER_RESPONSE',
      'The venue lookup service did not return valid JSON.'
    );
  }
  const parsed = z.array(placeSchema).max(5).safeParse(value);
  if (!parsed.success)
    throw new AppError(
      502,
      'INVALID_VENUE_PROVIDER_RESPONSE',
      'The venue lookup service returned unsupported location data.'
    );
  const points = new Map<string, VenueCoordinates>();
  for (const place of parsed.data) {
    if (!matchingPlace(place, venue)) continue;
    const point = getVenueCoordinates({
      latitude: place.lat,
      longitude: place.lon,
    });
    if (point) points.set(`${point.latitude},${point.longitude}`, point);
  }
  const point = points.size === 1 ? [...points.values()][0] : undefined;
  const reason = points.size > 1 ? 'ambiguous' : 'not-found';
  const result = point
    ? { status: 'resolved', point }
    : { status: 'missing', reason };
  store.db
    .prepare(
      'INSERT OR REPLACE INTO cache (key, payload, expires_at) VALUES (?, ?, ?)'
    )
    .run(
      cacheKey,
      JSON.stringify(result),
      Date.now() + (point ? 30 * DAY : DAY)
    );
  if (!point) throw missingLocation(reason);
  return point;
}
