import { AppError } from './errors';

export function appOrigin(): string {
  const value = process.env.APP_ORIGIN || 'http://localhost:3000';
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (!local && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new AppError(
      500,
      'INVALID_CONFIGURATION',
      'APP_ORIGIN must be an HTTPS origin, or an HTTP localhost origin for local development.'
    );
  }
  return url.origin;
}

export function notificationConfig() {
  return {
    email: !!(process.env.SMTP_HOST && process.env.SMTP_FROM),
    push: !!(
      process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
    ),
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  };
}
