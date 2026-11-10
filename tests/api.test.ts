import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../src/server/api';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';
import { venueKey } from '../src/lib/concerts';
import { sessionCookie } from '../src/server/auth';

const origin = 'http://localhost:3000';

function request(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie?: string,
  customOrigin = origin
) {
  return new Request(`${origin}/api/v1${path}`, {
    method,
    headers: {
      origin: customOrigin,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('real sessions isolate imports and reject cross-origin mutations and SQL-like input', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const registration = await handleApi(
      request('/users', 'POST', {
        username: 'synthetic-owner',
        password: 'synthetic-test-password-2027',
      }),
      store
    );
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get('set-cookie')!.split(';')[0];
    assert.ok(registration.headers.get('set-cookie')?.includes('HttpOnly'));
    const user = (await registration.json()).data;
    store.importEvents(user.id, {
      events: [concert({ is_private: true })],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    const privateId = store.events(user.id, true)[0].id;
    const own = await handleApi(
      request('/me/events', 'GET', undefined, cookie),
      store
    );
    assert.equal((await own.json()).data.length, 1);
    assert.match(own.headers.get('cache-control') || '', /no-store/);
    const publicFeed = await handleApi(request('/events'), store);
    assert.equal((await publicFeed.json()).meta.total, 0);
    assert.equal(
      (await handleApi(request(`/events/${privateId}`), store)).status,
      404
    );
    assert.equal((await handleApi(request('/me/events'), store)).status, 401);
    assert.equal(
      (
        await handleApi(
          request(
            '/me/saved',
            'PUT',
            { type: 'event', id: privateId, saved: true },
            cookie,
            'https://evil.example'
          ),
          store
        )
      ).status,
      403
    );
    assert.equal(
      (
        await handleApi(
          request('/sessions', 'POST', {
            username: "' OR 1=1 --",
            password: 'synthetic-wrong-password',
          }),
          store
        )
      ).status,
      422
    );
    const logout = await handleApi(
      request('/sessions/current', 'DELETE', undefined, cookie),
      store
    );
    assert.equal(logout.status, 200);
    assert.equal(
      (await handleApi(request('/me/events', 'GET', undefined, cookie), store))
        .status,
      401
    );
  } finally {
    store.close();
  }
});

test('login failures, pagination errors, and oversized JSON have explicit error envelopes', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const badLogin = await handleApi(
      request('/sessions', 'POST', {
        username: 'nonexistent-test-user',
        password: 'synthetic-wrong-password',
      }),
      store
    );
    assert.equal(badLogin.status, 401);
    assert.equal((await badLogin.json()).error.code, 'INVALID_CREDENTIALS');
    assert.equal(
      (await handleApi(request('/events?page=-1'), store)).status,
      422
    );
    const large = await handleApi(
      request('/sessions', 'POST', { padding: 'x'.repeat(70000) }),
      store
    );
    assert.equal(large.status, 413);
    assert.equal((await large.json()).error.code, 'BODY_TOO_LARGE');
  } finally {
    store.close();
  }
});

test('city filters apply to public discovery and directories without exposing private cities', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const first = concert({ id: 'first-city' });
    const second = concert({
      id: 'second-city',
      lineup: ['Other Synthetic Artist'],
      venue: { ...first.venue, city: 'Other Example City' },
    });
    store.upsertPublic([first, second]);
    const owner = store.createUser('synthetic-city-owner', 'synthetic-hash');
    store.importEvents(owner.id, {
      events: [
        concert({ venue: { ...first.venue, city: 'Private Test City' } }),
      ],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    for (const resource of ['events', 'venues', 'artists']) {
      const response = await handleApi(
        request(`/${resource}?city=EXAMPLE%20CITY`),
        store
      );
      assert.equal(response.status, 200);
      assert.equal(
        (await response.json()).meta.total,
        resource === 'artists' ? 2 : 1
      );
    }
    const cities = await handleApi(request('/cities'), store);
    assert.equal(cities.status, 200);
    assert.deepEqual((await cities.json()).data, [
      'Example City',
      'Other Example City',
    ]);
    assert.equal((await handleApi(request('/me/cities'), store)).status, 401);
    assert.equal(
      (await handleApi(request(`/events?city=${'x'.repeat(251)}`), store))
        .status,
      422
    );
  } finally {
    store.close();
  }
});

test('venues with no upcoming shows remain city-filterable and followable', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const venue = concert().venue;
    const id = venueKey(venue);
    store.upsertVenues([{ ...venue, id, event_count: 0, genres: ['Metal'] }]);
    const directory = await handleApi(
      request('/venues?city=Example%20City&genre=Metal'),
      store
    );
    assert.equal((await directory.json()).meta.total, 1);
    const cities = await handleApi(request('/cities'), store);
    assert.deepEqual((await cities.json()).data, ['Example City']);
    const registration = await handleApi(
      request('/users', 'POST', {
        username: 'synthetic-venue-listener',
        password: 'synthetic-venue-password-2027',
      }),
      store
    );
    const cookie = registration.headers.get('set-cookie')!.split(';')[0];
    const user = (await registration.json()).data;
    const saved = await handleApi(
      request(
        '/me/saved',
        'PUT',
        {
          type: 'venue',
          id,
          saved: true,
        },
        cookie
      ),
      store
    );
    assert.equal(saved.status, 200);
    assert.equal(store.saves(user.id).length, 1);
    assert.equal(
      (
        await (
          await handleApi(request('/venues?artist=nonexistent'), store)
        ).json()
      ).meta.total,
      0
    );
    assert.equal(
      (
        await (
          await handleApi(
            request('/venues?saved=true', 'GET', undefined, cookie),
            store
          )
        ).json()
      ).meta.total,
      1
    );
    store.upsertPublic([concert({ datetime: '2099-04-03' })]);
    assert.equal(store.notifications(user.id).length, 1);
  } finally {
    store.close();
  }
});

