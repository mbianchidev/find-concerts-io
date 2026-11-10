import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVenueCoordinates,
  MAP_LATITUDE_LIMIT,
  venueMapUrls,
  venueSearchUrl,
} from '../src/lib/maps';
import { concert } from './fixtures';

test('venue coordinates preserve zero and reject missing, malformed, or unsupported values', () => {
  assert.deepEqual(getVenueCoordinates({ latitude: '0', longitude: '0' }), {
    latitude: 0,
    longitude: 0,
  });
  assert.deepEqual(
    getVenueCoordinates({ latitude: ' 12.5 ', longitude: '-45.5' }),
    {
      latitude: 12.5,
      longitude: -45.5,
    }
  );
  for (const [latitude, longitude] of [
    ['', ''],
    ['12.5', ''],
    ['NaN', '10'],
    ['0x10', '10'],
    ['12.5junk', '10'],
    ['90', '10'],
    ['12.5', '181'],
  ]) {
    assert.equal(getVenueCoordinates({ latitude, longitude }), undefined);
  }
});

test('OpenStreetMap URLs pin the venue and keep bounds valid at map edges', () => {
  const point = { latitude: 12.5, longitude: -45.5 };
  const urls = venueMapUrls(point);
  const embed = new URL(urls.embed);
  assert.equal(embed.origin, 'https://www.openstreetmap.org');
  assert.equal(embed.pathname, '/export/embed.html');
  assert.equal(embed.searchParams.get('marker'), '12.5,-45.5');
  assert.equal(embed.searchParams.get('layer'), 'mapnik');
  const bounds = embed.searchParams.get('bbox')!.split(',').map(Number);
  assert.ok(bounds[0] < point.longitude && bounds[2] > point.longitude);
  assert.ok(bounds[1] < point.latitude && bounds[3] > point.latitude);
  const external = new URL(urls.external);
  assert.equal(external.searchParams.get('mlat'), '12.5');
  assert.equal(external.searchParams.get('mlon'), '-45.5');
  assert.equal(external.hash, '#map=16/12.5/-45.5');
  const edge = new URL(
    venueMapUrls({ latitude: MAP_LATITUDE_LIMIT, longitude: 180 }).embed
  );
  const edgeBounds = edge.searchParams.get('bbox')!.split(',').map(Number);
  assert.ok(edgeBounds.every(Number.isFinite));
  assert.ok(
    edgeBounds[1] >= -MAP_LATITUDE_LIMIT && edgeBounds[3] <= MAP_LATITUDE_LIMIT
  );
  assert.ok(edgeBounds[0] >= -180 && edgeBounds[2] <= 180);
  assert.throws(
    () => venueMapUrls({ latitude: NaN, longitude: 0 }),
    /coordinates/i
  );
});

test('venue search links encode location text without adding concert details', () => {
  const venue = { ...concert().venue, name: 'Mock Room & Hall' };
  const url = new URL(venueSearchUrl(venue));
  assert.equal(url.origin, 'https://www.openstreetmap.org');
  assert.equal(url.pathname, '/search');
  assert.equal(
    url.searchParams.get('query'),
    'Mock Room & Hall, Example City, Test Country'
  );
  assert.equal(url.searchParams.has('title'), false);
  assert.equal(
    new URL(venueSearchUrl({ name: '', city: '', country: '' })).search,
    ''
  );
});
