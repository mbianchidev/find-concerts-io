import assert from 'node:assert/strict';
import test from 'node:test';
import {
  claimJob,
  completeJob,
  matchesCollectionRequest,
} from '../src/server/jobs';
import { ConcertStore } from '../src/server/store';

test('durable jobs have exclusive leases and stale workers cannot complete reassigned work', () => {
  const store = new ConcertStore(':memory:');
  try {
    const id = store.enqueue('scrape');
    assert.equal(store.enqueue('scrape'), id);
    const now = Date.now() + 10;
    const first = claimJob(store, 'worker-one', now);
    assert.ok(first);
    assert.equal(claimJob(store, 'worker-two', now), undefined);
    const second = claimJob(store, 'worker-two', now + 11 * 60000);
    assert.ok(second);
    assert.equal(second.id, first.id);
    assert.throws(() => completeJob(store, first, now + 11 * 60000), /lease/i);
    completeJob(store, second, now + 11 * 60000 + 1);
    assert.equal(
      store.db.prepare('SELECT status FROM jobs WHERE id = ?').get(id)?.status,
      'done'
    );
  } finally {
    store.close();
  }
});

test('a queued collector cannot silently replace a different city scope or force option', () => {
  assert.equal(matchesCollectionRequest('{}', false, []), true);
  const payload = JSON.stringify({
    force: false,
    cities: ['Example City', 'Other City'],
  });
  assert.equal(
    matchesCollectionRequest(payload, false, [' other city ', 'EXAMPLE CITY']),
    true
  );
  assert.equal(
    matchesCollectionRequest(payload, false, ['Example City']),
    false
  );
  assert.equal(
    matchesCollectionRequest(payload, true, ['Example City', 'Other City']),
    false
  );
});
