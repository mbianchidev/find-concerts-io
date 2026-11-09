import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { User } from '@/types';
import { appOrigin } from './config';
import { AppError } from './errors';
import type { ConcertStore } from './store';

const COOKIE_NAME = 'concerts_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Use letters, numbers, underscores, or hyphens.'
    ),
  password: z.string().min(12, 'Use at least 12 characters.').max(1024),
});

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      }
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(24).toString('hex');
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  encoded?: string
): Promise<boolean> {
  const parts = encoded?.split(':');
  if (
    encoded &&
    (parts?.length !== 3 ||
      parts[0] !== 'scrypt-v1' ||
      !/^[a-f0-9]{48}$/.test(parts[1]) ||
      !/^[a-f0-9]{128}$/.test(parts[2]))
  ) {
    throw new Error('Stored password hash has an invalid format.');
  }
  const key = await derive(password, parts?.[1] || '0'.repeat(48));
  const expected = parts ? Buffer.from(parts[2], 'hex') : Buffer.alloc(64);
  return timingSafeEqual(key, expected) && !!encoded;
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function tokenFrom(request: Request): string | undefined {
  const cookie = (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

export function currentSessionHash(request: Request): string | undefined {
  const token = tokenFrom(request);
  return token ? tokenHash(token) : undefined;
}

export function currentUser(
  request: Request,
  store: ConcertStore
): User | undefined {
  const token = tokenFrom(request);
  if (!token) return undefined;
  const session = store.db
    .prepare(
      'SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?'
    )
    .get(tokenHash(token), Date.now());
  return session ? store.user(String(session.user_id)) : undefined;
}

export function requireUser(request: Request, store: ConcertStore): User {
  const user = currentUser(request, store);
  if (!user)
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Sign in to access your private concerts and saved artists.'
    );
  return user;
}

export function sessionCookie(store: ConcertStore, userId: string): string {
  const token = randomBytes(32).toString('base64url');
  store.db
    .prepare('DELETE FROM sessions WHERE expires_at <= ?')
    .run(Date.now());
  store.db
    .prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
    )
    .run(tokenHash(token), userId, Date.now() + SESSION_MS);
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${appOrigin().startsWith('https:') ? '; Secure' : ''}`;
}

export function endSession(request: Request, store: ConcertStore): string {
  const token = tokenFrom(request);
  if (token)
    store.db
      .prepare('DELETE FROM sessions WHERE token_hash = ?')
      .run(tokenHash(token));
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${appOrigin().startsWith('https:') ? '; Secure' : ''}`;
}

export function checkOrigin(request: Request): void {
  if (request.headers.get('origin') !== appOrigin()) {
    throw new AppError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'This action must be sent from the app itself.'
    );
  }
}

export function clientKey(request: Request): string {
  const forwarded =
    process.env.TRUST_PROXY === 'true'
      ? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
      : undefined;
  return tokenHash(
    forwarded && /^[a-fA-F0-9:.]{1,60}$/.test(forwarded)
      ? forwarded
      : 'direct-connection'
  );
}
