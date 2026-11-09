import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import * as webpush from 'web-push';
import { z } from 'zod';
import type { User } from '@/types';
import { tokenHash } from './auth';
import { appOrigin, notificationConfig } from './config';
import { AppError } from './errors';
import { logger } from './logger';
import type { ConcertStore } from './store';

const PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(4096)
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.port &&
        PUSH_HOSTS.has(url.hostname)
      );
    }, 'Use a subscription issued by a supported browser push service.'),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .refine((value) => Buffer.from(value, 'base64url').length === 65),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .refine((value) => Buffer.from(value, 'base64url').length === 16),
  }),
});

function mailTransport() {
  if (!notificationConfig().email)
    throw new AppError(
      503,
      'EMAIL_NOT_CONFIGURED',
      'Email delivery is not configured. Set SMTP_HOST and SMTP_FROM on the server.'
    );
  if (!!process.env.SMTP_USER !== !!process.env.SMTP_PASSWORD)
    throw new AppError(
      503,
      'EMAIL_NOT_CONFIGURED',
      'SMTP_USER and SMTP_PASSWORD must be configured together.'
    );
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 15000,
    requireTLS: !['localhost', '127.0.0.1', '::1'].includes(
      process.env.SMTP_HOST || ''
    ),
    socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const transport = mailTransport();
  try {
    const result = await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
    });
    if (!result.accepted?.length)
      throw new AppError(
        502,
        'EMAIL_REJECTED',
        'The mail server did not accept the message. Check server delivery logs.'
      );
  } finally {
    transport.close();
  }
}

export async function requestEmailVerification(
  store: ConcertStore,
  user: User,
  email: string
): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  await sendEmail(
    email,
    'Confirm concert notifications',
    `Confirm this email address while signed in to your account:\n${appOrigin()}/account?verify=${token}\n\nThe link expires in 24 hours. If you did not request concert notifications, ignore this message.`
  );
  store.transaction(() => {
    store.db
      .prepare(
        'DELETE FROM email_verifications WHERE user_id = ? OR expires_at < ?'
      )
      .run(user.id, Date.now());
    store.db
      .prepare(
        'INSERT INTO email_verifications (token_hash, user_id, email, expires_at) VALUES (?, ?, ?, ?)'
      )
      .run(tokenHash(token), user.id, email, Date.now() + 86400000);
  });
}

export function confirmEmail(
  store: ConcertStore,
  user: User,
  token: string
): void {
  const row = store.db
    .prepare(
      'SELECT email FROM email_verifications WHERE token_hash = ? AND user_id = ? AND expires_at > ?'
    )
    .get(tokenHash(token), user.id, Date.now());
  if (!row)
    throw new AppError(
      422,
      'VERIFICATION_EXPIRED',
      'This confirmation link is invalid or expired. Request a new email.'
    );
  store.transaction(() => {
    store.db
      .prepare(
        'UPDATE users SET email = ?, email_verified = 1, email_notifications = 1 WHERE id = ?'
      )
      .run(String(row.email), user.id);
    store.db
      .prepare('DELETE FROM email_verifications WHERE user_id = ?')
      .run(user.id);
  });
}

export async function deliverNotification(
  store: ConcertStore,
  notificationId: string
): Promise<void> {
  store.db
    .prepare('DELETE FROM sessions WHERE expires_at <= ?')
    .run(Date.now());
  const row = store.db
    .prepare('SELECT * FROM notifications WHERE id = ?')
    .get(notificationId);
  if (!row) {
    logger.info(
      { notification_id: notificationId },
      'Notification no longer exists; delivery cancelled'
    );
    return;
  }
  const user = store.user(String(row.user_id));
  const event = store.event(String(row.event_id));
  if (!user || !event || event.is_private) {
    logger.warn(
      { notification_id: notificationId },
      'Notification delivery cancelled because the public event or account is unavailable'
    );
    return;
  }
  const config = notificationConfig();
  const url = `${appOrigin()}/events/${encodeURIComponent(event.id)}`;
  if (
    config.email &&
    user.email_notifications &&
    user.email &&
    !row.email_sent_at
  ) {
    await sendEmail(
      user.email,
      `New show: ${event.title}`,
      `${event.title}\n${event.venue.name}, ${event.venue.city}\n${event.datetime || 'Date to be announced'}\n\n${url}\n\nManage notifications: ${appOrigin()}/account`
    );
    store.db
      .prepare('UPDATE notifications SET email_sent_at = ? WHERE id = ?')
      .run(new Date().toISOString(), notificationId);
  }
  if (config.push && !row.push_sent_at) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    const subscriptions = store.db
      .prepare(
        'SELECT payload, endpoint FROM push_subscriptions WHERE user_id = ?'
      )
      .all(user.id);
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          pushSubscriptionSchema.parse(
            JSON.parse(String(subscription.payload))
          ),
          JSON.stringify({
            title: 'A new show from your scene',
            body: event.title,
            url,
            tag: notificationId,
          }),
          { TTL: 86400, timeout: 15000 }
        );
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          [404, 410].includes(Number(error.statusCode))
        ) {
          store.db
            .prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
            .run(String(subscription.endpoint));
          logger.info(
            { notification_id: notificationId },
            'Expired browser push subscription removed'
          );
        } else throw error;
      }
    }
    store.db
      .prepare('UPDATE notifications SET push_sent_at = ? WHERE id = ?')
      .run(new Date().toISOString(), notificationId);
  }
}
