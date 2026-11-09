import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyGenres,
  parseSourcePage,
  SOURCES,
  trustedSourceUrl,
  discoverEventLinks,
  collectConcerts,
  shouldRefreshSourceEvent,
  collectionDue,
} from '../src/server/scraper';
import { CALENDAR_SOURCES } from '../src/server/calendars';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';

test('official page adapters classify only event content and preserve sold-out status', () => {
  const html = `<article class="event">
    <h1 class="event-header-title">SYNTHETIC BAND | SOLD OUT</h1>
    <p class="event-header-date"><time>Tuesday 9th November 2027</time></p>
    <div class="event-details"><time>7:30 PM</time></div>
    <ul class="event-details-lineup"><li><p>Doors open</p></li><li><p>Mock Support</p></li><li><p>Synthetic Band</p></li><li><p>Curfew</p></li></ul>
    <div class="event-description">A synthetic post-hardcore and punk rock show.</div>
  </article><footer>Unrelated jazz and death metal links</footer>`;
  const source = SOURCES[0];
  const event = parseSourcePage(
    html,
    `${source.url}event/synthetic-band/`,
    source
  );
  assert.ok(event);
  assert.equal(event.status, 'sold_out');
  assert.equal(event.datetime, '2027-11-09T19:30:00+00:00');
  assert.ok(event.genres.includes('Hardcore punk'));
  assert.ok(!event.genres.includes('Metal'));
  assert.equal(event.source.id, source.id);
  assert.deepEqual(event.lineup, ['SYNTHETIC BAND', 'Mock Support']);
});

test('calendar-export and fragment URLs do not consume the event-page budget', () => {
  const source = SOURCES[1];
  const href = '/events/2027/4/3/synthetic';
  const html = `<a href="${href}">Show</a><a href="${href}">Same show</a><a href="${href}?format=ical">Calendar export</a><a href="${href}#share">Share</a>`;
  assert.deepEqual(discoverEventLinks(html, source), [
    new URL(href, source.url).href,
  ]);
});

test('source requests cannot escape the curated HTTPS origin or fetch credentials', () => {
  assert.equal(trustedSourceUrl('http://127.0.0.1/admin', SOURCES[0]), false);
  assert.equal(
    trustedSourceUrl('https://attacker.example/event', SOURCES[0]),
    false
  );
  assert.equal(
    trustedSourceUrl(
      'https://user:password@www.theunderworldcamden.co.uk/',
      SOURCES[0]
    ),
    false
  );
  assert.deepEqual(classifyGenres('jazz festival'), []);
});

test('known cancelled and postponed shows must refresh rather than remain falsely scheduled', () => {
  assert.equal(
    shouldRefreshSourceEvent(concert({ datetime: '2099-01-01' }), false),
    true
  );
  assert.equal(
    shouldRefreshSourceEvent(concert({ status: 'cancelled' }), true),
    true
  );
  assert.equal(
    shouldRefreshSourceEvent(concert({ status: 'postponed' }), true),
    true
  );
  assert.equal(
    shouldRefreshSourceEvent(concert({ status: 'cancelled' }), false),
    false
  );
  assert.equal(
    shouldRefreshSourceEvent(concert({ datetime: '2000-01-01' }), true),
    false
  );
});

test('refreshing one city cannot postpone another source that is due for scheduled collection', () => {
  const store = new ConcertStore(':memory:');
  const now = Date.parse('2030-01-01T12:00:00Z');
  const interval = 6 * 60 * 60 * 1000;
  try {
    assert.equal(collectionDue(store, interval, now), true);
    for (const source of [...SOURCES, ...CALENDAR_SOURCES]) {
      store.db
        .prepare('INSERT INTO source_runs VALUES (?, ?, 0, NULL)')
        .run(source.id, new Date(now).toISOString());
    }
    assert.equal(collectionDue(store, interval, now), false);
    store.db
      .prepare('UPDATE source_runs SET last_run=? WHERE id=?')
      .run(new Date(now - interval - 1).toISOString(), SOURCES[0].id);
    assert.equal(collectionDue(store, interval, now), true);
  } finally {
    store.close();
  }
});

test('city-scoped collection checks robots before requesting a calendar and preserves existing gigs', async (context) => {
  const store = new ConcertStore(':memory:');
  const calls: string[] = [];
  context.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      return new Response('User-agent: *\nDisallow: /p/amsterdam\n', {
        status: url === 'https://www.metalagenda.nl/robots.txt' ? 200 : 403,
      });
    }
  );
  try {
    store.upsertPublic([concert()]);
    const results = await collectConcerts(store, true, ['Amsterdam']);
    assert.equal(results.length, 1);
    assert.match(results[0].error || '', /robots\.txt disallows/);
    assert.deepEqual(calls, ['https://www.metalagenda.nl/robots.txt']);
    assert.equal(store.events(null, true).length, 1);
  } finally {
    store.close();
  }
});

test('a failed robots request is not retried for other city calendars on the same origin', async (context) => {
  const store = new ConcertStore(':memory:');
  const calls: string[] = [];
  context.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response('', { status: 503 });
    }
  );
  try {
    const results = await collectConcerts(store, true, [
      'Amsterdam',
      'Haarlem',
      'Utrecht',
    ]);
    assert.equal(results.length, 3);
    assert.ok(
      results.every((result) =>
        result.error?.includes('robots.txt returned HTTP 503')
      )
    );
    assert.deepEqual(calls, ['https://www.metalagenda.nl/robots.txt']);
  } finally {
    store.close();
  }
});
