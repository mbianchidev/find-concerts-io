import { createHash } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { z } from 'zod';
import type { Event, SourceStatus, Venue } from '@/types';
import { artistKey, isUpcoming } from '@/lib/concerts';
import { AppError } from './errors';
import { parseConcertDate } from './imports';
import { logger } from './logger';
import { eventSchema } from '@/lib/schema';
import type { ConcertStore } from './store';
import { readLimitedBody } from './http';
import {
  CALENDAR_SOURCES,
  metalDeSearches,
  parseMetalAgendaPage,
  parseMetalDeCalendar,
  type CalendarResult,
} from './calendars';

export interface ConcertSource {
  id: string;
  name: string;
  url: string;
  linkSelector: string;
  venue: Venue;
}

export const SOURCES: ConcertSource[] = [
  {
    id: 'underworld',
    name: 'The Underworld',
    url: 'https://www.theunderworldcamden.co.uk/',
    linkSelector: 'h3 a[href*="/event/"]',
    venue: {
      name: 'The Underworld',
      city: 'London',
      region: 'England',
      country: 'United Kingdom',
      latitude: '',
      longitude: '',
    },
  },
  {
    id: 'black-heart',
    name: 'The Black Heart',
    url: 'https://www.ourblackheart.com/events',
    linkSelector: 'a[href^="/events/20"]',
    venue: {
      name: 'The Black Heart',
      city: 'London',
      region: 'England',
      country: 'United Kingdom',
      latitude: '',
      longitude: '',
    },
  },
];

const COLLECTION_SOURCES = [...SOURCES, ...CALENDAR_SOURCES];

const USER_AGENT =
  'FindConcertsIO/1.0 (+https://github.com/mbianchidev/find-concerts-io)';
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const MAX_PAGES = 40;
const structuredEvent = z
  .object({
    '@type': z.union([z.string(), z.array(z.string())]),
    name: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    eventStatus: z.string().optional(),
  })
  .passthrough();

export function trustedSourceUrl(
  value: string,
  source: Pick<ConcertSource, 'url'>
): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.origin === new URL(source.url).origin &&
      !url.username &&
      !url.password &&
      value.length < 2048
    );
  } catch {
    return false;
  }
}

export function classifyGenres(text: string): string[] {
  const content = text.replace(/Metal Hammer|Rock Sound|Punknews/gi, '');
  const matches: [string, RegExp][] = [
    [
      'Metal',
      /\b(?:metal|metalcore|deathcore|thrash|djent|doom|blackened|grindcore|deathjazz)\b/i,
    ],
    [
      'Hardcore punk',
      /\b(?:hardcore|metalcore|deathcore|mathcore|powerviolence)\b/i,
    ],
    ['Rock', /\b(?:rock|grunge|shoegaze|psych-rock|rockabilly)\b/i],
    ['Punk', /\b(?:punk|ska|skacore)\b/i],
  ];
  return matches
    .filter(([, pattern]) => pattern.test(content))
    .map(([genre]) => genre);
}

export function shouldRefreshSourceEvent(
  event: Event,
  alreadyCollected: boolean
): boolean {
  return (
    isUpcoming(event) ||
    (alreadyCollected &&
      (event.status === 'cancelled' || event.status === 'postponed'))
  );
}

function findStructuredEvent(
  value: unknown,
  depth = 0
): z.infer<typeof structuredEvent> | undefined {
  if (depth > 10 || !value || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const event = findStructuredEvent(item, depth + 1);
      if (event) return event;
    }
    return undefined;
  }
  const parsed = structuredEvent.safeParse(value);
  if (
    parsed.success &&
    [parsed.data['@type']]
      .flat()
      .some((type) => type === 'MusicEvent' || type === 'Event')
  )
    return parsed.data;
  const graph = Reflect.get(value, '@graph');
  return graph ? findStructuredEvent(graph, depth + 1) : undefined;
}

