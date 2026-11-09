import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Event,
  ImportReport,
  Notification,
  SavedItem,
  User,
  VenueData,
} from '@/types';
import { artistKey, collectVenues, isUpcoming, venueKey } from '@/lib/concerts';
import type { ParsedImport } from './imports';
import { AppError } from './errors';
import { eventSchema, venueSchema } from '@/lib/schema';

function comparable(event: Event): string {
  const { id: _id, popularity: _popularity, source, ...rest } = event;
  const { fetched_at: _fetched, ...origin } = source;
  return JSON.stringify({ ...rest, source: origin });
}

export class ConcertStore {
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:')
      mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    const version = this.db.prepare('PRAGMA user_version').get();
    if (!version || Number(version.user_version) > 3) {
      this.db.close();
      throw new Error(
        'The database schema is newer than this app. Use a matching app version; do not reset the database.'
      );
    }
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA secure_delete = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
        email TEXT, email_verified INTEGER NOT NULL DEFAULT 0,
        email_notifications INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        identity TEXT NOT NULL, starts_at TEXT, source_id TEXT NOT NULL,
        payload TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(owner_id, identity)
      );
      CREATE INDEX IF NOT EXISTS events_owner_date ON events(owner_id, starts_at);
      CREATE INDEX IF NOT EXISTS events_source_date ON events(source_id, starts_at);
      CREATE TABLE IF NOT EXISTS saved (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, entity_id TEXT NOT NULL, added_at TEXT NOT NULL,
        PRIMARY KEY(user_id, kind, entity_id)
      );
      CREATE INDEX IF NOT EXISTS saved_popularity ON saved(kind, entity_id);
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT,
        email_sent_at TEXT, push_sent_at TEXT, UNIQUE(user_id, event_id)
      );
      CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS email_verifications (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS source_runs (
        id TEXT PRIMARY KEY, last_run TEXT NOT NULL, event_count INTEGER NOT NULL, error TEXT
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        run_after INTEGER NOT NULL, lease_until INTEGER, worker_id TEXT, error TEXT,
        created_at TEXT NOT NULL, completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS jobs_ready ON jobs(status, run_after);
      CREATE UNIQUE INDEX IF NOT EXISTS single_scrape_job ON jobs(kind)
        WHERE kind = 'scrape' AND status IN ('pending', 'running');
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, value REAL NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS metrics_retention ON metrics(created_at);
    `);
    this.transaction(() => {
      const columns = new Set(
        this.db
          .prepare('PRAGMA table_info(users)')
          .all()
          .map((row) => String(row.name))
      );
      for (const column of ['display_name', 'location', 'bio']) {
        if (!columns.has(column))
          this.db.exec(
            `ALTER TABLE users ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`
          );
      }
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS venues (
          id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL
        );
      `);
      if (Number(version.user_version) < 3) {
        const events = this.db
          .prepare('SELECT payload FROM events WHERE owner_id IS NULL')
          .all()
          .map((row) => eventSchema.parse(JSON.parse(String(row.payload))));
        for (const venue of collectVenues(events)) this.persistVenue(venue);
      }
      this.db.exec('PRAGMA user_version = 3');
    });
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  createUser(username: string, passwordHash: string): User {
    return this.transaction(() => {
      if (
        this.db.prepare('SELECT id FROM users WHERE username = ?').get(username)
      ) {
        throw new AppError(
          409,
          'USERNAME_TAKEN',
          'That username is already in use.'
        );
      }
      const id = randomUUID();
      const role = 'user' as const;
      this.db
        .prepare(
          'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(
          id,
          username.toLowerCase(),
          passwordHash,
          role,
          new Date().toISOString()
        );
      return {
        id,
        username: username.toLowerCase(),
        display_name: '',
        location: '',
        bio: '',
        role,
        email_notifications: false,
      };
    });
  }

  user(id: string): User | undefined {
    const row = this.db
      .prepare(
        'SELECT id, username, display_name, location, bio, role, email, email_verified, email_notifications FROM users WHERE id = ?'
      )
      .get(id);
    if (!row) return undefined;
    return {
      id: String(row.id),
      username: String(row.username),
      display_name: String(row.display_name),
      location: String(row.location),
      bio: String(row.bio),
      role: row.role === 'admin' ? 'admin' : 'user',
      email:
        row.email_verified && typeof row.email === 'string'
          ? row.email
          : undefined,
      email_notifications: !!row.email_notifications && !!row.email_verified,
    };
  }

  credentials(
    username: string
  ): { id: string; password_hash: string } | undefined {
    const row = this.db
      .prepare('SELECT id, password_hash FROM users WHERE username = ?')
      .get(username);
    return row
      ? { id: String(row.id), password_hash: String(row.password_hash) }
      : undefined;
  }

  events(ownerId: string | null, includePast = false): Event[] {
    const rows =
      ownerId === null
        ? this.db
            .prepare(
              'SELECT payload FROM events WHERE owner_id IS NULL ORDER BY starts_at, id'
            )
            .all()
        : this.db
            .prepare(
              'SELECT payload FROM events WHERE owner_id = ? ORDER BY starts_at, id'
            )
            .all(ownerId);
    const counts = new Map(
      this.db
        .prepare(
          "SELECT entity_id, count(*) AS total FROM saved WHERE kind = 'event' GROUP BY entity_id"
        )
        .all()
        .map((row) => [String(row.entity_id), Number(row.total)])
    );
    return rows
      .map((row) => {
        const event = eventSchema.parse(JSON.parse(String(row.payload)));
        return {
          ...event,
          popularity: ownerId === null ? counts.get(event.id) || 0 : 0,
        };
      })
      .filter((event) => includePast || isUpcoming(event));
  }

  event(id: string, userId?: string): Event | undefined {
    const row = this.db
      .prepare(
        'SELECT payload FROM events WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)'
      )
      .get(id, userId || null);
    return row ? eventSchema.parse(JSON.parse(String(row.payload))) : undefined;
  }

  venues(events = this.events(null)): VenueData[] {
    const catalogue = this.db
      .prepare('SELECT payload FROM venues ORDER BY id')
      .all()
      .map((row) => venueSchema.parse(JSON.parse(String(row.payload))));
    return collectVenues(events, catalogue);
  }

  private persistVenue(input: VenueData): void {
    const next = venueSchema.parse(input);
    if (next.id !== venueKey(next))
      throw new AppError(
        422,
        'VENUE_ID_MISMATCH',
        'The venue identity does not match its name, city, and country.'
      );
    const row = this.db
      .prepare('SELECT payload FROM venues WHERE id = ?')
      .get(next.id);
    const previous = row
      ? venueSchema.parse(JSON.parse(String(row.payload)))
      : undefined;
    const merged = venueSchema.parse({
      ...previous,
      ...Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== undefined)
      ),
      event_count: 0,
      genres: [
        ...new Set([...(previous?.genres || []), ...(next.genres || [])]),
      ],
    });
    this.db
      .prepare(
        'INSERT INTO venues (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at'
      )
      .run(merged.id, JSON.stringify(merged), new Date().toISOString());
  }

  upsertVenues(venues: VenueData[]): void {
    this.transaction(() => {
      for (const venue of venues) this.persistVenue(venue);
    });
  }

  upsertPublic(events: Event[]): number {
    return this.transaction(() => {
      let added = 0;
      for (const input of events) {
        const event = eventSchema.parse(input);
        if (event.is_private || event.import_details)
          throw new AppError(
            422,
            'PRIVATE_PUBLICATION',
            'Private workbook records cannot enter the public catalogue.'
          );
        const existing = this.db
          .prepare('SELECT owner_id FROM events WHERE id = ?')
          .get(event.id);
        if (existing && existing.owner_id !== null)
          throw new AppError(
            409,
            'EVENT_CONFLICT',
            'A public event cannot replace a private record.'
          );
        this.db
          .prepare(
            `
          INSERT INTO events (id, owner_id, identity, starts_at, source_id, payload, updated_at)
          VALUES (?, NULL, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET starts_at = excluded.starts_at, payload = excluded.payload, updated_at = excluded.updated_at
        `
          )
          .run(
            event.id,
            event.id,
            event.datetime,
            event.source.id,
            JSON.stringify(event),
            new Date().toISOString()
          );
        if (!existing) added++;
        this.persistVenue(collectVenues([event])[0]);
        if (isUpcoming(event)) this.notifyFollowers(event);
      }
      this.db.prepare("DELETE FROM cache WHERE key = 'public-catalogue'").run();
      return added;
    });
  }

  importEvents(userId: string, parsed: ParsedImport): ImportReport {
    if (!this.user(userId))
      throw new AppError(
        404,
        'USER_NOT_FOUND',
        'Create an account before importing a workbook.'
      );
    return this.transaction(() => {
      const report: ImportReport = {
        ...parsed.report,
        issues: [...parsed.report.issues],
      };
      for (const draft of parsed.events) {
        const id = `private:${createHash('sha256').update(`${userId}:${draft.id}`).digest('hex')}`;
        const event = eventSchema.parse({
          ...draft,
          id,
          is_private: true,
          popularity: 0,
        });
        const existing = this.db
          .prepare(
            'SELECT payload FROM events WHERE owner_id = ? AND identity = ?'
          )
          .get(userId, draft.id);
        if (existing) {
          if (
            comparable(event) ===
            comparable(eventSchema.parse(JSON.parse(String(existing.payload))))
          )
            report.duplicates++;
          else {
            report.skipped++;
            report.issues.push({
              sheet: event.import_details?.sheet || '',
              row: event.import_details?.row || 1,
              level: 'warning',
              message:
                'A concert with the same title, original date, and location already exists with different fields. It was not overwritten.',
            });
          }
          continue;
        }
        this.db
          .prepare(
            'INSERT INTO events (id, owner_id, identity, starts_at, source_id, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            id,
            userId,
            draft.id,
            event.datetime,
            'workbook',
            JSON.stringify(event),
            new Date().toISOString()
          );
        report.imported++;
      }
      report.errors = report.issues.filter(
        (issue) => issue.level === 'error'
      ).length;
      this.db
        .prepare(
          'INSERT INTO imports (id, user_id, report, created_at) VALUES (?, ?, ?, ?)'
        )
        .run(
          randomUUID(),
          userId,
          JSON.stringify(report),
          new Date().toISOString()
        );
      return report;
    });
  }

  saves(userId: string): SavedItem[] {
    return this.db
      .prepare(
        'SELECT entity_id, kind, added_at FROM saved WHERE user_id = ? ORDER BY added_at DESC'
      )
      .all(userId)
      .map((row) => ({
        id: String(row.entity_id),
        type:
          row.kind === 'artist'
            ? 'artist'
            : row.kind === 'venue'
              ? 'venue'
              : 'event',
        addedAt: String(row.added_at),
      }));
  }

  setSaved(
    userId: string,
    type: SavedItem['type'],
    id: string,
    enabled: boolean
  ): void {
    if (enabled) {
      this.db
        .prepare(
          'INSERT OR IGNORE INTO saved (user_id, kind, entity_id, added_at) VALUES (?, ?, ?, ?)'
        )
        .run(userId, type, id, new Date().toISOString());
      if (type !== 'event') {
        for (const event of this.events(null)) {
          if (
            type === 'artist'
              ? event.lineup.some((name) => artistKey(name) === id)
              : venueKey(event.venue) === id
          )
            this.notifyFollowers(event, userId);
        }
      }
    } else
      this.db
        .prepare(
          'DELETE FROM saved WHERE user_id = ? AND kind = ? AND entity_id = ?'
        )
        .run(userId, type, id);
    this.db.prepare("DELETE FROM cache WHERE key = 'public-catalogue'").run();
  }

  private notifyFollowers(event: Event, onlyUser?: string): void {
    const follows = this.db
      .prepare(
        "SELECT user_id, kind, entity_id FROM saved WHERE kind IN ('artist', 'venue')"
      )
      .all();
    const users = new Set(
      follows
        .filter(
          (row) =>
            (!onlyUser || row.user_id === onlyUser) &&
            (row.kind === 'artist'
              ? event.lineup.some((name) => artistKey(name) === row.entity_id)
              : venueKey(event.venue) === row.entity_id)
        )
        .map((row) => String(row.user_id))
    );
    for (const userId of users) {
      const id = randomUUID();
      const result = this.db
        .prepare(
          'INSERT OR IGNORE INTO notifications (id, user_id, event_id, title, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(id, userId, event.id, event.title, new Date().toISOString());
      if (result.changes) this.enqueue('notification', { notificationId: id });
    }
  }

  notifications(userId: string): Notification[] {
    return this.db
      .prepare(
        'SELECT id, event_id, title, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
      )
      .all(userId)
      .map((row) => ({
        id: String(row.id),
        event_id: String(row.event_id),
        title: String(row.title),
        created_at: String(row.created_at),
        read_at: row.read_at === null ? null : String(row.read_at),
      }));
  }

  rateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now()
  ): void {
    const row = this.db
      .prepare(
        `
      INSERT INTO rate_limits (key, hits, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        hits = CASE WHEN reset_at <= ? THEN 1 ELSE hits + 1 END,
        reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
      RETURNING hits, reset_at
    `
      )
      .get(key, now + windowMs, now, now);
    this.db
      .prepare('DELETE FROM rate_limits WHERE reset_at < ?')
      .run(now - windowMs);
    if (row && Number(row.hits) > limit) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        'Too many requests. Try again after the cooldown.',
        {
          retry_after: Math.max(
            1,
            Math.ceil((Number(row.reset_at) - now) / 1000)
          ),
        }
      );
    }
  }

  cached(key: string, ttlMs: number, produce: () => unknown): unknown {
    const row = this.db
      .prepare('SELECT payload FROM cache WHERE key = ? AND expires_at > ?')
      .get(key, Date.now());
    if (row) return JSON.parse(String(row.payload));
    const value = produce();
    this.db
      .prepare(
        'INSERT OR REPLACE INTO cache (key, payload, expires_at) VALUES (?, ?, ?)'
      )
      .run(key, JSON.stringify(value), Date.now() + ttlMs);
    return value;
  }

  enqueue(kind: 'scrape' | 'notification', payload: object = {}): string {
    if (kind === 'scrape') {
      const existing = this.db
        .prepare(
          "SELECT id FROM jobs WHERE kind = 'scrape' AND status IN ('pending', 'running')"
        )
        .get();
      if (existing) return String(existing.id);
    }
    const id = randomUUID();
    const inserted = this.db
      .prepare(
        'INSERT OR IGNORE INTO jobs (id, kind, payload, run_after, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        id,
        kind,
        JSON.stringify(payload),
        Date.now(),
        new Date().toISOString()
      );
    if (!inserted.changes) {
      const active = this.db
        .prepare(
          "SELECT id FROM jobs WHERE kind = 'scrape' AND status IN ('pending', 'running')"
        )
        .get();
      if (kind === 'scrape' && active) return String(active.id);
      throw new AppError(
        409,
        'QUEUE_CONFLICT',
        'The queue changed concurrently. Refresh the collector status and try again.'
      );
    }
    return id;
  }
}

const globalStore = globalThis as typeof globalThis & {
  concertStore?: ConcertStore;
};

export function getStore(): ConcertStore {
  if (!globalStore.concertStore) {
    globalStore.concertStore = new ConcertStore(
      process.env.DATABASE_PATH || resolve('.data/concerts.sqlite')
    );
  }
  return globalStore.concertStore;
}
