import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout as pause } from 'node:timers/promises';
import { z } from 'zod';
import {
  serverCommands,
  runServices,
  serverEnvironment,
  type ServiceCommand,
} from '../src/server/processes';

function syntheticService(
  name: ServiceCommand['name'],
  directory: string,
  options: { exitCode?: number; ignoreStop?: boolean } = {}
): ServiceCommand {
  const marker = resolve(directory, name);
  return {
    name,
    args: [
      '-e',
      `
      const fs = require('node:fs');
      const marker = ${JSON.stringify(marker)};
      fs.writeFileSync(marker, JSON.stringify({ pid: process.pid, database: process.env.DATABASE_PATH }));
      process.on('SIGTERM', () => {
        if (${!!options.ignoreStop}) return;
        fs.writeFileSync(marker + '.stopped', 'yes');
        process.exit(0);
      });
      setInterval(() => {
        if (${options.exitCode !== undefined} &&
          fs.existsSync(${JSON.stringify(resolve(directory, name === 'web' ? 'worker' : 'web'))}))
          process.exit(${options.exitCode ?? 0});
      }, 10);
    `,
    ],
  };
}

function marker(directory: string, name: string) {
  return z
    .object({
      pid: z.number().int().positive(),
      database: z.string().optional(),
    })
    .parse(JSON.parse(readFileSync(resolve(directory, name), 'utf8')));
}

async function waitFor(probe: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!probe()) {
    if (Date.now() >= deadline)
      throw new Error('The synthetic services did not become ready.');
    await pause(10);
  }
}

test('development and production startup both include the worker and preserve server arguments', () => {
  const args = ['--hostname', '127.0.0.1', '--port', '3200'];
  for (const mode of ['dev', 'start'] as const) {
    const commands = serverCommands(mode, args);
    assert.deepEqual(
      commands.map((command) => command.name),
      ['web', 'worker']
    );
    assert.deepEqual(commands[0].args.slice(1), [mode, ...args]);
    assert.deepEqual(commands[1].args, [
      '--import',
      'tsx',
      resolve('scripts/worker.ts'),
    ]);
  }
});

test('asking the server for CLI help does not launch a background collector', () => {
  for (const flag of ['--help', '-h']) {
    assert.deepEqual(
      serverCommands('start', [flag]).map((command) => command.name),
      ['web']
    );
  }
});

test('managed startup defaults to six-hour collection while preserving explicit queue-only configuration', () => {
  const configured: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    APP_ORIGIN: 'http://localhost:3200',
    DATABASE_PATH: '/synthetic/data.sqlite',
  };
  assert.equal(serverEnvironment(configured).SCRAPE_INTERVAL_MINUTES, '360');
  assert.equal(
    serverEnvironment({ ...configured, SCRAPE_INTERVAL_MINUTES: '' })
      .SCRAPE_INTERVAL_MINUTES,
    ''
  );
  assert.equal(
    serverEnvironment({ ...configured, SCRAPE_INTERVAL_MINUTES: '60' })
      .SCRAPE_INTERVAL_MINUTES,
    '60'
  );
  assert.equal(
    serverEnvironment(configured).DATABASE_PATH,
    configured.DATABASE_PATH
  );
  assert.equal(Reflect.get(configured, 'SCRAPE_INTERVAL_MINUTES'), undefined);
});

test('one server lifecycle starts both processes with the same database and shuts both down', async () => {
  const directory = mkdtempSync(
    resolve(tmpdir(), 'concerts-services-synthetic-')
  );
  const shutdown = new AbortController();
  let running: Promise<number> | undefined;
  try {
    const database = resolve(directory, 'synthetic.sqlite');
    running = runServices(
      [
        syntheticService('web', directory),
        syntheticService('worker', directory),
      ],
      shutdown.signal,
      {
        env: { ...process.env, DATABASE_PATH: database },
        shutdownTimeoutMs: 1000,
      }
    );
    await waitFor(
      () =>
        existsSync(resolve(directory, 'web')) &&
        existsSync(resolve(directory, 'worker'))
    );
    const processes = ['web', 'worker'].map((name) => marker(directory, name));
    assert.ok(processes.every((process) => process.database === database));
    shutdown.abort('SIGTERM');
    assert.equal(await running, 143);
    for (const [index, name] of ['web', 'worker'].entries()) {
      assert.equal(
        readFileSync(resolve(directory, `${name}.stopped`), 'utf8'),
        'yes'
      );
      assert.throws(() => process.kill(processes[index].pid, 0), {
        code: 'ESRCH',
      });
    }
  } finally {
    shutdown.abort('SIGTERM');
    await running;
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const failing of ['web', 'worker'] as const) {
  test(`an unexpected ${failing} failure stops its peer and preserves the failure exit code`, async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), 'concerts-failure-synthetic-')
    );
    const shutdown = new AbortController();
    let running: Promise<number> | undefined;
    try {
      running = runServices(
        [
          syntheticService(
            'web',
            directory,
            failing === 'web' ? { exitCode: 7 } : {}
          ),
          syntheticService(
            'worker',
            directory,
            failing === 'worker' ? { exitCode: 7 } : {}
          ),
        ],
        shutdown.signal,
        { shutdownTimeoutMs: 1000 }
      );
      assert.equal(await running, 7);
      const peer = failing === 'web' ? 'worker' : 'web';
      assert.equal(
        readFileSync(resolve(directory, `${peer}.stopped`), 'utf8'),
        'yes'
      );
      for (const name of ['web', 'worker']) {
        assert.throws(() => process.kill(marker(directory, name).pid, 0), {
          code: 'ESRCH',
        });
      }
    } finally {
      shutdown.abort('SIGTERM');
      await running;
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('shutdown cannot hang indefinitely on an unresponsive worker', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'concerts-stop-synthetic-'));
  const shutdown = new AbortController();
  let running: Promise<number> | undefined;
  try {
    running = runServices(
      [
        syntheticService('web', directory),
        syntheticService('worker', directory, { ignoreStop: true }),
      ],
      shutdown.signal,
      { shutdownTimeoutMs: 100 }
    );
    await waitFor(
      () =>
        existsSync(resolve(directory, 'web')) &&
        existsSync(resolve(directory, 'worker'))
    );
    const worker = marker(directory, 'worker');
    shutdown.abort('SIGTERM');
    assert.equal(await running, 143);
    assert.throws(() => process.kill(worker.pid, 0), { code: 'ESRCH' });
  } finally {
    shutdown.abort('SIGTERM');
    await running;
    rmSync(directory, { recursive: true, force: true });
  }
});
