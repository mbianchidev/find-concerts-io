import { resolve } from 'node:path';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';

const store = new ConcertStore(resolve('.data/e2e.sqlite'));
try {
  store.db.exec(
    'DELETE FROM users; DELETE FROM events; DELETE FROM jobs; DELETE FROM rate_limits; DELETE FROM metrics; DELETE FROM cache;'
  );
  const future = (offset: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    return `${date.toISOString().slice(0, 10)}T19:00:00+00:00`;
  };
  store.upsertPublic([
    concert({
      id: 'source:synthetic-metal',
      title: 'Synthetic Voltage',
      lineup: ['Synthetic Voltage', 'Mock Support'],
      genres: ['Metal'],
      datetime: future(30),
    }),
    concert({
      id: 'source:synthetic-punk',
      title: 'Synthetic Paper Signals',
      lineup: ['Synthetic Paper Signals'],
      genres: ['Punk'],
      datetime: future(35),
    }),
    concert({
      id: 'source:synthetic-rock',
      title: 'Synthetic Stereo Test',
      lineup: ['Synthetic Stereo Test'],
      genres: ['Rock'],
      datetime: future(40),
      venue: {
        name: 'Another Fictional Hall',
        city: 'Other Example City',
        region: '',
        country: 'Test Country',
        latitude: '',
        longitude: '',
      },
    }),
    concert({
      id: 'source:synthetic-similar',
      title: 'Synthetic Voltage / Second Night',
      lineup: ['Synthetic Voltage'],
      genres: ['Metal'],
      datetime: future(60),
    }),
  ]);
  console.log('Dedicated synthetic browser-test database ready.');
} finally {
  store.close();
}
