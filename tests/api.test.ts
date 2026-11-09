import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../src/server/api';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';

const origin = 'http://localhost:3000';

function request(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie?: string,
  customOrigin = origin
) {
  return new Request(`${origin}/api/v1${path}`, {
    method,
    headers: {
      origin: customOrigin,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('real sessions isolate imports and reject cross-origin mutations and SQL-like input', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const registration = await handleApi(
      request('/users', 'POST', {
        username: 'synthetic-owner',
        password: 'synthetic-test-password-2027',
      }),
      store
    );
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get('set-cookie')!.split(';')[0];
    assert.ok(registration.headers.get('set-cookie')?.includes('HttpOnly'));
    const user = (await registration.json()).data;
    store.importEvents(user.id, {
      events: [concert({ is_private: true })],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    const privateId = store.events(user.id, true)[0].id;
    const own = await handleApi(
      request('/me/events', 'GET', undefined, cookie),
      store
    );
    assert.equal((await own.json()).data.length, 1);
    assert.match(own.headers.get('cache-control') || '', /no-store/);
    const publicFeed = await handleApi(request('/events'), store);
    assert.equal((await publicFeed.json()).meta.total, 0);
    assert.equal(
      (await handleApi(request(`/events/${privateId}`), store)).status,
      404
    );
    assert.equal((await handleApi(request('/me/events'), store)).status, 401);
    assert.equal(
      (
        await handleApi(
          request(
            '/me/saved',
            'PUT',
            { type: 'event', id: privateId, saved: true },
            cookie,
            'https://evil.example'
          ),
          store
        )
      ).status,
      403
    );
    assert.equal(
      (
        await handleApi(
          request('/sessions', 'POST', {
            username: "' OR 1=1 --",
            password: 'synthetic-wrong-password',
          }),
          store
        )
      ).status,
      422
    );
    const logout = await handleApi(
      request('/sessions/current', 'DELETE', undefined, cookie),
      store
    );
    assert.equal(logout.status, 200);
    assert.equal(
      (await handleApi(request('/me/events', 'GET', undefined, cookie), store))
        .status,
      401
    );
  } finally {
    store.close();
  }
});

test('login failures, pagination errors, and oversized JSON have explicit error envelopes', async () => {
  const store = new ConcertStore(':memory:');
  try {
    const badLogin = await handleApi(
      request('/sessions', 'POST', {
        username: 'nonexistent-test-user',
        password: 'synthetic-wrong-password',
      }),
      store
    );
    assert.equal(badLogin.status, 401);
    assert.equal((await badLogin.json()).error.code, 'INVALID_CREDENTIALS');
    assert.equal(
      (await handleApi(request('/events?page=-1'), store)).status,
      422
    );
    const large = await handleApi(
      request('/sessions', 'POST', { padding: 'x'.repeat(70000) }),
      store
    );
    assert.equal(large.status, 413);
    assert.equal((await large.json()).error.code, 'BODY_TOO_LARGE');
  } finally {
    store.close();
  }
});

test('rate limits survive requests with forged forwarding headers by default', () => {
  const store = new ConcertStore(':memory:');
  try {
    store.rateLimit('synthetic-key', 2, 1000, 100);
    store.rateLimit('synthetic-key', 2, 1000, 100);
    assert.throws(
      () => store.rateLimit('synthetic-key', 2, 1000, 100),
      /Too many requests/
    );
    assert.doesNotThrow(() => store.rateLimit('synthetic-key', 2, 1000, 1101));
  } finally {
    store.close();
  }
});
