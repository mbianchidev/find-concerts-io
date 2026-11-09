import { performance } from 'node:perf_hooks';

async function main() {
  const target = new URL(process.env.LOAD_TEST_URL || 'http://127.0.0.1:3100');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname))
    throw new Error(
      'Load tests are restricted to a local, synthetic-data server.'
    );
  const paths = [
    '/api/v1/health',
    '/api/v1/events?limit=12',
    '/api/v1/artists?limit=12',
  ];
  const timings: number[] = [];
  let next = 0;
  const count = 60;
  const concurrency = 5;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        const index = next++;
        const started = performance.now();
        const response = await fetch(
          new URL(paths[index % paths.length], target),
          { signal: AbortSignal.timeout(10000) }
        );
        if (!response.ok)
          throw new Error(`Load request failed with HTTP ${response.status}.`);
        await response.json();
        timings.push(performance.now() - started);
      }
    })
  );
  timings.sort((a, b) => a - b);
  const p95 = timings[Math.ceil(timings.length * 0.95) - 1];
  console.log(
    JSON.stringify(
      {
        requests: count,
        concurrency,
        failures: 0,
        p95_ms: Math.round(p95),
        max_ms: Math.round(timings.at(-1) || 0),
        required_p95_ms: 1000,
      },
      null,
      2
    )
  );
  if (p95 >= 1000)
    throw new Error('The API load-test p95 must remain below 1,000 ms.');
}
void main().catch((error: unknown) => {
  console.error('Local API load test failed:', error);
  process.exitCode = 1;
});