test('discovery applies periods, inclusive ranges, and sorting before pagination', async (context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2027-04-03T12:00:00Z'),
  });
  const store = new ConcertStore(':memory:');
  try {
    store.upsertPublic([
      concert({ id: 'past', datetime: '2027-04-01' }),
      concert({ id: 'today', datetime: '2027-04-03', lineup: ['Z Mock Band'] }),
      concert({ id: 'next', datetime: '2027-04-04', lineup: ['A Mock Band'] }),
      concert({ id: 'unknown', datetime: null }),
    ]);
    const defaultPage = await (
      await handleApi(request('/events?limit=1'), store)
    ).json();
    assert.equal(defaultPage.meta.total, 2);
    assert.equal(defaultPage.data[0].id, 'today');
    for (const [period, expected] of [
      ['today', ['today']],
      ['past', ['past']],
      ['upcoming', ['today', 'next']],
      ['all', ['past', 'today', 'next', 'unknown']],
    ] as const) {
      const response = await handleApi(
        request(`/events?period=${period}`),
        store
      );
      assert.deepEqual(
        (await response.json()).data.map((event: { id: string }) => event.id),
        expected
      );
    }
    const range = await (
      await handleApi(
        request(
          '/events?date_from=2027-04-01&date_to=2027-04-03&sort=date_desc'
        ),
        store
      )
    ).json();
    assert.deepEqual(
      range.data.map((event: { id: string }) => event.id),
      ['today', 'past']
    );
    const bands = await (
      await handleApi(request('/events?sort=band_asc&limit=1'), store)
    ).json();
    assert.equal(bands.data[0].id, 'next');
    assert.equal(bands.meta.has_next, true);
    const localToday = await (
      await handleApi(request('/events?period=today&today=2027-04-04'), store)
    ).json();
    assert.deepEqual(
      localToday.data.map((event: { id: string }) => event.id),
      ['next']
    );
    for (const query of [
      'date_from=2027-02-30',
      'date_to=not-a-date',
      'date_from=2027-05-01&date_to=2027-04-01',
      'period=invalid',
      'sort=title',
    ]) {
      assert.equal(
        (await handleApi(request(`/events?${query}`), store)).status,
        422
      );
    }
  } finally {
    store.close();
  }
});

test('venue facets count every matching concert, omit empty venues, and ignore their own selection', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const first = concert({ id: 'first', genres: ['Metal'] });
    const second = concert({
      id: 'second',
      genres: ['Metal'],
      venue: { ...first.venue, name: 'Other Fictional Hall' },
    });
    store.upsertPublic([
      first,
      concert({ id: 'repeat', genres: ['Metal'] }),
      second,
      concert({ id: 'punk', genres: ['Punk'] }),
    ]);
    const quiet = { ...first.venue, name: 'Quiet Fictional Hall' };
    store.upsertVenues([{ ...quiet, id: venueKey(quiet), event_count: 0 }]);
    const selected = encodeURIComponent(venueKey(first.venue));
    const response = await handleApi(
      request(
        `/events?city=Example+City&genre=Metal&venue=${selected}&limit=1`
      ),
      store
    );
    const result = await response.json();
    assert.equal(result.meta.total, 2);
    assert.equal(result.data.length, 1);
    assert.deepEqual(
      result.meta.venues.map((venue: { name: string; event_count: number }) => [
        venue.name,
        venue.event_count,
      ]),
      [
        ['Fictional Room', 2],
        ['Other Fictional Hall', 1],
      ]
    );
    const filtered = await (
      await handleApi(
        request(`/events?artist=missing&venue=${selected}`),
        store
      )
    ).json();
    assert.deepEqual(filtered.meta.venues, []);
  } finally {
    store.close();
  }
});

