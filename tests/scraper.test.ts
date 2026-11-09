import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyGenres,
  parseSourcePage,
  SOURCES,
  trustedSourceUrl,
  discoverEventLinks,
} from '../src/server/scraper';

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
