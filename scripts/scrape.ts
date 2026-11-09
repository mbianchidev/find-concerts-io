import { loadEnvConfig } from '@next/env';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

async function main() {
  loadEnvConfig(process.cwd());
  const { values } = parseArgs({
    options: {
      force: { type: 'boolean', default: false },
      city: { type: 'string', multiple: true, default: [] },
    },
  });
  const { sourceStatuses } = await import('../src/server/scraper');
  const { runNextJob, matchesCollectionRequest } =
    await import('../src/server/jobs');
  const { getStore } = await import('../src/server/store');
  const store = getStore();
  try {
    const id = store.enqueue('scrape', {
      force: values.force,
      cities: values.city,
    });
    const queued = store.db
      .prepare('SELECT payload FROM jobs WHERE id = ?')
      .get(id);
    if (
      !queued ||
      !matchesCollectionRequest(
        String(queued.payload),
        values.force ?? false,
        values.city ?? []
      )
    )
      throw new Error(
        'Another collector job has different city or force options. Wait for it to finish; its scope was not changed and no second collector was started.'
      );
    if (!(await runNextJob(store, randomUUID(), id)))
      throw new Error(
        'The collector job is already running in another worker. Check /sources for its status; no second collector was started.'
      );
    const job = store.db
      .prepare('SELECT status, error FROM jobs WHERE id = ?')
      .get(id);
    console.log(
      JSON.stringify(
        {
          job_id: id,
          status: job?.status,
          sources: sourceStatuses(store),
          upcoming_events: store.events(null).length,
        },
        null,
        2
      )
    );
    if (job?.status !== 'done') {
      console.error(
        job?.error || 'The collector did not complete successfully.'
      );
      process.exitCode = 1;
    }
  } finally {
    store.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Concert collection failed:', error);
  process.exitCode = 1;
});
