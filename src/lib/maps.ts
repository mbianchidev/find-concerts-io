import type { Venue, VenueCoordinates } from '@/types';

export const OPENSTREETMAP_ORIGIN = 'https://www.openstreetmap.org';
export const MAP_LATITUDE_LIMIT = 85.0511287798066;

function validCoordinates(point: VenueCoordinates): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= MAP_LATITUDE_LIMIT &&
    Math.abs(point.longitude) <= 180
  );
}

export function getVenueCoordinates(
  venue: Pick<Venue, 'latitude' | 'longitude'>
): VenueCoordinates | undefined {
  const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (
    !decimal.test(venue.latitude.trim()) ||
    !decimal.test(venue.longitude.trim())
  )
    return undefined;
  const point = {
    latitude: Number(venue.latitude),
    longitude: Number(venue.longitude),
  };
  return validCoordinates(point) ? point : undefined;
}

export function venueMapUrls(point: VenueCoordinates) {
  if (!validCoordinates(point))
    throw new RangeError('The venue coordinates are outside the map range.');
  const latitudePadding = 0.006;
  const longitudePadding =
    latitudePadding / Math.cos((point.latitude * Math.PI) / 180);
  const bounds = [
    Math.max(-180, point.longitude - longitudePadding),
    Math.max(-MAP_LATITUDE_LIMIT, point.latitude - latitudePadding),
    Math.min(180, point.longitude + longitudePadding),
    Math.min(MAP_LATITUDE_LIMIT, point.latitude + latitudePadding),
  ];
  const embed = new URL('/export/embed.html', OPENSTREETMAP_ORIGIN);
  embed.search = new URLSearchParams({
    bbox: bounds.join(','),
    layer: 'mapnik',
    marker: `${point.latitude},${point.longitude}`,
  }).toString();
  const external = new URL('/', OPENSTREETMAP_ORIGIN);
  external.search = new URLSearchParams({
    mlat: String(point.latitude),
    mlon: String(point.longitude),
  }).toString();
  external.hash = `map=16/${point.latitude}/${point.longitude}`;
  return { embed: embed.href, external: external.href };
}

export function venueSearchUrl(
  venue: Pick<Venue, 'name' | 'city' | 'country'>
): string {
  const query = [venue.name, venue.city, venue.country]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');
  const url = new URL(query ? '/search' : '/', OPENSTREETMAP_ORIGIN);
  if (query) url.searchParams.set('query', query);
  return url.href;
}
