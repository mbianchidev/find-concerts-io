import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';
import { deliverNotification } from './notifications';
import { collectConcerts } from './scraper';
import type { ConcertStore } from './store';

export interface Job {
  id: string;
  kind: 'scrape' | 'notification';
  payload: string;
  workerId: string;
  attempts: number;
}

const LEASE_MS = 10 * 60000;

export function claimJob(
  store: ConcertStore,
  workerId: string,
  now = Date.now(),
  onlyId?: string
): Job | undefined {
  return store.transaction(() => {
    store.db
      .prepare(
        "UPDATE jobs SET status = 'pending', worker_id = NULL, lease_until = NULL, error = 'Previous worker lease expired.' WHERE status = 'running' AND lease_until < ? AND attempts < 5"
      )
      .run(now);
    store.db
      .prepare(
        "UPDATE jobs SET status = 'failed', completed_at = ?, error = 'Worker lease expired after maximum attempts.' WHERE status = 'running' AND lease_until < ? AND attempts >= 5"
      )
      .run(new Date(now).toISOString(), now);
    const row = store.db
      .prepare(
        "SELECT id, kind, payload, attempts FROM jobs WHERE status = 'pending' AND run_after <= ? AND (? IS NULL OR id = ?) ORDER BY created_at LIMIT 1"
      )
      .get(now, onlyId || null, onlyId || null);
    if (!row) return undefined;
    if (row.kind !== 'scrape' && row.kind !== 'notification')
      throw new Error('The queue contains an unsupported job kind.');
    store.db
      .prepare(
        "UPDATE jobs SET status = 'running', worker_id = ?, attempts = attempts + 1, lease_until = ? WHERE id = ?"
      )
      .run(workerId, now + LEASE_MS, String(row.id));
    return {
      id: String(row.id),
      kind: row.kind,
      payload: String(row.payload),
      attempts: Number(row.attempts) + 1,
      workerId,
    };
  });
}

export function completeJob(
  store: ConcertStore,
  job: Job,
  now = Date.now()
): void {
  const result = store.db
    .prepare(
      "UPDATE jobs SET status = 'done', completed_at = ?, error = NULL, lease_until = NULL WHERE id = ? AND worker_id = ? AND status = 'running' AND lease_until >= ?"
    )
    .run(new Date(now).toISOString(), job.id, job.workerId, now);
  if (!result.changes)
    throw new AppError(
      409,
      'JOB_LEASE_LOST',
      'The job lease is no longer owned by this worker.'
    );
}

export async function runNextJob(
  store: ConcertStore,
  workerId = randomUUID(),
  onlyId?: string
): Promise<boolean> {
  const job = claimJob(store, workerId, Date.now(), onlyId);
  if (!job) return false;
  const heartbeat = setInterval(() => {
    try {
      const result = store.db
        .prepare(
          "UPDATE jobs SET lease_until = ? WHERE id = ? AND worker_id = ? AND status = 'running'"
        )
        .run(Date.now() + LEASE_MS, job.id, workerId);
      if (!result.changes)
        logger.error(
          { job_id: job.id },
          'Worker could not renew its job lease'
        );
    } catch (error) {
      logger.error({ err: error, job_id: job.id }, 'Job lease renewal failed');
    }
  }, 60000);
  try {
    if (job.kind === 'scrape') {
      const payload = z
        .object({ force: z.boolean().default(false) })
        .parse(JSON.parse(job.payload));
      const result = await collectConcerts(store, payload.force);
      if (result.some((source) => source.error))
        throw new AppError(
          502,
          'COLLECTION_INCOMPLETE',
          result
            .filter((source) => source.error)
            .map((source) => `${source.source}: ${source.error}`)
            .join(' ')
        );
    } else {
      const payload: unknown = JSON.parse(job.payload);
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('notificationId' in payload) ||
        typeof payload.notificationId !== 'string'
      )
        throw new Error('The notification job has an invalid payload.');
      await deliverNotification(store, payload.notificationId);
    }
    completeJob(store, job);
    logger.info({ job_id: job.id, kind: job.kind }, 'Background job completed');
  } catch (error) {
    const retry = job.kind === 'notification' && job.attempts < 5;
    const result = store.db
      .prepare(
        "UPDATE jobs SET status = ?, error = ?, run_after = ?, completed_at = ?, lease_until = NULL WHERE id = ? AND worker_id = ? AND status = 'running'"
      )
      .run(
        retry ? 'pending' : 'failed',
        error instanceof Error ? error.message : 'Unknown job failure',
        Date.now() + Math.min(30 * 60000, 30000 * 2 ** job.attempts),
        retry ? null : new Date().toISOString(),
        job.id,
        workerId
      );
    logger.error(
      { err: error, job_id: job.id, retry, lease_owned: !!result.changes },
      'Background job failed'
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