function validTimestamp(value?: string): string | undefined {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ||
    !parseConcertDate(value.slice(0, 10)).datetime ||
    !Number.isFinite(Date.parse(value))
  )
    return undefined;
  return value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
}

function londonTime(date: string, time: string): string | undefined {
  const match = /(\d{1,2})[:.](\d{2})\s*(AM|PM)/i.exec(time);
  if (!match) return undefined;
  const hour =
    (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  const minute = Number(match[2]);
  if (Number(match[1]) < 1 || Number(match[1]) > 12 || minute > 59)
    return undefined;
  const offset = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value;
  return `${date}T${String(hour).padStart(2, '0')}:${match[2]}:00${offset === 'GMT+1' ? '+01:00' : '+00:00'}`;
}

export function parseSourcePage(
  html: string,
  url: string,
  source: ConcertSource
): Event | undefined {
  const $ = load(html);
  const article = $('article.event, article.eventitem').first();
  if (!article.length) return undefined;
  let structured: z.infer<typeof structuredEvent> | undefined;
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      structured ||= findStructuredEvent(JSON.parse($(script).text()));
    } catch (error) {
      logger.warn(
        {
          source: source.id,
          url,
          error: error instanceof Error ? error.name : 'ParseError',
        },
        'Invalid public JSON-LD block'
      );
    }
  });
  const title = article.find('h1').first().text().trim();
  const clean = article.clone();
  clean.find('script, style, nav, iframe').remove();
  const content = clean.text().replace(/\s+/g, ' ');
  const genres = classifyGenres(`${title} ${content}`);
  if (
    !title ||
    !genres.length ||
    /\b(?:club night|blackout club|camden rocks club|rave|DJ set)\b/i.test(
      title
    )
  )
    return undefined;
  const explicitDate = validTimestamp(structured?.startDate);
  const dateText = article
    .find('.event-header-date time')
    .first()
    .text()
    .trim()
    .replace(/^[a-z]+\s+/i, '');
  const date = parseConcertDate(dateText).datetime;
  const time = article
    .find('time')
    .toArray()
    .map((element) => $(element).text())
    .find((text) => /\d[:.]\d{2}\s*(?:AM|PM)/i.test(text));
  const datetime =
    explicitDate || (date && time ? londonTime(date, time) : date);
  if (!datetime)
    throw new AppError(
      422,
      'SOURCE_DATE_MISSING',
      `A concert date could not be verified on ${url}.`
    );
  const end = validTimestamp(structured?.endDate);
  const image =
    article
      .find('.event-header-image img, .eventitem-column-content img')
      .first()
      .attr('src') || $('meta[property="og:image"]').attr('content');
  const imageUrl = image
    ? new URL(image, url).href.replace(/^http:/, 'https:')
    : undefined;
  const supportedImage =
    imageUrl &&
    [
      'dice-media.imgix.net',
      'images.squarespace-cdn.com',
      'static1.squarespace.com',
    ].includes(new URL(imageUrl).hostname)
      ? imageUrl
      : undefined;
  const rawStatus = `${title} ${structured?.eventStatus || ''}`.toLowerCase();
  const headliners = title
    .replace(/\s*\|.*$/, '')
    .replace(/\s*-\s*\[.*$/, '')
    .split(/\s+(?:x|\+|\/)\s+/i)
    .map((name) => name.trim())
    .filter(Boolean);
  const stageLineup = article
    .find('.event-details-lineup li p')
    .toArray()
    .map((element) => $(element).text().trim())
    .filter((name) => name && !/^(?:doors open|curfew)$/i.test(name));
  const seen = new Set<string>();
  const lineup = [...headliners, ...stageLineup].filter((name) => {
    const key = artistKey(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return eventSchema.parse({
    id: `source:${createHash('sha256').update(url).digest('hex').slice(0, 40)}`,
    title: title.replace(/\s*\|\s*SOLD OUT/i, '').trim(),
    datetime,
    ...(end ? { end_datetime: end } : {}),
    date_only: datetime.length === 10,
    venue: source.venue,
    lineup,
    genres,
    url,
    image_url: supportedImage,
    description: `Live at ${source.venue.name}, ${source.venue.city}. Open the original venue listing for the full lineup, accessibility information, and tickets.`,
    source: {
      id: source.id,
      name: source.name,
      url: source.url,
      fetched_at: new Date().toISOString(),
    },
    status: /cancelled|canceled/.test(rawStatus)
      ? 'cancelled'
      : /postponed|show moved/.test(rawStatus)
        ? 'postponed'
        : /sold[\s_-]?out/.test(rawStatus)
          ? 'sold_out'
          : 'scheduled',
    popularity: 0,
  });
}

export function discoverEventLinks(
  html: string,
  source: ConcertSource
): string[] {
  const $ = load(html);
  const links = $(source.linkSelector)
    .toArray()
    .flatMap((element) => {
      const href = $(element).attr('href');
      if (!href) return [];
      if (!URL.canParse(href, source.url)) {
        logger.warn({ source: source.id }, 'Malformed source link ignored');
        return [];
      }
      const url = new URL(href, source.url);
      return !url.search && !url.hash && trustedSourceUrl(url.href, source)
        ? [url.href]
        : [];
    });
  return [...new Set(links)].slice(0, MAX_PAGES);
}

async function fetchPage(
  url: string,
  source: Pick<ConcertSource, 'url'>,
  maxBytes = MAX_PAGE_BYTES,
  beforeRequest?: (url: string) => Promise<void>,
  depth = 0
): Promise<{ status: number; text: string }> {
  if (!trustedSourceUrl(url, source) || depth > 3)
    throw new AppError(
      422,
      'UNTRUSTED_SOURCE',
      'Source requests must stay on the curated HTTPS origin.'
    );
  await beforeRequest?.(url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/json,text/plain;q=0.9',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location)
      throw new AppError(
        502,
        'SOURCE_REDIRECT',
        'The source returned a redirect without a destination.'
      );
    return fetchPage(
      new URL(location, url).href,
      source,
      maxBytes,
      beforeRequest,
      depth + 1
    );
  }
  const body = await readLimitedBody(
    response.body,
    maxBytes,
    new AppError(
      502,
      'SOURCE_TOO_LARGE',
      'The source page exceeded the download safety limit.'
    )
  );
  return {
    status: response.status,
    text: body.toString('utf8'),
  };
}

interface SourcePolicy {
  robots: ReturnType<typeof robotsParser>;
  delay: number;
  lastRequest: number;
  blocked?: string;
}

async function sourceReader(
  source: Pick<ConcertSource, 'url'>,
  policies: Map<string, Promise<SourcePolicy>>
) {
  const origin = new URL(source.url).origin;
  let policy = policies.get(origin);
  if (!policy) {
    policy = (async () => {
      const robotsUrl = new URL('/robots.txt', source.url).href;
      const response = await fetchPage(robotsUrl, source, 128 * 1024);
      if (![200, 404].includes(response.status))
        throw new AppError(
          502,
          'ROBOTS_UNAVAILABLE',
          `robots.txt returned HTTP ${response.status}; collection was stopped.`
        );
      const robots = robotsParser(
        robotsUrl,
        response.status === 404 ? '' : response.text
      );
      return {
        robots,
        delay: Math.max(1500, (robots.getCrawlDelay(USER_AGENT) || 0) * 1000),
        lastRequest: Date.now(),
      };
    })();
    policies.set(origin, policy);
  }
  const access = await policy;
  return {
    allowed: (url: string) =>
      access.robots.isAllowed(url, USER_AGENT) !== false,
    read: async (url: string) => {
      const response = await fetchPage(
        url,
        source,
        MAX_PAGE_BYTES,
        async (target) => {
          if (access.blocked)
            throw new AppError(502, 'SOURCE_ACCESS_LIMIT', access.blocked);
          if (access.robots.isAllowed(target, USER_AGENT) === false)
            throw new AppError(
              403,
              'ROBOTS_DISALLOWED',
              'robots.txt disallows this source URL. No access restrictions were bypassed.'
            );
          await pause(
            Math.max(0, access.delay - (Date.now() - access.lastRequest))
          );
          access.lastRequest = Date.now();
        }
      );
      if ([403, 429].includes(response.status)) {
        access.blocked = `The source returned HTTP ${response.status}; requests to this origin were stopped without bypassing the restriction.`;
        throw new AppError(502, 'SOURCE_ACCESS_LIMIT', access.blocked);
      }
      return response;
    },
  };
}

export function collectionDue(
  store: ConcertStore,
  interval: number,
  now = Date.now()
): boolean {
  const query = store.db.prepare(
    'SELECT last_run FROM source_runs WHERE id = ?'
  );
  return COLLECTION_SOURCES.some((source) => {
    const row = query.get(source.id);
    if (!row) return true;
    const last = Date.parse(String(row.last_run));
    if (!Number.isFinite(last))
      throw new AppError(
        500,
        'INVALID_SOURCE_RUN',
        'A stored collection timestamp is invalid. Check the source run before scheduling.'
      );
    return now - last >= interval;
  });
}

export function sourceStatuses(store: ConcertStore): SourceStatus[] {
  return COLLECTION_SOURCES.map((source) => {
    const row = store.db
      .prepare('SELECT * FROM source_runs WHERE id = ?')
      .get(source.id);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      last_run: row ? String(row.last_run) : null,
      event_count: store
        .events(null)
        .filter((event) => event.source.id === source.id).length,
      error: typeof row?.error === 'string' ? row.error : null,
    };
  });
}

export async function collectConcerts(
  store: ConcertStore,
  force = false,
  cities: string[] = []
): Promise<
  {
    source: string;
    collected: number;
    added: number;
    skipped: number;
    error: string | null;
    skipped_reason?: string;
  }[]
> {
  const results = [];
  const allSources = COLLECTION_SOURCES;
  const requested = new Set(cities.map(artistKey));
  const cityOf = (source: (typeof allSources)[number]) =>
    'parser' in source ? source.city : source.venue.city;
  const available = new Set(
    allSources.map((source) => artistKey(cityOf(source)))
  );
  if ([...requested].some((city) => !available.has(city)))
    throw new AppError(
      422,
      'CITY_SOURCE_UNAVAILABLE',
      'No configured collector exists for one or more requested cities. Check /sources before collecting.'
    );
  const policies = new Map<string, Promise<SourcePolicy>>();
  for (const source of allSources.filter(
    (entry) => !requested.size || requested.has(artistKey(cityOf(entry)))
  )) {
    let collected = 0;
    let added = 0;
    let skipped = 0;
    let error: string | null = null;
    const previous = store.db
      .prepare('SELECT last_run, error FROM source_runs WHERE id = ?')
      .get(source.id);
    if (
      !force &&
      previous &&
      !previous.error &&
      Date.now() - Date.parse(String(previous.last_run)) < 15 * 60 * 1000
    ) {
      results.push({
        source: source.name,
        collected: 0,
        added: 0,
        skipped: 0,
        error: null,
        skipped_reason: 'Source cooldown is active; no requests were sent.',
      });
      logger.info(
        { source: source.id },
        'Collection skipped because the source cooldown is active'
      );
      continue;
    }
    try {
      const reader = await sourceReader(source, policies);
      const index = await reader.read(source.url);
      if (index.status !== 200)
        throw new AppError(
          502,
          'SOURCE_HTTP_ERROR',
          `The listing returned HTTP ${index.status}. No access restrictions were bypassed.`
        );
      const warnings: string[] = [];
      if ('parser' in source) {
        const pages: CalendarResult[] = [];
        if (source.parser === 'metalagenda') {
          pages.push(parseMetalAgendaPage(index.text, source));
          for (const url of source.extraVenues || []) {
            const page = await reader.read(url);
            if (page.status !== 200)
              throw new AppError(
                502,
                'SOURCE_HTTP_ERROR',
                `A venue calendar returned HTTP ${page.status}.`
              );
            pages.push(parseMetalAgendaPage(page.text, source, url));
          }
        } else {
          const endpoint = /var\s+ajaxurl\s*=\s*['"]([^'"]+)['"]/.exec(
            index.text
          )?.[1];
          if (
            !endpoint ||
            endpoint !== new URL('/wp-admin/admin-ajax.php', source.url).href
          )
            throw new AppError(
              502,
              'SOURCE_LAYOUT_CHANGED',
              'The calendar public search form endpoint could not be verified.'
            );
          for (const search of metalDeSearches(endpoint, index.text)) {
            const page = await reader.read(search.url);
            if (page.status !== 200)
              throw new AppError(
                502,
                'SOURCE_HTTP_ERROR',
                `The public concert search returned HTTP ${page.status}.`
              );
            pages.push(
              parseMetalDeCalendar(
                page.text,
                source,
                search.genres,
                search.from,
                search.until
              )
            );
          }
        }
        const events = new Map<string, Event>();
        for (const page of pages) {
          warnings.push(...page.warnings);
          skipped += page.skipped;
          for (const event of page.events) {
            if (!isUpcoming(event)) {
              skipped++;
              if (!shouldRefreshSourceEvent(event, !!store.event(event.id)))
                continue;
            }
            const existing = events.get(event.id);
            events.set(event.id, {
              ...event,
              genres: [
                ...new Set([...(existing?.genres || []), ...event.genres]),
              ],
            });
          }
        }
        store.upsertVenues(pages.flatMap((page) => page.venues));
        added = store.upsertPublic([...events.values()]);
        collected = [...events.values()].filter((event) =>
          isUpcoming(event)
        ).length;
      } else {
        const links = discoverEventLinks(index.text, source);
        if (!links.length)
          throw new AppError(
            502,
            'SOURCE_LAYOUT_CHANGED',
            'No event links were found. The source layout may have changed.'
          );
        for (const url of links) {
          if (!reader.allowed(url)) {
            skipped++;
            warnings.push('An event page was excluded by robots.txt.');
            continue;
          }
          const page = await reader.read(url);
          if (page.status !== 200) {
            skipped++;
            warnings.push(`An event listing returned HTTP ${page.status}.`);
            logger.warn(
              { source: source.id, url, status: page.status },
              'Concert listing could not be read'
            );
            continue;
          }
          try {
            const event = parseSourcePage(page.text, url, source);
            if (
              !event ||
              !shouldRefreshSourceEvent(event, !!store.event(event.id))
            )
              skipped++;
            else {
              added += store.upsertPublic([event]);
              if (isUpcoming(event)) collected++;
              else skipped++;
            }
          } catch (cause) {
            skipped++;
            warnings.push('An event date or record could not be verified.');
            logger.warn(
              { source: source.id, url, err: cause },
              'Concert record was not imported'
            );
          }
        }
      }
      if (warnings.length)
        error = `${warnings.length} listing warning(s): ${[...new Set(warnings)].join(' ')}`;
      if (!collected && !error && !('parser' in source))
        error =
          'No upcoming concerts with explicitly matching genre descriptions were found. Existing records were retained.';
    } catch (cause) {
      error =
        cause instanceof AppError
          ? cause.message
          : 'The source could not be reached. Existing records were retained; see server logs.';
      logger.error(
        { source: source.id, err: cause },
        'Concert collection failed'
      );
    }
    store.db
      .prepare(
        'INSERT OR REPLACE INTO source_runs (id, last_run, event_count, error) VALUES (?, ?, ?, ?)'
      )
      .run(source.id, new Date().toISOString(), collected, error);
    results.push({ source: source.name, collected, added, skipped, error });
    logger.info(results.at(-1), 'Concert source collection finished');
  }
  return results;
}
