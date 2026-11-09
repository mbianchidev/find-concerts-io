import type {
  Artist,
  Event,
  SavedItem,
  SearchFilters,
  Tour,
  Venue,
  VenueData,
} from '@/types';

export const GENRES = ['Metal', 'Hardcore punk', 'Rock', 'Punk'] as const;

export function artistKey(name: string): string {
  return name.trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

export function venueKey(venue: Venue): string {
  return [venue.name, venue.city, venue.country].map(artistKey).join('|');
}

export function isUpcoming(
  event: Event,
  today = new Date().toISOString().slice(0, 10)
) {
  return (
    event.status !== 'cancelled' &&
    event.status !== 'postponed' &&
    !!event.datetime &&
    new Date(event.end_datetime || event.datetime).toISOString().slice(0, 10) >=
      today
  );
}

export function filterEvents(
  events: Event[],
  filters: Pick<
    SearchFilters,
    'artist' | 'city' | 'location' | 'date' | 'genre'
  >
): Event[] {
  const contains = (value: string, query?: string) =>
    !query || value.toLowerCase().includes(query.trim().toLowerCase());

  return events.filter(
    (event) =>
      contains([event.title, ...event.lineup].join(' '), filters.artist) &&
      contains(
        [event.venue.name, event.venue.city, event.venue.country].join(' '),
        filters.location
      ) &&
      (!filters.city?.trim() ||
        artistKey(event.venue.city) === artistKey(filters.city)) &&
      contains(event.genres.join(' '), filters.genre) &&
      (!filters.date || event.datetime?.slice(0, 10) === filters.date)
  );
}

export function collectArtists(events: Event[]): Artist[] {
  const artists = new Map<string, Artist>();
  for (const event of events) {
    for (const name of new Set(event.lineup)) {
      const id = artistKey(name);
      const existing = artists.get(id);
      if (existing) {
        existing.upcoming_event_count += 1;
        existing.genres = [...new Set([...existing.genres, ...event.genres])];
      } else {
        artists.set(id, {
          id,
          name,
          genres: [...event.genres],
          image_url: event.image_url,
          upcoming_event_count: 1,
          url: event.url,
        });
      }
    }
  }
  return [...artists.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function collectVenues(
  events: Event[],
  catalogue: VenueData[] = []
): VenueData[] {
  const venues = new Map<string, VenueData>(
    catalogue.map((venue) => [venue.id, { ...venue, event_count: 0 }])
  );
  for (const event of events) {
    const id = venueKey(event.venue);
    const existing = venues.get(id);
    if (existing) {
      existing.event_count += 1;
      existing.genres = [
        ...new Set([...(existing.genres || []), ...event.genres]),
      ];
      existing.image_url ||= event.image_url;
    } else
      venues.set(id, {
        ...event.venue,
        id,
        event_count: 1,
        image_url: event.image_url,
        genres: [...event.genres],
      });
  }
  return [...venues.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function collectTours(events: Event[]): Tour[] {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const name = event.lineup[0] || event.title;
    const id = artistKey(name);
    groups.set(id, [...(groups.get(id) || []), event]);
  }
  return [...groups.entries()]
    .filter(([, shows]) => shows.length > 1)
    .map(([id, shows]) => {
      const sorted = shows.toSorted((a, b) =>
        (a.datetime || '').localeCompare(b.datetime || '')
      );
      return {
        id,
        name: `${sorted[0].lineup[0] || sorted[0].title}: upcoming shows`,
        artist: sorted[0].lineup[0] || sorted[0].title,
        start_date: sorted[0].datetime || '',
        end_date: sorted.at(-1)?.datetime || '',
        event_count: sorted.length,
        cities: [
          ...new Set(sorted.map((event) => event.venue.city).filter(Boolean)),
        ],
        events: sorted,
      };
    });
}

export function recommendEvents(
  events: Event[],
  saves: SavedItem[],
  today = new Date().toISOString().slice(0, 10),
  seed?: Event
): (Event & { reason: string })[] {
  const savedIds = new Set(
    saves.filter((s) => s.type === 'event').map((s) => s.id)
  );
  const followedArtists = new Set(
    saves.filter((s) => s.type === 'artist').map((s) => s.id)
  );
  const followedVenues = new Set(
    saves.filter((s) => s.type === 'venue').map((s) => s.id)
  );
  const seeds = seed
    ? [seed]
    : events.filter((event) => savedIds.has(event.id));
  const genres = new Set(seeds.flatMap((event) => event.genres.map(artistKey)));

  return events
    .filter(
      (event) =>
        isUpcoming(event, today) &&
        !savedIds.has(event.id) &&
        event.id !== seed?.id
    )
    .map((event) => {
      const followed = event.lineup.some((name) =>
        followedArtists.has(artistKey(name))
      );
      const venue = followedVenues.has(venueKey(event.venue));
      const genre = event.genres.some((name) => genres.has(artistKey(name)));
      const sameArtist = seeds.some((saved) =>
        saved.lineup.some((name) =>
          event.lineup.map(artistKey).includes(artistKey(name))
        )
      );
      return {
        ...event,
        score:
          Number(followed) * 8 +
          Number(sameArtist) * 6 +
          Number(venue) * 4 +
          Number(genre) * 2,
        reason: followed
          ? 'An artist you follow'
          : sameArtist
            ? 'Another show from an artist you saved'
            : venue
              ? 'At a venue you follow'
              : 'Similar to the genres you saved',
      };
    })
    .filter((event) => event.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || (a.datetime || '').localeCompare(b.datetime || '')
    )
    .map(({ score: _score, ...event }) => event);
}

export function trendingEvents(
  events: Event[],
  location = '',
  today = new Date().toISOString().slice(0, 10)
): Event[] {
  return filterEvents(events, { location })
    .filter(
      (event) =>
        isUpcoming(event, today) && !event.is_private && event.popularity > 0
    )
    .sort(
      (a, b) =>
        b.popularity - a.popularity ||
        (a.datetime || '').localeCompare(b.datetime || '')
    );
}
