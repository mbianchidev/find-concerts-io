import assert from 'node:assert/strict';
import test from 'node:test';
import {
  artistKey,
  collectArtists,
  filterEvents,
  isUpcoming,
  recommendEvents,
  trendingEvents,
} from '../src/lib/concerts';
import { concert } from './fixtures';

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
