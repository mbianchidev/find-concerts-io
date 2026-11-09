import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseMetalAgendaPage,
  parseMetalDeCalendar,
  metalDeSearches,
  type CalendarSource,
} from '../src/server/calendars';

const source: CalendarSource = {
  id: 'synthetic-calendar',
  name: 'Synthetic specialist calendar',
  url: 'https://calendar.example.test/p/example',
  parser: 'metalagenda',
  city: 'Example City',
  country: 'Test Country',
};

test('Dutch calendars preserve explicit dates, support acts, and zero-show venues without importing nearby towns or films', () => {
  const html = `<h1>Metal concerten in Example City en omstreken</h1>
    <div id="cont_right">
      <a href="/venues/room">Example City | Fictional Room</a>
      <a href="/venues/quiet">Example City | Quiet Fictional Hall</a>
      <a href="/venues/nearby">Example City Heights | Nearby Fictional Hall</a>
    </div>
    <div id="cont_left">
      <div class="dateheader"><span>03</span> april <span>2027</span><sub>zaterdag</sub></div>
      <div class="agendapunt"><div class="left">
        <a href="https://venue.example.test/gig"><h3>Mock Headliner + Mock Support</h3></a>
        <a href="/venues/room">Fictional Room Example City</a>
        <div><span>Bands: </span>Mock Headliner | Mock Support</div>
      </div></div>
      <div class="agendapunt"><div class="left">
        <a href="https://venue.example.test/nearby"><h3>Nearby Mock Band</h3></a>
        <a href="/venues/nearby">Nearby Fictional Hall Example City Heights</a>
      </div></div>
      <div class="agendapunt"><div class="left">
        <a href="https://venue.example.test/film"><h3>Synthetic Film (1998)</h3></a>
        <a href="/venues/room">Fictional Room Example City</a>
      </div></div>
    </div>`;
  const result = parseMetalAgendaPage(html, source);
  assert.equal(result.events.length, 1);
  assert.equal(result.venues.length, 2);
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.warnings, []);
  const event = result.events[0];
  assert.equal(event.datetime, '2027-04-03');
  assert.equal(event.date_only, true);
  assert.deepEqual(event.lineup, ['Mock Headliner', 'Mock Support']);
  assert.equal(event.venue.city, 'Example City');
  assert.equal(event.source.genre_basis, 'calendar');
  assert.deepEqual(event.genres, ['Metal']);
  assert.ok(
    result.venues.some(
      (venue) =>
        venue.name === 'Quiet Fictional Hall' && venue.event_count === 0
    )
  );
});

test('German calendar search records retain billing, exact city scope, and distinct dates for shared tour URLs', () => {
  const german: CalendarSource = {
    ...source,
    parser: 'metal-de',
    url: 'https://calendar.example.test/konzerte/',
  };
  const row = {
    date: 'Samstag,<br \\/>03.04.27',
    title: 'Mock Headliner - Synthetic Tour',
    billing: 'Mock Support, Mock Headliner und Third Mock',
    link: 'https://calendar.example.test/touren/mock',
    location: {
      name: 'Fictional Room',
      city: 'Example City',
      link: 'https://calendar.example.test/locations/room',
      lat: '',
      long: '',
    },
  };
  const result = parseMetalDeCalendar(
    JSON.stringify({
      status: 'success',
      data: [
        row,
        { ...row, date: 'Sonntag,<br \\/>04.04.27' },
        { ...row, location: { ...row.location, city: 'Example City Heights' } },
      ],
    }),
    german,
    ['Rock'],
    '2027-01-01',
    '2028-01-01'
  );
  assert.equal(result.events.length, 2);
  assert.notEqual(result.events[0].id, result.events[1].id);
  assert.equal(result.events[0].datetime, '2027-04-03');
  assert.equal(result.events[0].date_only, true);
  assert.deepEqual(result.events[0].lineup, [
    'Mock Headliner',
    'Mock Support',
    'Third Mock',
  ]);
  assert.deepEqual(result.events[0].genres, ['Rock']);
  assert.equal(result.venues.length, 1);
  assert.deepEqual(result.venues[0].genres, ['Rock']);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.warnings, []);
});

