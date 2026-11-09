import type { Event } from '../src/types';

export function concert(overrides: Partial<Event> = {}): Event {
  return {
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
    status: 'scheduled',
    popularity: 0,
    ...overrides,
  };
}
