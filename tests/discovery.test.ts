import assert from 'node:assert/strict';
import test from 'node:test';
import {
  artistKey,
  collectArtists,
  filterEvents,
  isUpcoming,
  recommendEvents,
  sortEvents,
  trendingEvents,
  venueKey,
} from '../src/lib/concerts';
import { concert } from './fixtures';
import { localCalendarDate } from '../src/lib/utils';

test('browser day references use the local calendar date rather than converting it to UTC', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Pacific/Kiritimati';
    assert.equal(
      localCalendarDate(new Date('2027-04-02T23:30:00Z')),
      '2027-04-03'
    );
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(
      localCalendarDate(new Date('2027-04-03T00:30:00Z')),
      '2027-04-02'
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('upcoming comparisons honor UTC offsets while date filters stay venue-local', () => {
  const west = concert({ datetime: '2027-06-01T23:00:00-04:00' });
  const east = concert({ datetime: '2027-06-02T00:00:00+09:00' });
  assert.equal(isUpcoming(west, '2027-06-02'), true);
  assert.equal(isUpcoming(east, '2027-06-02'), false);
  assert.equal(filterEvents([west], { date: '2027-06-01' }).length, 1);
  assert.equal(filterEvents([west], { date: '2027-06-02' }).length, 0);
});

test('search includes support acts, venues, and case-insensitive genres', () => {
  const events = [
    {
      id: 'synthetic-show',
      title: 'The Example Signals',
      datetime: '2027-04-03T19:00:00+02:00',
      venue: {
        name: 'Fictional Room',
        city: 'Example City',
        region: '',
        country: 'Test Country',
        latitude: '',
        longitude: '',
      },
      lineup: ['The Example Signals', 'Mock Support'],
      genres: ['Hardcore punk'],
      url: 'https://example.com/show',
      source: {
        id: 'test',
        name: 'Synthetic source',
        url: 'https://example.com',
        fetched_at: '2027-01-01T00:00:00Z',
      },
      status: 'scheduled' as const,
      popularity: 0,
    },
  ];

  assert.equal(
    filterEvents(events, {
      artist: 'mock support',
      location: 'fictional room',
      genre: 'PUNK',
      date: '2027-04-03',
    }).length,
    1
  );
  assert.equal(filterEvents(events, { genre: 'jazz' }).length, 0);
});

test('city filters match the complete normalized city, not venue names or nearby cities', () => {
  const matching = concert();
  const nearby = concert({
    id: 'nearby',
    venue: { ...matching.venue, city: 'Example City Heights' },
  });
  const misleading = concert({
    id: 'misleading',
    venue: {
      ...matching.venue,
      name: 'Example City Tribute Hall',
      city: 'Other City',
    },
  });
  const events = [matching, nearby, misleading];
  assert.deepEqual(
    filterEvents(events, {
      city: '  EXAMPLE CITY  ',
      artist: 'Mock Support',
    }).map((event) => event.id),
    ['synthetic-show']
  );
  assert.equal(filterEvents(events, { city: 'Example' }).length, 0);
  assert.equal(
    filterEvents(events, { city: 'Example City', genre: 'Jazz' }).length,
    0
  );
  assert.equal(filterEvents(events, {}).length, 3);
});

test('date ranges include both boundary days and overlapping multi-day concerts', () => {
  const events = [
    concert({ id: 'before', datetime: '2027-04-01' }),
    concert({ id: 'start', datetime: '2027-04-02T23:00:00-04:00' }),
    concert({ id: 'end', datetime: '2027-04-04T20:00:00+09:00' }),
    concert({ id: 'after', datetime: '2027-04-05' }),
    concert({
      id: 'festival',
      datetime: '2027-04-01',
      end_datetime: '2027-04-03',
    }),
    concert({ id: 'unconfirmed', datetime: null }),
  ];
  assert.deepEqual(
    filterEvents(events, {
      date_from: '2027-04-02',
      date_to: '2027-04-04',
    }).map((event) => event.id),
    ['start', 'end', 'festival']
  );
});

test('date periods include today in upcoming, separate past shows, and retain unknown dates only for all dates', () => {
  const events = [
    concert({ id: 'past', datetime: '2027-04-01' }),
    concert({ id: 'today', datetime: '2027-04-02' }),
    concert({ id: 'future', datetime: '2027-04-03' }),
    concert({
      id: 'ongoing',
      datetime: '2027-04-01',
      end_datetime: '2027-04-03',
    }),
    concert({ id: 'unconfirmed', datetime: null }),
    concert({ id: 'cancelled', datetime: '2027-04-03', status: 'cancelled' }),
  ];
  const ids = (period: 'all' | 'upcoming' | 'today' | 'past') =>
    filterEvents(events, { period }, '2027-04-02').map((event) => event.id);
  assert.deepEqual(ids('upcoming'), ['today', 'future', 'ongoing']);
  assert.deepEqual(ids('today'), ['today', 'ongoing']);
  assert.deepEqual(ids('past'), ['past']);
  assert.equal(ids('all').length, events.length);
  assert.deepEqual(
    filterEvents(
      events,
      { period: 'upcoming', date_to: '2027-04-02' },
      '2027-04-02'
    ).map((event) => event.id),
    ['today', 'ongoing']
  );
});

test('venue filtering uses stable identity and date/band sorting is deterministic with unknown dates last', () => {
  const first = concert({
    id: 'z-band',
    lineup: ['Z Mock Band'],
    datetime: '2027-04-02T23:00:00-04:00',
  });
  const events = [
    first,
    concert({
      id: 'a-band',
      lineup: ['A Mock Band'],
      datetime: '2027-04-03T02:00:00Z',
      venue: { ...first.venue, city: 'Other Example City' },
    }),
    concert({
      id: 'unknown',
      lineup: [],
      title: 'M Mock Band',
      datetime: null,
    }),
  ];
  assert.deepEqual(
    filterEvents(events, { venue: venueKey(first.venue) }).map(
      (event) => event.id
    ),
    ['z-band', 'unknown']
  );
  assert.deepEqual(
    sortEvents(events, 'date_asc').map((event) => event.id),
    ['a-band', 'z-band', 'unknown']
  );
  assert.deepEqual(
    sortEvents(events, 'date_desc').map((event) => event.id),
    ['z-band', 'a-band', 'unknown']
  );
  assert.deepEqual(
    sortEvents(events, 'band_asc').map((event) => event.id),
    ['a-band', 'unknown', 'z-band']
  );
  assert.deepEqual(
    sortEvents(events, 'band_desc').map((event) => event.id),
    ['z-band', 'unknown', 'a-band']
  );
  assert.equal(events[0], first);
});

test('recommendations use saved genres and followed support acts, excluding saved and past shows', () => {
  const seed = concert({ id: 'saved' });
  const next = concert({ id: 'next', lineup: ['Mock Support'] });
  const old = concert({ id: 'old', datetime: '2020-01-01' });
  const cancelled = concert({ id: 'cancelled', status: 'cancelled' });
  const saves = [
    { id: 'saved', type: 'event' as const, addedAt: '2026-01-01' },
    {
      id: artistKey('Mock Support'),
      type: 'artist' as const,
      addedAt: '2026-01-01',
    },
  ];
  assert.deepEqual(
    recommendEvents([seed, next, old, cancelled], saves, '2027-01-01').map(
      (event) => event.id
    ),
    ['next']
  );
  assert.deepEqual(recommendEvents([next], [], '2027-01-01'), []);
});

test('trending uses actual saves in the chosen area, not invented popularity', () => {
  const events = [
    concert({ id: 'zero', popularity: 0 }),
    concert({ id: 'popular', popularity: 3 }),
    concert({ id: 'less-popular', popularity: 1 }),
  ];
  assert.deepEqual(
    trendingEvents(events, 'example city', '2027-01-01').map((e) => e.id),
    ['popular', 'less-popular']
  );
  assert.deepEqual(trendingEvents(events, 'another city', '2027-01-01'), []);
});

test('artist listings include support acts and deduplicate one event per artist', () => {
  const artists = collectArtists([
    concert({
      lineup: ['Synthetic Headliner', 'Synthetic Support', 'Synthetic Support'],
    }),
  ]);
  assert.equal(artists.length, 2);
  assert.ok(artists.every((artist) => artist.upcoming_event_count === 1));
});
