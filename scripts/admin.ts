import { loadEnvConfig } from '@next/env';
import { parseArgs } from 'node:util';

async function main() {
  loadEnvConfig(process.cwd());
  const { values } = parseArgs({ options: { username: { type: 'string' } } });
  const { credentialsSchema } = await import('../src/server/auth');
  const username = credentialsSchema.shape.username.parse(values.username);
  const { getStore } = await import('../src/server/store');
  const store = getStore();
  try {
    const result = store.db
      .prepare("UPDATE users SET role = 'admin' WHERE username = ?")
      .run(username);
    if (!result.changes)
      throw new Error(
        'Create this account in the app before granting administrator access.'
      );
    console.log(
      'Administrator access granted to the existing account. Refresh the account page.'
    );
  } finally {
    store.close();
  }
}
void main().catch((error: unknown) => {
  console.error('Administrator bootstrap failed:', error);
  process.exitCode = 1;
});
