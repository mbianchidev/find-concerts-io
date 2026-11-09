import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PageResult } from '@/types';
import {
  artistKey,
  collectArtists,
  collectTours,
  filterEvents,
  isUpcoming,
  recommendEvents,
  trendingEvents,
} from '@/lib/concerts';
import { calendarFile } from '@/lib/calendar';
import {
  checkOrigin,
  clientKey,
  credentialsSchema,
  currentSessionHash,
  currentUser,
  endSession,
  hashPassword,
  requireUser,
  sessionCookie,
  verifyPassword,
} from './auth';
import { notificationConfig } from './config';
import { AppError } from './errors';
import { inspectWorkbook, mappingSchema, parseWorkbook } from './imports';
import { logger, reportUnexpectedError } from './logger';
import {
  confirmEmail,
  pushSubscriptionSchema,
  requestEmailVerification,
} from './notifications';
import { eventSchema, profileUpdateSchema } from '@/lib/schema';
import { sourceStatuses } from './scraper';
import { ConcertStore, getStore } from './store';
import { spotifyClient, TicketmasterClient } from './providers';
import { readLimitedBody } from './http';

const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  artist: z.string().max(250).optional(),
  city: z.string().trim().max(250).optional(),
  location: z.string().max(250).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  genre: z.string().max(100).optional(),
  past: z.enum(['true', 'false']).optional(),
  saved: z.enum(['true', 'false']).optional(),
  view: z.enum(['all', 'trending']).optional(),
  ids: z.string().max(6000).optional(),
});

function data(value: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json({ data: value }, { status, headers });
}

function page<T>(items: T[], query: z.infer<typeof pagination>): Response {
  const result: PageResult<T> = {
    data: items.slice((query.page - 1) * query.limit, query.page * query.limit),
    meta: {
      total: items.length,
      page: query.page,
      limit: query.limit,
      has_next: query.page * query.limit < items.length,
    },
  };
  return Response.json(result);
}

async function bodyBytes(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > limit)
    throw new AppError(
      413,
      'BODY_TOO_LARGE',
      'The request exceeds the upload size limit.'
    );
  return readLimitedBody(
    request.body,
    limit,
    new AppError(
      413,
      'BODY_TOO_LARGE',
      'The request exceeds the upload size limit.'
    )
  );
}

async function json(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(
      415,
      'JSON_REQUIRED',
      'Send the request as application/json.'
    );
  const bytes = await bodyBytes(request, 64 * 1024);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new AppError(
      400,
      'INVALID_JSON',
      'The request body is not valid JSON.'
    );
  }
}

