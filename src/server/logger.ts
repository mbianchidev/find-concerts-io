import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  redact: [
    'password',
    'password_hash',
    'token',
    'cookie',
    'email',
    'fields',
    'import_details',
  ],
});

export async function reportUnexpectedError(
  error: unknown,
  requestId: string
): Promise<void> {
  logger.error(
    { err: error, request_id: requestId },
    'Unexpected server error'
  );
  if (process.env.SENTRY_DSN) {
    const sentry = await import('@sentry/node');
    if (!sentry.isInitialized()) {
      sentry.init({
        dsn: process.env.SENTRY_DSN,
        includeServerName: false,
        defaultIntegrations: false,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          graphQL: { document: false, variables: false },
          genAI: { inputs: false, outputs: false },
          mcp: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          stackFrameVariables: false,
          frameContextLines: 0,
        },
        beforeSend(event) {
          delete event.user;
          delete event.request;
          delete event.extra;
          return event;
        },
      });
    }
    sentry.captureMessage('Unexpected concert service failure', {
      level: 'error',
      tags: { request_id: requestId },
    });
  }
}