test('unknown optional coordinates do not discard concerts and unrelated-city metadata cannot poison a scoped run', () => {
  const row = {
    date: '03.04.27',
    title: 'Mock Band',
    billing: 'Mock Band',
    link: 'https://calendar.example.test/touren/mock',
    location: {
      name: 'Fictional Room',
      city: 'Example City',
      link: 'https://calendar.example.test/locations/room',
      lat: null,
      long: null,
    },
  };
  const result = parseMetalDeCalendar(
    JSON.stringify({
      status: 'success',
      data: [
        row,
        { ...row, location: { ...row.location, name: '', city: 'Elsewhere' } },
      ],
    }),
    { ...source, parser: 'metal-de' },
    ['Metal'],
    '2027-01-01',
    '2028-01-01'
  );
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].venue.latitude, '');
  assert.equal(result.events[0].venue.longitude, '');
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.warnings, []);
});

test('venue identity survives inconsistent publisher slugs and reversibly double-encoded names', () => {
  const html = `<h1>Metal concerten in Example City en omstreken</h1>
    <div id="cont_right"><a href="/venues/fictional-caf----">Example City | Fictional Caf\u00c3\u00a9</a></div>
    <div id="cont_left">
      <div class="dateheader">03 mei 2027<sub>maandag</sub></div>
      <div class="agendapunt"><div class="left">
        <a href="https://venue.example.test/gig"><h3>Mock Band</h3></a>
        <a href="/venues/fictional-caf--">Fictional Caf\u00c3\u00a9 Example City</a>
        <div>Bands: Mock Band</div>
      </div></div>
    </div>`;
  const result = parseMetalAgendaPage(html, source);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].venue.name, 'Fictional Caf\u00e9');
  assert.equal(result.events[0].datetime, '2027-05-03');
  assert.equal(result.venues[0].source_url, source.url);
  assert.deepEqual(result.warnings, []);
});

test('explicitly verified publisher aliases share one follow identity without merging different show dates', () => {
  const row = {
    date: '03.04.27',
    title: 'Mock Band',
    billing: 'Mock Band',
    link: 'https://calendar.example.test/touren/mock',
    location: {
      name: 'FictionalRoom',
      city: 'Example City',
      link: 'https://calendar.example.test/locations/alias',
      lat: '',
      long: '',
    },
  };
  const result = parseMetalDeCalendar(
    JSON.stringify({
      status: 'success',
      data: [
        row,
        {
          ...row,
          date: '04.04.27',
          location: { ...row.location, name: 'Fictional Room' },
        },
      ],
    }),
    {
      ...source,
      parser: 'metal-de',
      venueAliases: { fictionalroom: 'Fictional Room' },
    },
    ['Metal'],
    '2027-01-01',
    '2028-01-01'
  );
  assert.equal(result.venues.length, 1);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].venue.name, 'Fictional Room');
  assert.notEqual(result.events[0].id, result.events[1].id);
});

test('public search requests use the published genre taxonomy and reject changed form layouts', () => {
  const labels = [
    'black-metal',
    'death-metal',
    'doom-metal',
    'gothic-metal-mittelalter',
    'heavy-metal',
    'modern-metal',
    'pagan-viking-metal',
    'thrash-metal',
    'hardcore-grindcore',
    'post-rock-metal',
    'progressive-rock-metal',
    'rock',
    'punk',
  ];
  const html = `<form id="searchconcerts">${labels
    .map(
      (id, index) => `<input class="genre" id="${id}" value="${100 + index}">`
    )
    .join('')}</form>`;
  const searches = metalDeSearches(
    'https://calendar.example.test/search',
    html,
    new Date('2027-01-01T00:00:00Z')
  );
  assert.equal(searches.length, 4);
  const first = new URL(searches[0].url);
  assert.equal(first.searchParams.get('from'), '20270101');
  assert.equal(first.searchParams.get('until'), '20280101');
  assert.equal(
    first.searchParams.get('genres'),
    '100,101,102,103,104,105,106,107'
  );
  assert.deepEqual(searches[1].genres, ['Hardcore punk']);
  assert.throws(
    () =>
      metalDeSearches('https://calendar.example.test/search', '<form></form>'),
    /genre filters/
  );
});