test('private date/venue filters and facets stay owner-scoped and directory ranges can include past shows', async (context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2027-04-03T12:00:00Z'),
  });
  const store = new ConcertStore(':memory:');
  try {
    const owner = store.createUser('synthetic-filter-owner', 'synthetic-hash');
    const stranger = store.createUser(
      'synthetic-filter-stranger',
      'synthetic-hash'
    );
    const archived = concert({ id: 'archived', datetime: '2020-04-03' });
    store.importEvents(owner.id, {
      events: [archived],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    const cookie = sessionCookie(store, owner.id).split(';')[0];
    const own = await (
      await handleApi(
        request(
          '/me/events?period=past&sort=band_desc',
          'GET',
          undefined,
          cookie
        ),
        store
      )
    ).json();
    assert.equal(own.meta.total, 1);
    assert.equal(own.meta.venues[0].event_count, 1);
    const otherCookie = sessionCookie(store, stranger.id).split(';')[0];
    const other = await (
      await handleApi(
        request('/me/events?period=past', 'GET', undefined, otherCookie),
        store
      )
    ).json();
    assert.equal(other.meta.total, 0);
    assert.deepEqual(other.meta.venues, []);
    store.upsertPublic([archived]);
    for (const resource of ['artists', 'venues']) {
      const directory = await (
        await handleApi(
          request(`/${resource}?date_from=2020-04-03&date_to=2020-04-03`),
          store
        )
      ).json();
      assert.ok(directory.meta.total > 0);
      assert.equal(directory.meta.venues[0].event_count, 1);
    }
  } finally {
    store.close();
  }
});

test('similar concert lists honor the same city filter as discovery', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const seed = concert({ id: 'synthetic-seed' });
    store.upsertPublic([
      seed,
      concert({ id: 'synthetic-local' }),
      concert({
        id: 'synthetic-elsewhere',
        venue: { ...seed.venue, city: 'Other Example City' },
      }),
    ]);
    const response = await handleApi(
      request('/events/synthetic-seed/similar?city=Other%20Example%20City'),
      store
    );
    const result = await response.json();
    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0].id, 'synthetic-elsewhere');
  } finally {
    store.close();
  }
});

test('venue-location responses resolve public listings without exposing private import locations', async (context) => {
  const previousEndpoint = process.env.NOMINATIM_ENDPOINT;
  process.env.NOMINATIM_ENDPOINT = 'https://geocoder.example.test/search';
  context.after(() => {
    if (previousEndpoint === undefined) delete process.env.NOMINATIM_ENDPOINT;
    else process.env.NOMINATIM_ENDPOINT = previousEndpoint;
  });
  const store = new ConcertStore(':memory:');
  let lookups = 0;
  context.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request) => {
      lookups++;
      const url = new URL(String(input));
      assert.equal(
        url.searchParams.get('q'),
        'Fictional Room, Example City, Test Country'
      );
      return Response.json([
        {
          name: 'Fictional Room',
          lat: '12.5',
          lon: '-45.5',
          category: 'amenity',
          address: { city: 'Example City', country: 'Test Country' },
        },
      ]);
    }
  );
  try {
    store.upsertPublic([
      concert({
        id: 'mapped-show',
        venue: { ...concert().venue, latitude: '12.5', longitude: '-45.5' },
      }),
      concert({ id: 'unmapped-show' }),
    ]);
    const known = await handleApi(
      request('/events/mapped-show/location'),
      store
    );
    assert.equal(known.status, 200);
    assert.deepEqual((await known.json()).data, {
      latitude: 12.5,
      longitude: -45.5,
    });
    assert.equal(lookups, 0);
    const resolved = await handleApi(
      request('/events/unmapped-show/location'),
      store
    );
    assert.equal(resolved.status, 200);
    assert.deepEqual((await resolved.json()).data, {
      latitude: 12.5,
      longitude: -45.5,
    });
    assert.equal(lookups, 1);
    const owner = store.createUser('synthetic-map-owner', 'synthetic-hash');
    store.importEvents(owner.id, {
      events: [
        concert({ venue: { ...concert().venue, name: 'Private Test Hall' } }),
      ],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    const id = store.events(owner.id, true)[0].id;
    const cookie = sessionCookie(store, owner.id).split(';')[0];
    assert.equal(
      (
        await handleApi(
          request(`/events/${id}/location`, 'GET', undefined, cookie),
          store
        )
      ).status,
      403
    );
    assert.equal(
      (await handleApi(request(`/events/${id}/location`), store)).status,
      404
    );
    assert.equal(lookups, 1);
  } finally {
    store.close();
  }
});

test('rate limits survive requests with forged forwarding headers by default', () => {
  const store = new ConcertStore(':memory:');
  try {
    store.rateLimit('synthetic-key', 2, 1000, 100);
    store.rateLimit('synthetic-key', 2, 1000, 100);
    assert.throws(
      () => store.rateLimit('synthetic-key', 2, 1000, 100),
      /Too many requests/
    );
    assert.doesNotThrow(() => store.rateLimit('synthetic-key', 2, 1000, 1101));
  } finally {
    store.close();
  }
});
