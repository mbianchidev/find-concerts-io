import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:os';
import { logger } from './logger';

export interface ServiceCommand {
  name: 'web' | 'worker';
  args: string[];
}

export function serverEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    SCRAPE_INTERVAL_MINUTES: env.SCRAPE_INTERVAL_MINUTES ?? '360',
  };
}

export function serverCommands(
  mode: 'dev' | 'start',
  args: string[]
): ServiceCommand[] {
  const require = createRequire(resolve('package.json'));
  const web: ServiceCommand = {
    name: 'web',
    args: [require.resolve('next/dist/bin/next'), mode, ...args],
  };
  if (args.includes('--help') || args.includes('-h')) return [web];
  return [
    web,
    { name: 'worker', args: ['--import', 'tsx', resolve('scripts/worker.ts')] },
  ];
}

interface ServiceGroupOptions {
  env?: NodeJS.ProcessEnv;
  shutdownTimeoutMs?: number;
}

export function runServices(
  commands: ServiceCommand[],
  shutdown: AbortSignal,
  { env = process.env, shutdownTimeoutMs = 30000 }: ServiceGroupOptions = {}
): Promise<number> {
  if (!commands.length) throw new Error('No server processes were configured.');
  if (shutdown.aborted)
    return Promise.resolve(shutdown.reason === 'SIGINT' ? 130 : 143);
  return new Promise((resolveExit) => {
    const services: {
      name: ServiceCommand['name'];
      child: ChildProcess;
      closed: boolean;
    }[] = [];
    let starting = true;
    let stopping = false;
    let finished = false;
    let exitCode = 0;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const terminate = (child: ChildProcess, signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ESRCH')
          return;
        exitCode = 1;
        logger.error(
          { err: error, pid: child.pid, signal },
          'A managed server process could not be stopped'
        );
      }
    };
    const finish = () => {
      if (finished || starting || services.some((service) => !service.closed))
        return;
      finished = true;
      clearTimeout(deadline);
      shutdown.removeEventListener('abort', onShutdown);
      // Next's development CLI can own child processes of its own.
      for (const service of services) terminate(service.child, 'SIGKILL');
      resolveExit(exitCode);
    };
    const stop = (code: number, reason: string) => {
      if (stopping) {
        if (exitCode === 0 && code !== 0) exitCode = code;
        return;
      }
      stopping = true;
      exitCode = code;
      logger.info({ reason }, 'Stopping the web server and background worker');
      deadline = setTimeout(() => {
        logger.error(
          'Managed server shutdown timed out; terminating remaining processes'
        );
        if (exitCode === 0) exitCode = 1;
        for (const service of services) terminate(service.child, 'SIGKILL');
      }, shutdownTimeoutMs);
      for (const service of services) terminate(service.child, 'SIGTERM');
      finish();
    };
    const onShutdown = () =>
      stop(
        shutdown.reason === 'SIGINT' ? 130 : 143,
        'Server shutdown requested'
      );
    shutdown.addEventListener('abort', onShutdown, { once: true });

    for (const command of commands) {
      if (stopping) break;
      try {
        const child = spawn(process.execPath, command.args, {
          env,
          stdio: 'inherit',
          detached: process.platform !== 'win32',
        });
        const service = { name: command.name, child, closed: false };
        services.push(service);
        logger.info(
          { service: service.name, pid: child.pid },
          'Managed server process started'
        );
        child.once('error', (error) => {
          logger.error(
            { err: error, service: service.name },
            'Managed server process failed to start'
          );
          stop(1, `${service.name} failed to start`);
        });
        child.once('close', (code, signal) => {
          service.closed = true;
          if (!stopping) {
            const normalExit = command.name === 'web' && code === 0;
            const failureCode =
              code && code > 0
                ? code
                : signal
                  ? 128 + constants.signals[signal]
                  : 1;
            if (!normalExit)
              logger.error(
                { service: service.name, code, signal },
                'Managed server process exited unexpectedly'
              );
            stop(normalExit ? 0 : failureCode, `${service.name} exited`);
          }
          finish();
        });
      } catch (error) {
        logger.error(
          { err: error, service: command.name },
          'Managed server process could not be launched'
        );
        stop(1, `${command.name} could not be launched`);
      }
    }
    starting = false;
    finish();
  });
}