async function workbookUpload(request: Request) {
  const bytes = await bodyBytes(request, 5 * 1024 * 1024 + 64 * 1024);
  let form;
  try {
    form = await new Response(new Uint8Array(bytes), {
      headers: { 'content-type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new AppError(
      400,
      'INVALID_UPLOAD',
      'Upload the workbook using a multipart form.'
    );
  }
  const file = form.get('file');
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx'))
    throw new AppError(
      422,
      'XLSX_REQUIRED',
      'Select an .xlsx workbook. Export Numbers documents as Excel first.'
    );
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mappings: form.get('mappings'),
  };
}

async function route(request: Request, store: ConcertStore): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/api\/v1\/?/, '').replace(/\/$/, '');
  const method = request.method;
  const key = clientKey(request);
  store.rateLimit(`api:${key}`, 600, 60000);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) checkOrigin(request);
  if (method === 'OPTIONS') return new Response(null, { status: 204 });

  if (path === 'health' && method === 'GET') {
    store.db.prepare('SELECT 1').get();
    return data({
      status: 'ok',
      notifications: notificationConfig(),
      providers: {
        spotify: !!(
          process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
        ),
        ticketmaster: !!process.env.TICKETMASTER_API_KEY,
      },
    });
  }
  if (path === 'users' && method === 'POST') {
    store.rateLimit(`auth:${key}`, 10, 15 * 60000);
    const credentials = credentialsSchema.parse(await json(request));
    const user = store.createUser(
      credentials.username,
      await hashPassword(credentials.password)
    );
    return data(user, 201, { 'set-cookie': sessionCookie(store, user.id) });
  }
  if (path === 'sessions' && method === 'POST') {
    store.rateLimit(`auth:${key}`, 10, 15 * 60000);
    const credentials = credentialsSchema.parse(await json(request));
    const stored = store.credentials(credentials.username);
    if (
      !(await verifyPassword(credentials.password, stored?.password_hash)) ||
      !stored
    )
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'The username or password is incorrect.'
      );
    return data(store.user(stored.id), 200, {
      'set-cookie': sessionCookie(store, stored.id),
    });
  }
  if (path === 'sessions/current' && method === 'GET')
    return data(currentUser(request, store) || null);
  if (path === 'sessions/current' && method === 'DELETE')
    return data({ signed_out: true }, 200, {
      'set-cookie': endSession(request, store),
    });

  const query = () => pagination.parse(Object.fromEntries(url.searchParams));
  const catalogue = () =>
    z
      .array(eventSchema)
      .parse(
        store.cached('public-catalogue', 30000, () => store.events(null, true))
      );

  if (['cities', 'me/cities'].includes(path) && method === 'GET') {
    const venues = [
      ...store.venues(catalogue()),
      ...(path === 'me/cities'
        ? store
            .events(requireUser(request, store).id, true)
            .map((event) => event.venue)
        : []),
    ];
    const cities = new Map(
      venues
        .map((venue) => venue.city.trim())
        .filter(Boolean)
        .map((city) => [artistKey(city), city])
    );
    return data([...cities.values()].sort((a, b) => a.localeCompare(b)));
  }

  if (path === 'events' && method === 'GET') {
    const filters = query();
    let events = catalogue();
    if (filters.past !== 'true')
      events = events.filter((event) => isUpcoming(event));
    events = filterEvents(events, filters);
    if (filters.ids !== undefined) {
      const ids = new Set(filters.ids.split(',').filter(Boolean));
      if (ids.size > 30)
        throw new AppError(
          422,
          'TOO_MANY_IDS',
          'Request at most 30 concert IDs at once.'
        );
      events = events.filter((event) => ids.has(event.id));
    }
    if (filters.saved === 'true') {
      const user = requireUser(request, store);
      const saved = new Set(
        store
          .saves(user.id)
          .filter((item) => item.type === 'event')
          .map((item) => item.id)
      );
      events = events.filter((event) => saved.has(event.id));
    }
    if (filters.view === 'trending')
      events = trendingEvents(events, filters.location);
    return page(events, filters);
  }
  const eventRoute = /^events\/([^/]+)(?:\/(calendar|similar))?$/.exec(path);
  if (eventRoute && method === 'GET') {
    const event = store.event(
      decodeURIComponent(eventRoute[1]),
      currentUser(request, store)?.id
    );
    if (!event)
      throw new AppError(
        404,
        'EVENT_NOT_FOUND',
        'This concert is unavailable or belongs to another account.'
      );
    if (eventRoute[2] === 'calendar') {
      if (!event.datetime)
        throw new AppError(
          422,
          'DATE_UNCONFIRMED',
          'Add a confirmed concert date before exporting to a calendar.'
        );
      return new Response(calendarFile(event), {
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          'content-disposition': 'attachment; filename="concert.ics"',
        },
      });
    }
    if (eventRoute[2] === 'similar') {
      const filters = query();
      return page(
        filterEvents(
          recommendEvents(store.events(null), [], undefined, event),
          filters
        ),
        filters
      );
    }
    return data(event);
  }
  if (['artists', 'venues', 'tours'].includes(path) && method === 'GET') {
    const filters = query();
    const events = filterEvents(store.events(null), filters);
    if (path === 'artists')
      return page(
        collectArtists(events).filter(
          (artist) =>
            !filters.artist ||
            artist.name.toLowerCase().includes(filters.artist.toLowerCase())
        ),
        filters
      );
    if (path === 'venues') {
      const saved =
        filters.saved === 'true'
          ? new Set(
              store
                .saves(requireUser(request, store).id)
                .filter((item) => item.type === 'venue')
                .map((item) => item.id)
            )
          : undefined;
      const contains = (value: string, search?: string) =>
        !search || artistKey(value).includes(artistKey(search));
      const venues = store
        .venues(events)
        .filter(
          (venue) =>
            (!filters.city ||
              artistKey(venue.city) === artistKey(filters.city)) &&
            contains(
              [venue.name, venue.city, venue.country].join(' '),
              filters.location
            ) &&
            contains((venue.genres || []).join(' '), filters.genre) &&
            (!(filters.artist || filters.date) || venue.event_count > 0) &&
            (!saved || saved.has(venue.id))
        );
      return page(venues, filters);
    }
    return page(collectTours(events), filters);
  }
  if (path === 'sources' && method === 'GET')
    return data(sourceStatuses(store));

  if (path === 'me/events' && method === 'GET') {
    const user = requireUser(request, store);
    const filters = query();
    return page(filterEvents(store.events(user.id, true), filters), filters);
  }
  if (path === 'me/recommendations' && method === 'GET') {
    const user = requireUser(request, store);
    const filters = query();
    const candidates = [
      ...store.events(null, true),
      ...store.events(user.id, true),
    ];
    return page(
      filterEvents(
        recommendEvents(candidates, store.saves(user.id)).filter(
          (event) => !event.is_private
        ),
        filters
      ),
      filters
    );
  }
  if (path === 'me/saved' && method === 'GET')
    return data(store.saves(requireUser(request, store).id));
  if (path === 'me/saved-events' && method === 'GET') {
    const user = requireUser(request, store);
    const events = store
      .saves(user.id)
      .filter((item) => item.type === 'event')
      .flatMap((item) => {
        const event = store.event(item.id, user.id);
        return event ? [event] : [];
      });
    const filters = query();
    return page(filterEvents(events, filters), filters);
  }
  if (path === 'me/saved' && method === 'PUT') {
    const user = requireUser(request, store);
    const input = z
      .object({
        type: z.enum(['event', 'artist', 'venue']),
        id: z.string().min(1).max(1500),
        saved: z.boolean(),
      })
      .parse(await json(request));
    const events = [
      ...store.events(null, true),
      ...store.events(user.id, true),
    ];
    const exists =
      input.type === 'event'
        ? !!store.event(input.id, user.id)
        : input.type === 'artist'
          ? events.some((event) =>
              event.lineup.some((name) => artistKey(name) === input.id)
            )
          : store.venues(events).some((venue) => venue.id === input.id);
    if (input.saved && !exists)
      throw new AppError(
        404,
        'SAVE_TARGET_NOT_FOUND',
        'The concert, artist, or venue is no longer available.'
      );
    store.setSaved(user.id, input.type, input.id, input.saved);
    return data(store.saves(user.id));
  }
  if (path === 'imports/preview' && method === 'POST') {
    const user = requireUser(request, store);
    store.rateLimit(`import:${user.id}`, 20, 3600000);
    const { buffer } = await workbookUpload(request);
    return data(await inspectWorkbook(buffer));
  }
  if (path === 'imports' && method === 'POST') {
    const user = requireUser(request, store);
    store.rateLimit(`import:${user.id}`, 20, 3600000);
    const { buffer, mappings } = await workbookUpload(request);
    let mapping;
    try {
      mapping = typeof mappings === 'string' ? JSON.parse(mappings) : null;
    } catch {
      throw new AppError(
        400,
        'INVALID_MAPPING',
        'The worksheet mapping is not valid JSON.'
      );
    }
    return data(
      store.importEvents(
        user.id,
        await parseWorkbook(
          buffer,
          z.array(mappingSchema).min(1).max(20).parse(mapping)
        )
      ),
      201
    );
  }
  if (path === 'imports' && method === 'GET') {
    const user = requireUser(request, store);
    return data(
      store.db
        .prepare(
          'SELECT id, report, created_at FROM imports WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
        )
        .all(user.id)
        .map((row) => ({
          id: String(row.id),
          report: JSON.parse(String(row.report)),
          created_at: String(row.created_at),
        }))
    );
  }
  if (path === 'notifications' && method === 'GET')
    return data(store.notifications(requireUser(request, store).id));
  if (path === 'notifications' && method === 'PATCH') {
    const user = requireUser(request, store);
    const input = z
      .object({ id: z.string().uuid().optional() })
      .parse(await json(request));
    if (input.id)
      store.db
        .prepare(
          'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?'
        )
        .run(new Date().toISOString(), input.id, user.id);
    else
      store.db
        .prepare(
          'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL'
        )
        .run(new Date().toISOString(), user.id);
    return data(store.notifications(user.id));
  }
  if (path === 'push-config' && method === 'GET')
    return data(notificationConfig());
  if (path === 'push-subscriptions' && method === 'GET') {
    const user = requireUser(request, store);
    return data({
      enabled: !!store.db
        .prepare(
          'SELECT endpoint FROM push_subscriptions WHERE user_id = ? AND session_hash = ? LIMIT 1'
        )
        .get(user.id, currentSessionHash(request) || ''),
    });
  }
  if (path === 'push-subscriptions' && method === 'POST') {
    const user = requireUser(request, store);
    const subscription = pushSubscriptionSchema.parse(await json(request));
    if (!notificationConfig().push)
      throw new AppError(
        503,
        'PUSH_NOT_CONFIGURED',
        'Browser push is not configured. Set the server VAPID keys and subject.'
      );
    const existing = store.db
      .prepare('SELECT user_id FROM push_subscriptions WHERE endpoint = ?')
      .get(subscription.endpoint);
    if (existing && existing.user_id !== user.id)
      throw new AppError(
        409,
        'SUBSCRIPTION_IN_USE',
        'This browser subscription belongs to a different account. Disable it there first.'
      );
    store.db
      .prepare(
        'INSERT OR REPLACE INTO push_subscriptions (endpoint, user_id, session_hash, payload) VALUES (?, ?, ?, ?)'
      )
      .run(
        subscription.endpoint,
        user.id,
        currentSessionHash(request) || '',
        JSON.stringify(subscription)
      );
    return data({ enabled: true }, 201);
  }
  if (path === 'push-subscriptions' && method === 'DELETE') {
    const user = requireUser(request, store);
    const input = z
      .object({ endpoint: z.string().max(4096).optional() })
      .parse(await json(request));
    if (input.endpoint)
      store.db
        .prepare(
          'DELETE FROM push_subscriptions WHERE user_id = ? AND session_hash = ? AND endpoint = ?'
        )
        .run(user.id, currentSessionHash(request) || '', input.endpoint);
    else
      store.db
        .prepare(
          'DELETE FROM push_subscriptions WHERE user_id = ? AND session_hash = ?'
        )
        .run(user.id, currentSessionHash(request) || '');
    return data({ enabled: false });
  }
  if (path === 'email-verifications' && method === 'POST') {
    const user = requireUser(request, store);
    store.rateLimit(`email:${user.id}`, 3, 3600000);
    const input = z
      .object({ email: z.string().email().max(254) })
      .parse(await json(request));
    await requestEmailVerification(store, user, input.email);
    return data({ confirmation_sent: true });
  }
  if (path === 'email-verifications/confirm' && method === 'POST') {
    const user = requireUser(request, store);
    const input = z
      .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
      .parse(await json(request));
    confirmEmail(store, user, input.token);
    return data(store.user(user.id));
  }
  if (path === 'me/profile' && method === 'GET')
    return data(requireUser(request, store));
  if (path === 'me/profile' && method === 'PATCH') {
    const user = requireUser(request, store);
    store.rateLimit(`profile:${user.id}`, 30, 15 * 60000);
    const input = profileUpdateSchema.parse(await json(request));
    store.db
      .prepare(
        'UPDATE users SET display_name = coalesce(?, display_name), location = coalesce(?, location), bio = coalesce(?, bio) WHERE id = ?'
      )
      .run(
        input.display_name ?? null,
        input.location ?? null,
        input.bio ?? null,
        user.id
      );
    return data(store.user(user.id));
  }
  if (path === 'me/password' && method === 'PATCH') {
    const user = requireUser(request, store);
    store.rateLimit(`password:${user.id}`, 5, 15 * 60000);
    const input = z
      .object({
        current_password: z.string().min(1).max(1024),
        new_password: credentialsSchema.shape.password,
        confirm_password: z.string().min(1).max(1024),
      })
      .strict()
      .refine((value) => value.new_password === value.confirm_password, {
        path: ['confirm_password'],
        message: 'New passwords must match.',
      })
      .parse(await json(request));
    const credentials = store.credentials(user.username);
    if (
      !credentials ||
      !(await verifyPassword(input.current_password, credentials.password_hash))
    )
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'The current password is incorrect.'
      );
    if (input.current_password === input.new_password)
      throw new AppError(
        422,
        'PASSWORD_UNCHANGED',
        'Choose a different new password.'
      );
    const nextHash = await hashPassword(input.new_password);
    const cookie = store.transaction(() => {
      const updated = store.db
        .prepare(
          'UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?'
        )
        .run(nextHash, user.id, credentials.password_hash);
      if (!updated.changes)
        throw new AppError(
          409,
          'PASSWORD_CHANGED',
          'The password changed in another request. Sign in again before retrying.'
        );
      store.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      return sessionCookie(store, user.id);
    });
    return data({ changed: true }, 200, { 'set-cookie': cookie });
  }
  if (path === 'me' && method === 'PATCH') {
    const user = requireUser(request, store);
    const input = z
      .object({ email_notifications: z.boolean() })
      .parse(await json(request));
    if (input.email_notifications && !user.email)
      throw new AppError(
        422,
        'EMAIL_NOT_VERIFIED',
        'Confirm an email address before enabling email notifications.'
      );
    store.db
      .prepare('UPDATE users SET email_notifications = ? WHERE id = ?')
      .run(Number(input.email_notifications), user.id);
    return data(store.user(user.id));
  }
  if (path === 'me/export' && method === 'GET') {
    const user = requireUser(request, store);
    return Response.json(
      {
        user,
        concerts: store.events(user.id, true),
        saved: store.saves(user.id),
        notifications: store.notifications(user.id),
      },
      {
        headers: {
          'content-disposition': 'attachment; filename="my-concert-data.json"',
        },
      }
    );
  }
  if (path === 'me' && method === 'DELETE') {
    const user = requireUser(request, store);
    const input = z
      .object({ password: z.string().min(1).max(1024) })
      .parse(await json(request));
    const credentials = store.credentials(user.username);
    if (!(await verifyPassword(input.password, credentials?.password_hash)))
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Enter your current password to delete this account.'
      );
    store.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    return data({ deleted: true }, 200, {
      'set-cookie': endSession(request, store),
    });
  }
  if (path === 'jobs' && ['GET', 'POST'].includes(method)) {
    const user = requireUser(request, store);
    if (user.role !== 'admin')
      throw new AppError(
        403,
        'ADMIN_REQUIRED',
        'Only a server administrator can run the public collector.'
      );
    if (method === 'POST') {
      z.object({ type: z.literal('scrape') }).parse(await json(request));
      store.rateLimit('public-collector', 1, 15 * 60000);
      return data(
        {
          id: store.enqueue('scrape'),
          status: 'pending',
          message:
            'Queued for the background worker. Keep npm run worker running.',
        },
        202
      );
    }
    const heartbeat = store.db
      .prepare("SELECT expires_at FROM cache WHERE key = 'worker-heartbeat'")
      .get();
    return data({
      worker_online: !!heartbeat && Number(heartbeat.expires_at) > Date.now(),
      jobs: store.db
        .prepare(
          'SELECT id, kind, status, attempts, error, created_at, completed_at FROM jobs ORDER BY created_at DESC LIMIT 20'
        )
        .all(),
    });
  }
  if (path === 'integrations/spotify/artists' && method === 'GET') {
    const user = requireUser(request, store);
    store.rateLimit(`spotify:${user.id}`, 30, 15 * 60000);
    const input = z
      .object({ q: z.string().trim().min(2).max(200) })
      .parse(Object.fromEntries(url.searchParams));
    return data(await spotifyClient().searchArtists(input.q));
  }
  if (path === 'integrations/ticketmaster/searches' && method === 'POST') {
    const user = requireUser(request, store);
    store.rateLimit(`ticketmaster:${user.id}`, 30, 15 * 60000);
    const input = z
      .object({
        q: z.string().trim().min(2).max(200),
        city: z.string().trim().max(200).default(''),
        genre: z
          .enum(['Metal', 'Hardcore punk', 'Rock', 'Punk'])
          .default('Rock'),
      })
      .parse(await json(request));
    const result = await new TicketmasterClient(
      process.env.TICKETMASTER_API_KEY || ''
    ).searchEvents(input.q, input.city, input.genre);
    store.upsertPublic(result.events);
    return data(result, 201);
  }
  if (path === 'metrics' && method === 'POST') {
    const input = z
      .object({
        consent: z.literal(true),
        name: z.enum(['CLS', 'INP', 'LCP', 'page_view', 'search']),
        value: z.number().finite().min(0).max(3600000),
      })
      .parse(await json(request));
    if (request.headers.get('dnt') === '1')
      return data({ recorded: false, reason: 'Do Not Track is enabled.' });
    store.db
      .prepare('INSERT INTO metrics (name, value, created_at) VALUES (?, ?, ?)')
      .run(input.name, input.value, Date.now());
    return data({ recorded: true }, 201);
  }
  if (path === 'metrics' && method === 'GET') {
    const user = requireUser(request, store);
    if (user.role !== 'admin')
      throw new AppError(
        403,
        'ADMIN_REQUIRED',
        'Only administrators can view operational metrics.'
      );
    return data(
      store.db
        .prepare(
          'SELECT name, count(*) AS samples, avg(value) AS average, max(value) AS maximum FROM metrics GROUP BY name'
        )
        .all()
    );
  }
  throw new AppError(404, 'NOT_FOUND', 'This API resource does not exist.');
}

