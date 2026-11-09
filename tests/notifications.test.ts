import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmEmail } from '../src/server/notifications';
import { tokenHash } from '../src/server/auth';
import { ConcertStore } from '../src/server/store';
import { handleApi } from '../src/server/api';

test('email ownership confirmation is account-bound, single-use, and opt-in', () => {
  const store = new ConcertStore(':memory:');
  try {
    const owner = store.createUser('synthetic-email-owner', 'synthetic-hash');
    const other = store.createUser('synthetic-email-other', 'synthetic-hash');
    const token = 'e'.repeat(43);
    store.db
      .prepare(
        'INSERT INTO email_verifications (token_hash, user_id, email, expires_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        tokenHash(token),
        owner.id,
        'listener@example.test',
        Date.now() + 60000
      );
    assert.equal(store.user(owner.id)?.email, undefined);
    assert.throws(
      () => confirmEmail(store, other, token),
      /invalid or expired/
    );
    confirmEmail(store, owner, token);
    assert.equal(store.user(owner.id)?.email, 'listener@example.test');
    assert.equal(store.user(owner.id)?.email_notifications, true);
    assert.equal(store.user(other.id)?.email, undefined);
    assert.throws(
      () => confirmEmail(store, owner, token),
      /invalid or expired/
    );
  } finally {
    store.close();
  }
});

test('push endpoints are restricted and sign-out revokes session-bound delivery', async () => {
  const names = [
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
  ] as const;
  const original = new Map(names.map((name) => [name, process.env[name]]));
  process.env.VAPID_PUBLIC_KEY = 'synthetic-public';
  process.env.VAPID_PRIVATE_KEY = 'synthetic-private';
  process.env.VAPID_SUBJECT = 'mailto:operator@example.test';
  const store = new ConcertStore(':memory:');
  const call = (
    path: string,
    method: string,
    body?: unknown,
    cookie?: string
  ) =>
    handleApi(
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
  try {
    const registered = await call('/users', 'POST', {
      username: 'synthetic-push-user',
      password: 'synthetic-push-password-2027',
    });
    assert.equal(registered.status, 201);
    const header = registered.headers.get('set-cookie');
    assert.ok(header);
    const cookie = header.split(';')[0];
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic-endpoint',
      keys: {
        p256dh: Buffer.alloc(65, 4).toString('base64url'),
        auth: Buffer.alloc(16, 5).toString('base64url'),
      },
    };
    const blocked = await call(
      '/push-subscriptions',
      'POST',
      { ...subscription, endpoint: 'https://127.0.0.1/admin' },
      cookie
    );
    assert.equal(blocked.status, 422);
    assert.equal(
      (await call('/push-subscriptions', 'POST', subscription, cookie)).status,
      201
    );
    assert.equal(
      store.db.prepare('SELECT count(*) AS total FROM push_subscriptions').get()
        ?.total,
      1
    );
    assert.equal(
      (await call('/sessions/current', 'DELETE', undefined, cookie)).status,
      200
    );
    assert.equal(
      store.db.prepare('SELECT count(*) AS total FROM push_subscriptions').get()
        ?.total,
      0
    );
  } finally {
    store.close();
    for (const name of names) {
      const value = original.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
