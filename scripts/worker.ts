import { loadEnvConfig } from '@next/env';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';

async function main() {
  loadEnvConfig(process.cwd());
  const { getStore } = await import('../src/server/store');
  const { runNextJob } = await import('../src/server/jobs');
  const { collectionDue } = await import('../src/server/scraper');
  const { logger } = await import('../src/server/logger');
  const interval = process.env.SCRAPE_INTERVAL_MINUTES
    ? z.coerce
        .number()
        .int()
        .min(15)
        .max(10080)
        .parse(process.env.SCRAPE_INTERVAL_MINUTES) * 60000
    : 0;
  const store = getStore();
  const id = randomUUID();
  const shutdown = new AbortController();
  const stop = () => {
    logger.info('Worker shutdown requested; finishing current work');
    shutdown.abort();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  logger.info(
    { scheduled_collection_minutes: interval ? interval / 60000 : null },
    'Concert worker ready'
  );
  const heartbeat = setInterval(() => {
    try {
      store.db
        .prepare(
          "INSERT OR REPLACE INTO cache (key, payload, expires_at) VALUES ('worker-heartbeat', '{}', ?)"
        )
        .run(Date.now() + 90000);
    } catch (error) {
      logger.error({ err: error }, 'Worker heartbeat could not be stored');
    }
  }, 30000);
  try {
    while (!shutdown.signal.aborted) {
      store.db
        .prepare(
          "INSERT OR REPLACE INTO cache (key, payload, expires_at) VALUES ('worker-heartbeat', '{}', ?)"
        )
        .run(Date.now() + 90000);
      store.db
        .prepare('DELETE FROM sessions WHERE expires_at <= ?')
        .run(Date.now());
      store.db
        .prepare('DELETE FROM email_verifications WHERE expires_at <= ?')
        .run(Date.now());
      if (interval && collectionDue(store, interval)) store.enqueue('scrape');
      if (!(await runNextJob(store, id))) {
        try {
          await pause(5000, undefined, { signal: shutdown.signal });
        } catch (error) {
          if (!shutdown.signal.aborted) throw error;
        }
      }
    }
  } finally {
    clearInterval(heartbeat);
    store.db.prepare("DELETE FROM cache WHERE key = 'worker-heartbeat'").run();
    store.close();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

void main().catch((error: unknown) => {
  console.error('Concert worker stopped with an error:', error);
  process.exitCode = 1;
});
