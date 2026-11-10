import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVenueLocation } from '../src/server/venue-location';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';

const endpoint = 'https://geocoder.example.test/search';

function place(
  name = 'Fictional Room',
  latitude = '12.5',
  longitude = '-45.5'
) {
  return {
    name,
    lat: latitude,
    lon: longitude,
    category: 'amenity',
    address: { city: 'Example City', country: 'Test Country' },
    namedetails: { name },
  };
}

test('listing coordinates work without geocoding, while private imports and incomplete venues never leave the app', async () => {
  const store = new ConcertStore(':memory:');
  const noFetch: typeof fetch = async () => {
    throw new Error('Unexpected map provider request');
  };
  try {
    const event = concert({
      venue: { ...concert().venue, latitude: '0', longitude: '0' },
    });
    assert.deepEqual(await resolveVenueLocation(event, store, noFetch, ''), {
      latitude: 0,
      longitude: 0,
    });
    await assert.rejects(
      resolveVenueLocation(
        { ...event, is_private: true },
        store,
        noFetch,
        endpoint
      ),
      { status: 403 }
    );
    await assert.rejects(
      resolveVenueLocation(
        concert({
          venue: { ...event.venue, name: '', latitude: '', longitude: '' },
        }),
        store,
        noFetch,
        endpoint
      ),
      { status: 422 }
    );
    await assert.rejects(
      resolveVenueLocation(
        concert({
          venue: { ...event.venue, name: '!!!', latitude: '', longitude: '' },
        }),
        store,
        noFetch,
        endpoint
      ),
      { status: 422 }
    );
  } finally {
    store.close();
  }
});

test('public venue lookups identify the app, cache across concerts, and share a one-per-second limit', async (context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2027-01-01T12:00:00Z'),
  });
  const store = new ConcertStore(':memory:');
  let requests = 0;
  const fetcher: typeof fetch = async (input, options) => {
    requests++;
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://geocoder.example.test');
    assert.equal(url.searchParams.get('format'), 'jsonv2');
    assert.equal(url.searchParams.get('addressdetails'), '1');
    assert.equal(url.searchParams.get('namedetails'), '1');
    assert.equal(url.searchParams.get('limit'), '5');
    assert.equal(
      url.searchParams.get('q')?.includes('The Example Signals'),
      false
    );
    assert.match(
      new Headers(options?.headers).get('user-agent') || '',
      /FindConcertsIO.*github\.com/
    );
    assert.equal(options?.redirect, 'error');
    return Response.json([place(url.searchParams.get('q')!.split(',')[0])]);
  };
  try {
    const first = await resolveVenueLocation(
      concert(),
      store,
      fetcher,
      endpoint
    );
    assert.deepEqual(first, { latitude: 12.5, longitude: -45.5 });
    assert.deepEqual(
      await resolveVenueLocation(
        concert({ id: 'another-date' }),
        store,
        fetcher,
        endpoint
      ),
      first
    );
    assert.equal(requests, 1);
    const other = concert({
      venue: { ...concert().venue, name: 'Another Fictional Hall' },
    });
    await assert.rejects(
      resolveVenueLocation(other, store, fetcher, endpoint),
      { status: 429 }
    );
    assert.equal(requests, 1);
    context.mock.timers.tick(1000);
    await resolveVenueLocation(other, store, fetcher, endpoint);
    assert.equal(requests, 2);
    context.mock.timers.tick(30 * 86400000 + 1);
    await resolveVenueLocation(concert(), store, fetcher, endpoint);
    assert.equal(requests, 3);
  } finally {
    store.close();
  }
});

test('unverified names, cities, countries, and city-centre results are not used as venue pins', async () => {
  const records = [
    { ...place(), name: 'Unrelated Room', namedetails: {} },
    { ...place(), address: { city: 'Other City', country: 'Test Country' } },
    { ...place(), address: { city: 'Example City', country: 'Other Country' } },
    { ...place(), category: 'place' },
    { ...place(), category: 'Place' },
    { ...place(), category: 'postcode' },
  ];
  for (const record of records) {
    const store = new ConcertStore(':memory:');
    let requests = 0;
    const fetcher: typeof fetch = async () => {
      requests++;
      return Response.json([record]);
    };
    try {
      await assert.rejects(
        resolveVenueLocation(concert(), store, fetcher, endpoint),
        { code: 'VENUE_LOCATION_NOT_FOUND' }
      );
      await assert.rejects(
        resolveVenueLocation(concert(), store, fetcher, endpoint),
        { code: 'VENUE_LOCATION_NOT_FOUND' }
      );
      assert.equal(requests, 1);
    } finally {
      store.close();
    }
  }
});

test('distinct matching venues are reported as ambiguous instead of picking the first result', async () => {
  const store = new ConcertStore(':memory:');
  const fetcher: typeof fetch = async () =>
    Response.json([place(), place('Fictional Room', '12.6', '-45.6')]);
  try {
    await assert.rejects(
      resolveVenueLocation(concert(), store, fetcher, endpoint),
      { code: 'VENUE_LOCATION_AMBIGUOUS' }
    );
  } finally {
    store.close();
  }
});

test('provider failures and disabled or unsafe endpoints have explicit errors', async () => {
  for (const response of [
    new Response('', { status: 500 }),
    new Response('not json'),
    Response.json({ unsupported: true }),
  ]) {
    const store = new ConcertStore(':memory:');
    try {
      await assert.rejects(
        resolveVenueLocation(concert(), store, async () => response, endpoint),
        { status: 502 }
      );
    } finally {
      store.close();
    }
  }
  const store = new ConcertStore(':memory:');
  const noFetch: typeof fetch = async () => {
    throw new Error('Unexpected map provider request');
  };
  try {
    await assert.rejects(resolveVenueLocation(concert(), store, noFetch, ''), {
      status: 503,
    });
    await assert.rejects(
      resolveVenueLocation(
        concert(),
        store,
        noFetch,
        'http://geocoder.example.test/search'
      ),
      { status: 500 }
    );
  } finally {
    store.close();
  }
});

test('upstream throttling pauses further lookups and corrupted cache data never becomes a map point', async () => {
  const store = new ConcertStore(':memory:');
  let requests = 0;
  const throttled: typeof fetch = async () => {
    requests++;
    return new Response('', { status: 429, headers: { 'retry-after': '60' } });
  };
  try {
    await assert.rejects(
      resolveVenueLocation(concert(), store, throttled, endpoint),
      { status: 503 }
    );
    await assert.rejects(
      resolveVenueLocation(concert(), store, throttled, endpoint),
      { status: 429 }
    );
    assert.equal(requests, 1);
  } finally {
    store.close();
  }
  const cached = new ConcertStore(':memory:');
  const fetcher: typeof fetch = async () => Response.json([place()]);
  try {
    await resolveVenueLocation(concert(), cached, fetcher, endpoint);
    cached.db
      .prepare(
        "UPDATE cache SET payload = 'invalid-json' WHERE key LIKE 'venue-location:%'"
      )
      .run();
    await assert.rejects(
      resolveVenueLocation(concert(), cached, fetcher, endpoint),
      { status: 500 }
    );
  } finally {
    cached.close();
  }
});
