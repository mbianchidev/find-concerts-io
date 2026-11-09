import assert from 'node:assert/strict';
import test from 'node:test';
import { SpotifyClient, TicketmasterClient } from '../src/server/providers';

test('Spotify integration uses mocked token and search responses without inventing previews', async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/api/token'))
      return Response.json({
        access_token: 'synthetic-token',
        expires_in: 3600,
      });
    return Response.json({
      artists: {
        items: [
          {
            id: 'synthetic-artist',
            name: 'Fictional Static',
            genres: ['punk'],
            external_urls: {
              spotify: 'https://open.spotify.com/artist/synthetic',
            },
            images: [],
          },
        ],
      },
      tracks: { items: [] },
    });
  };
  const client = new SpotifyClient(
    'synthetic-client',
    'synthetic-secret',
    fetcher
  );
  const artists = await client.searchArtists('Fictional Static');
  assert.equal(artists[0].name, 'Fictional Static');
  assert.equal(artists[0].preview_url, null);
  await client.searchArtists('Fictional Static');
  assert.equal(calls.filter((url) => url.includes('/api/token')).length, 1);
});

test('Ticketmaster normalization uses explicit venue-local dates and reports invalid rows', async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({
      page: { totalElements: 2 },
      _embedded: {
        events: [
          {
            id: 'synthetic-show',
            name: 'Fictional Static',
            url: 'https://www.ticketmaster.com/synthetic',
            dates: {
              start: {
                localDate: '2027-04-03',
                localTime: '19:00:00',
                dateTime: '2027-04-03T17:00:00Z',
              },
              status: { code: 'onsale' },
            },
            classifications: [
              { genre: { name: 'Rock' }, subGenre: { name: 'Punk' } },
            ],
            _embedded: {
              venues: [
                {
                  name: 'Mock Hall',
                  city: { name: 'Example City' },
                  country: { name: 'Test Country' },
                },
              ],
              attractions: [{ name: 'Fictional Static' }],
            },
          },
          { id: 'invalid-synthetic-row', name: 'No confirmed date' },
        ],
      },
    });
  const result = await new TicketmasterClient(
    'synthetic-key',
    fetcher
  ).searchEvents('punk');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].datetime, '2027-04-03T19:00:00+02:00');
  assert.equal(result.events[0].venue.city, 'Example City');
  assert.equal(result.warnings.length, 1);
});
