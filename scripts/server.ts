import { loadEnvConfig } from '@next/env';

async function main() {
  const mode = process.argv[2];
  if (mode !== 'dev' && mode !== 'start')
    throw new Error('Choose a server mode: dev or start.');
  loadEnvConfig(process.cwd(), mode === 'dev');
  const { runServices, serverCommands, serverEnvironment } =
    await import('../src/server/processes');
  const shutdown = new AbortController();
  const interrupt = () => shutdown.abort('SIGINT');
  const terminate = () => shutdown.abort('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    process.exitCode = await runServices(
      serverCommands(mode, process.argv.slice(3)),
      shutdown.signal,
      {
        env: serverEnvironment({
          ...process.env,
          NODE_ENV:
            process.env.NODE_ENV ||
            (mode === 'dev' ? 'development' : 'production'),
        }),
      }
    );
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
}

void main().catch((error: unknown) => {
  console.error('Server and worker startup failed:', error);
  process.exitCode = 1;
});