export async function handleApi(
  request: Request,
  store: ConcertStore = getStore()
): Promise<Response> {
  const started = performance.now();
  const requestId = randomUUID();
  let response: Response;
  try {
    response = await route(request, store);
  } catch (error) {
    const known = error instanceof AppError;
    const validation = error instanceof z.ZodError;
    const status = known ? error.status : validation ? 422 : 500;
    if (!known && !validation) await reportUnexpectedError(error, requestId);
    else
      logger.warn(
        {
          request_id: requestId,
          status,
          code: known ? error.code : 'VALIDATION_FAILED',
        },
        'API request rejected'
      );
    response = Response.json(
      {
        error: {
          code: known
            ? error.code
            : validation
              ? 'VALIDATION_FAILED'
              : 'INTERNAL_ERROR',
          message: known
            ? error.message
            : validation
              ? error.issues
                  .map(
                    (issue) =>
                      `${issue.path.join('.') || 'request'}: ${issue.message}`
                  )
                  .join('; ')
              : 'The server could not complete this request. Use the request ID when checking server logs.',
          ...(known && error.details ? { details: error.details } : {}),
          request_id: requestId,
        },
      },
      { status }
    );
    if (
      status === 429 &&
      known &&
      error.details &&
      typeof error.details === 'object' &&
      'retry_after' in error.details
    ) {
      response.headers.set('retry-after', String(error.details.retry_after));
    }
  }
  const duration = Math.round((performance.now() - started) * 100) / 100;
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'no-referrer');
  logger.info(
    {
      request_id: requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
      duration_ms: duration,
    },
    'API request'
  );
  try {
    store.db
      .prepare('INSERT INTO metrics (name, value, created_at) VALUES (?, ?, ?)')
      .run('api_duration_ms', duration, Date.now());
    store.db
      .prepare('DELETE FROM metrics WHERE created_at < ?')
      .run(Date.now() - 14 * 86400000);
  } catch (error) {
    logger.error(
      { err: error, request_id: requestId },
      'Operational metrics could not be stored'
    );
  }
  return response;
}
