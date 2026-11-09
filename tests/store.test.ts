import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConcertStore } from '../src/server/store';
import { concert } from './fixtures';

test('private records persist after reopening a permission-restricted database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'concerts-synthetic-'));
  const path = join(directory, 'test.sqlite');
  let store: ConcertStore | undefined = new ConcertStore(path);
  try {
    const owner = store.createUser('synthetic-durable-owner', 'synthetic-hash');
    store.importEvents(owner.id, {
      events: [concert({ is_private: true })],
      report: { total: 1, imported: 0, duplicates: 0, skipped: 0, issues: [] },
    });
    store.close();
    store = undefined;
    store = new ConcertStore(path);
    assert.equal(store.events(owner.id, true).length, 1);
    assert.equal(store.events(null, true).length, 0);
    assert.equal(statSync(path).mode & 0o777, 0o600);
  } finally {
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('private imports are account-isolated, durable, and idempotent without overwriting changed rows', () => {
  const store = new ConcertStore(':memory:');
  try {
    const owner = store.createUser('synthetic-owner', 'synthetic-hash');
    const other = store.createUser('synthetic-other', 'synthetic-hash');
    const event = concert({ is_private: true });
    const report = {
      imported: 0,
      duplicates: 0,
      skipped: 0,
      total: 1,
      issues: [],
    };
    assert.equal(
      store.importEvents(owner.id, { events: [event], report }).imported,
      1
    );
    assert.equal(
      store.importEvents(owner.id, { events: [event], report }).duplicates,
      1
    );
    const own = store.events(owner.id, true);
    assert.equal(own.length, 1);
    assert.equal(store.events(null, true).length, 0);
    assert.equal(store.events(other.id, true).length, 0);
    assert.equal(store.event(own[0].id, other.id), undefined);
    const changed = concert({
      is_private: true,
      description: 'Changed synthetic notes',
    });
    const conflict = store.importEvents(owner.id, {
      events: [changed],
      report,
    });
    assert.equal(conflict.skipped, 1);
    assert.ok(
      conflict.issues.some((issue) => /not overwritten/i.test(issue.message))
    );
    assert.equal(store.events(owner.id, true)[0].description, undefined);
    assert.equal(store.createUser('synthetic-third', 'hash').role, 'user');
  } finally {
    store.close();
  }
});

test('public event updates create deduplicated notifications for followed support acts', () => {
  const store = new ConcertStore(':memory:');
  try {
    const user = store.createUser('synthetic-listener', 'hash');
    store.setSaved(user.id, 'artist', 'mock support', true);
    store.upsertPublic([concert()]);
    store.upsertPublic([concert()]);
    assert.equal(store.notifications(user.id).length, 1);
    assert.equal(store.events(null, true).length, 1);
    assert.equal(store.notifications(user.id)[0].event_id, 'synthetic-show');
  } finally {
    store.close();
  }
});
