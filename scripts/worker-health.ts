import { loadEnvConfig } from '@next/env';

async function main() {
  loadEnvConfig(process.cwd());
  const { getStore } = await import('../src/server/store');
  const store = getStore();
  try {
    const heartbeat = store.db
      .prepare("SELECT expires_at FROM cache WHERE key = 'worker-heartbeat'")
      .get();
    if (!heartbeat || Number(heartbeat.expires_at) <= Date.now())
      throw new Error('The concert worker heartbeat is missing or expired.');
  } finally {
    store.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
