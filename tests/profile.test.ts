import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { ConcertStore } from '../src/server/store';
import { handleApi } from '../src/server/api';
import { concert } from './fixtures';

function call(
  store: ConcertStore,
  path: string,
  method: string,
  body?: unknown,
  cookie?: string
) {
  return handleApi(
    new Request(`http://localhost:3000/api/v1${path}`, {
      method,
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    store
  );
}

test('profile migration preserves legacy accounts, sessions, and private concert rows', () => {
  const directory = mkdtempSync(join(tmpdir(), 'concerts-profile-synthetic-'));
  const path = join(directory, 'legacy.sqlite');
  const legacy = new DatabaseSync(path);
  legacy.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', email TEXT, email_verified INTEGER NOT NULL DEFAULT 0, email_notifications INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE events (id TEXT PRIMARY KEY, owner_id TEXT, identity TEXT NOT NULL, starts_at TEXT, source_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(owner_id,identity));
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
    PRAGMA user_version=1;
  `);
  legacy
    .prepare(
      'INSERT INTO users (id,username,password_hash,created_at) VALUES (?,?,?,?)'
    )
    .run(
      'synthetic-owner',
      'synthetic-legacy',
      'synthetic-unchanged-hash',
      '2027-01-01'
    );
  const payload = JSON.stringify(concert({ is_private: true }));
  legacy
    .prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?)')
    .run(
      'synthetic-show',
      'synthetic-owner',
      'synthetic-show',
      '2027-04-03',
      'workbook',
      payload,
      '2027-01-01'
    );
  legacy
    .prepare('INSERT INTO sessions VALUES (?,?,?)')
    .run('synthetic-token-hash', 'synthetic-owner', Date.now() + 60000);
  legacy.close();
  const store = new ConcertStore(path);
  try {
    const user = store.user('synthetic-owner');
    assert.equal(user?.username, 'synthetic-legacy');
    assert.equal(Reflect.get(user!, 'display_name'), '');
    assert.equal(
      store.credentials('synthetic-legacy')?.password_hash,
      'synthetic-unchanged-hash'
    );
    assert.equal(
      store.db.prepare('SELECT payload FROM events').get()?.payload,
      payload
    );
    assert.equal(
      store.db.prepare('SELECT count(*) AS total FROM sessions').get()?.total,
      1
    );
    assert.equal(
      store.db.prepare('PRAGMA user_version').get()?.user_version,
      2
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('profile updates are validated, account-private, and cannot change roles or usernames', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const registered = await call(store, '/users', 'POST', {
      username: 'synthetic-profile',
      password: 'synthetic-profile-password',
    });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    const other = store.createUser('synthetic-profile-other', 'synthetic-hash');
    const saved = await call(
      store,
      '/me/profile',
      'PATCH',
      {
        display_name: 'Synthetic Listener',
        location: 'Example City',
        bio: 'Synthetic profile only.',
      },
      cookie
    );
    assert.equal(saved.status, 200);
    const profile = (await saved.json()).data;
    assert.equal(profile.display_name, 'Synthetic Listener');
    const session = await call(
      store,
      '/sessions/current',
      'GET',
      undefined,
      cookie
    );
    assert.equal((await session.json()).data.bio, 'Synthetic profile only.');
    assert.equal(Reflect.get(store.user(other.id)!, 'display_name'), '');
    assert.equal(
      (
        await call(
          store,
          '/me/profile',
          'PATCH',
          { display_name: 'x'.repeat(81) },
          cookie
        )
      ).status,
      422
    );
    assert.equal(
      (
        await call(
          store,
          '/me/profile',
          'PATCH',
          { role: 'admin', username: 'other' },
          cookie
        )
      ).status,
      422
    );
    assert.equal(
      (
        await call(store, '/me/profile', 'PATCH', {
          display_name: 'No account',
        })
      ).status,
      401
    );
  } finally {
    store.close();
  }
});

test('password changes require the old password, rotate the current session, and revoke other sessions', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const credentials = {
      username: 'synthetic-password',
      password: 'synthetic-original-password',
    };
    const first = await call(store, '/users', 'POST', credentials);
    const firstCookie = first.headers.get('set-cookie')!.split(';')[0];
    const second = await call(store, '/sessions', 'POST', credentials);
    const secondCookie = second.headers.get('set-cookie')!.split(';')[0];
    const body = {
      current_password: credentials.password,
      new_password: 'synthetic-replacement-password',
      confirm_password: 'synthetic-replacement-password',
    };
    assert.equal(
      (
        await call(
          store,
          '/me/password',
          'PATCH',
          { ...body, current_password: 'synthetic-wrong-password' },
          firstCookie
        )
      ).status,
      401
    );
    const changed = await call(
      store,
      '/me/password',
      'PATCH',
      body,
      firstCookie
    );
    assert.equal(changed.status, 200);
    const nextCookie = changed.headers.get('set-cookie')!.split(';')[0];
    assert.notEqual(nextCookie, firstCookie);
    assert.equal(
      (
        await (
          await call(store, '/sessions/current', 'GET', undefined, secondCookie)
        ).json()
      ).data,
      null
    );
    assert.equal(
      (
        await (
          await call(store, '/sessions/current', 'GET', undefined, nextCookie)
        ).json()
      ).data.username,
      credentials.username
    );
    assert.equal(
      (await call(store, '/sessions', 'POST', credentials)).status,
      401
    );
    assert.equal(
      (
        await call(store, '/sessions', 'POST', {
          ...credentials,
          password: body.new_password,
        })
      ).status,
      200
    );
  } finally {
    store.close();
  }
});
