import assert from 'node:assert/strict';
import test from 'node:test';
import {
  enrichConcertImages,
  extractPagePhoto,
  supportedImage,
  trustedPhotoPageUrl,
} from '../src/server/images';
import { concert } from './fixtures';
import { venueKey } from '../src/lib/concerts';
import { ConcertStore } from '../src/server/store';

const origin = 'https://www.metal.de';

test('photo extraction prefers event and performer imagery to venue images and supports lazy/responsive markup', () => {
  const html = `<meta property="og:image" content="${origin}/images/venue.jpg">
    <script type="application/ld+json">${JSON.stringify({
      '@graph': [
        {
          '@type': 'MusicEvent',
          image: [{ contentUrl: '/images/tour.jpg' }],
          performer: { '@type': 'MusicGroup', image: '/images/band.jpg' },
          location: { image: '/images/room.jpg' },
        },
      ],
    })}</script>`;
  assert.equal(
    extractPagePhoto(html, `${origin}/touren/mock/`).image_url,
    `${origin}/images/tour.jpg`
  );
  assert.equal(
    extractPagePhoto(
      html.replace('/images/tour.jpg', 'data:image/png;base64,invalid'),
      origin
    ).image_url,
    `${origin}/images/band.jpg`
  );
  assert.equal(
    extractPagePhoto(
      '<article><img src="/images/placeholder.gif" data-src="/images/mock-tour.jpg"></article>',
      origin
    ).image_url,
    `${origin}/images/mock-tour.jpg`
  );
  assert.equal(
    extractPagePhoto(
      '<article><picture><source srcset="/images/mock-400.jpg 400w, /images/mock-1200.jpg 1200w"><img src="/images/mock-200.jpg"></picture></article>',
      origin
    ).image_url,
    `${origin}/images/mock-1200.jpg`
  );
  assert.equal(
    extractPagePhoto(
      '<meta name="twitter:image" content="//static.metal.de/images/mock.jpg">',
      origin
    ).image_url,
    'https://static.metal.de/images/mock.jpg'
  );
  const venueOnly = extractPagePhoto(
    `<script type="application/ld+json">${JSON.stringify({
      '@type': 'MusicEvent',
      location: { image: `${origin}/images/mock-room.jpg` },
    })}</script>`,
    origin
  );
  assert.equal(venueOnly.image_url, `${origin}/images/mock-room.jpg`);
  assert.equal(venueOnly.image_kind, 'venue');
});

test('photo URLs reject unknown origins, credentials, malformed URLs, logos, and unsafe schemes', () => {
  for (const value of [
    '',
    '   ',
    '#poster',
    'https://127.0.0.1/private.jpg',
    'https://attacker.example/poster.jpg',
    'https://user:password@www.metal.de/images/poster.jpg',
    'javascript:alert(1)',
    'data:image/svg+xml,test',
    '/images/logo-transparant.png',
    '/images/spacer.gif',
    'https://www.metal.de:8443/images/poster.jpg',
  ]) {
    assert.equal(supportedImage(value, origin), undefined);
  }
  assert.equal(
    supportedImage('http://static.metal.de/images/mock.jpg', origin),
    'https://static.metal.de/images/mock.jpg'
  );
  assert.equal(trustedPhotoPageUrl(`${origin}/touren/mock/`), true);
  assert.equal(trustedPhotoPageUrl('https://attacker.example/event/'), false);
  assert.equal(trustedPhotoPageUrl('http://www.metal.de/touren/mock/'), false);
});

test('collection reuses tour/band photos before venue fallback, deduplicates reads, and never requests private or uncurated URLs', async () => {
  const first = concert({
    id: 'first',
    lineup: ['Mock Band'],
    url: `${origin}/touren/mock/`,
  });
  const events = [
    first,
    concert({
      id: 'second',
      lineup: ['Mock Band'],
      url: `${origin}/touren/mock/`,
    }),
    concert({
      id: 'same-band',
      lineup: ['Mock Band'],
      url: 'https://unlisted.example/gig',
    }),
    concert({
      id: 'fallback',
      lineup: ['Another Mock Band'],
      url: 'https://unlisted.example/another',
    }),
    concert({ id: 'private', is_private: true, url: `${origin}/private` }),
  ];
  const calls: string[] = [];
  const photos = await enrichConcertImages(
    events,
    [
      {
        ...first.venue,
        id: venueKey(first.venue),
        event_count: 0,
        url: 'https://www.melkweg.nl/',
      },
    ],
    async (url) => {
      calls.push(url);
      return {
        image_url:
          url === `${origin}/touren/mock/`
            ? `${origin}/images/mock-band.jpg`
            : 'https://assets.melkweg.nl/mock-venue.jpg',
      };
    }
  );
  assert.deepEqual(
    photos.map((event) => event.image_url),
    [
      `${origin}/images/mock-band.jpg`,
      `${origin}/images/mock-band.jpg`,
      `${origin}/images/mock-band.jpg`,
      'https://assets.melkweg.nl/mock-venue.jpg',
      undefined,
    ]
  );
  assert.equal(photos[3].image_kind, 'venue');
  assert.deepEqual(calls, [
    `${origin}/touren/mock/`,
    'https://www.melkweg.nl/',
  ]);
  assert.equal(events[0].image_url, undefined);
});

test('a later event photo upgrades a venue fallback without treating venue imagery as an artist photo', async () => {
  const event = concert({
    image_url: 'https://assets.melkweg.nl/mock-venue.jpg',
    image_kind: 'venue',
    url: `${origin}/touren/mock/`,
  });
  const result = await enrichConcertImages([event], [], async () => ({
    image_url: `${origin}/images/mock-tour.jpg`,
  }));
  assert.equal(result[0].image_url, `${origin}/images/mock-tour.jpg`);
  assert.equal(result[0].image_kind, 'event');
});

test('known public band photos can fill another source while private photos never become public fallbacks', async () => {
  const event = concert({ url: 'https://unlisted.example/gig' });
  const known = concert({ image_url: `${origin}/images/mock-band.jpg` });
  const read = async () => {
    throw new Error('No curated page should be requested');
  };
  const publicResult = await enrichConcertImages([event], [], read, [known]);
  assert.equal(publicResult[0].image_url, known.image_url);
  assert.equal(publicResult[0].image_kind, 'artist');
  const privateResult = await enrichConcertImages([event], [], read, [
    { ...known, is_private: true },
  ]);
  assert.equal(privateResult[0].image_url, undefined);
});

test('a metadata-only refresh preserves existing public artwork', () => {
  const store = new ConcertStore(':memory:');
  try {
    store.upsertPublic([
      concert({
        image_url: `${origin}/images/mock-tour.jpg`,
        image_kind: 'event',
      }),
    ]);
    store.upsertPublic([concert({ status: 'sold_out' })]);
    const refreshed = store.event('synthetic-show');
    assert.equal(refreshed?.image_url, `${origin}/images/mock-tour.jpg`);
    assert.equal(refreshed?.status, 'sold_out');
  } finally {
    store.close();
  }
});
