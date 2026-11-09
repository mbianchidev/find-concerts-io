import { z } from 'zod';
import type { Event } from '@/types';
import { isWebUrl } from '@/lib/schema';
import { AppError } from './errors';
import { readLimitedBody } from './http';
import { parseConcertDate } from './imports';
import { logger } from './logger';
import { classifyGenres } from './scraper';

const webUrl = z.string().refine(isWebUrl);

async function providerJson(
  fetcher: typeof fetch,
  url: string,
  options?: RequestInit
): Promise<unknown> {
  let response;
  try {
    response = await fetcher(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error.name : 'NetworkError',
        provider: new URL(url).hostname,
      },
      'Music provider request failed'
    );
    throw new AppError(
      502,
      'PROVIDER_UNREACHABLE',
      'The music provider could not be reached. Try again later.'
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      response.status === 429 ? 503 : 502,
      'PROVIDER_REJECTED',
      `The music provider returned HTTP ${response.status}. Check provider credentials, permissions, and rate limits.`
    );
  }
  const body = await readLimitedBody(
    response.body,
    3 * 1024 * 1024,
    new AppError(
      502,
      'PROVIDER_TOO_LARGE',
      'The provider response exceeded the size limit.'
    )
  );
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new AppError(
      502,
      'INVALID_PROVIDER_RESPONSE',
      'The music provider did not return valid JSON.'
    );
  }
}

function providerData<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      502,
      'INVALID_PROVIDER_RESPONSE',
      'The music provider returned an unsupported response shape.'
    );
  return parsed.data;
}

export class SpotifyClient {
  private token?: { value: string; expires: number };
  constructor(
    private clientId: string,
    private clientSecret: string,
    private fetcher: typeof fetch = fetch
  ) {}

  async searchArtists(query: string) {
    if (!this.clientId || !this.clientSecret)
      throw new AppError(
        503,
        'SPOTIFY_NOT_CONFIGURED',
        'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the server to enable artist metadata.'
      );
    if (!this.token || this.token.expires <= Date.now()) {
      const token = providerData(
        z.object({
          access_token: z.string(),
          expires_in: z.number().positive(),
        }),
        await providerJson(
          this.fetcher,
          'https://accounts.spotify.com/api/token',
          {
            method: 'POST',
            headers: {
              authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }
        )
      );
      this.token = {
        value: token.access_token,
        expires: Date.now() + Math.max(0, token.expires_in - 60) * 1000,
      };
    }
    const schema = z.object({
      artists: z.object({
        items: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            genres: z.array(z.string()),
            external_urls: z.object({ spotify: webUrl }),
          })
        ),
      }),
      tracks: z
        .object({
          items: z.array(
            z.object({
              artists: z.array(z.object({ id: z.string() })),
              preview_url: webUrl.nullable().optional(),
            })
          ),
        })
        .optional(),
    });
    const params = new URLSearchParams({
      q: query,
      type: 'artist,track',
      limit: '12',
    });
    const result = providerData(
      schema,
      await providerJson(
        this.fetcher,
        `https://api.spotify.com/v1/search?${params}`,
        { headers: { authorization: `Bearer ${this.token.value}` } }
      )
    );
    return result.artists.items.map((artist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      url: artist.external_urls.spotify,
      preview_url:
        result.tracks?.items.find(
          (track) =>
            track.preview_url &&
            track.artists.some((entry) => entry.id === artist.id)
        )?.preview_url || null,
    }));
  }
}

const ticketmasterEvent = z.object({
  id: z.string(),
  name: z.string(),
  url: webUrl,
  dates: z.object({
    start: z.object({
      localDate: z.string(),
      localTime: z.string().optional(),
      dateTime: z.string().optional(),
    }),
    status: z.object({ code: z.string() }).optional(),
  }),
  classifications: z
    .array(
      z.object({
        genre: z.object({ name: z.string() }).optional(),
        subGenre: z.object({ name: z.string() }).optional(),
      })
    )
    .optional(),
  _embedded: z.object({
    venues: z
      .array(
        z.object({
          name: z.string(),
          city: z.object({ name: z.string() }).optional(),
          country: z.object({ name: z.string() }).optional(),
          state: z.object({ name: z.string() }).optional(),
          location: z
            .object({ latitude: z.string(), longitude: z.string() })
            .optional(),
        })
      )
      .min(1),
    attractions: z.array(z.object({ name: z.string() })).optional(),
  }),
});

function ticketmasterDate(
  start: z.infer<typeof ticketmasterEvent>['dates']['start']
) {
  const date = parseConcertDate(start.localDate).datetime;
  if (!date) throw new Error('The provider did not give a valid concert date.');
  if (
    start.localTime &&
    /^\d{2}:\d{2}:\d{2}$/.test(start.localTime) &&
    start.dateTime &&
    Number.isFinite(Date.parse(start.dateTime))
  ) {
    const local = Date.parse(`${date}T${start.localTime}Z`);
    const minutes = (local - Date.parse(start.dateTime)) / 60000;
    if (Number.isInteger(minutes) && Math.abs(minutes) <= 14 * 60) {
      const abs = Math.abs(minutes);
      return {
        datetime: `${date}T${start.localTime}${minutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`,
        date_only: false,
      };
    }
  }
  return { datetime: date, date_only: true };
}

export class TicketmasterClient {
  constructor(
    private key: string,
    private fetcher: typeof fetch = fetch
  ) {}

  async searchEvents(
    query: string,
    city = '',
    genre = 'Rock'
  ): Promise<{ events: Event[]; warnings: string[] }> {
    if (!this.key)
      throw new AppError(
        503,
        'TICKETMASTER_NOT_CONFIGURED',
        'Set TICKETMASTER_API_KEY on the server to enable additional event searches.'
      );
    const params = new URLSearchParams({
      apikey: this.key,
      keyword: query,
      classificationName: genre,
      size: '30',
      sort: 'date,asc',
    });
    if (city) params.set('city', city);
    const result = providerData(
      z.object({
        page: z.object({ totalElements: z.number() }),
        _embedded: z.object({ events: z.array(z.unknown()) }).optional(),
      }),
      await providerJson(
        this.fetcher,
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
      )
    );
    if (result.page.totalElements > 0 && !result._embedded)
      throw new AppError(
        502,
        'INVALID_PROVIDER_RESPONSE',
        'Ticketmaster reported events but supplied no event records.'
      );
    const events: Event[] = [];
    const warnings: string[] = [];
    for (const raw of result._embedded?.events || []) {
      const parsed = ticketmasterEvent.safeParse(raw);
      if (!parsed.success) {
        warnings.push(
          'A provider record was skipped because required fields were missing.'
        );
        continue;
      }
      const item = parsed.data;
      const venue = item._embedded.venues[0];
      let date;
      try {
        date = ticketmasterDate(item.dates.start);
      } catch {
        warnings.push(
          'A provider record was skipped because its concert date could not be verified.'
        );
        continue;
      }
      const genres = classifyGenres(
        (item.classifications || [])
          .flatMap((entry) => [
            entry.genre?.name || '',
            entry.subGenre?.name || '',
          ])
          .join(' ')
      );
      if (!genres.length) {
        warnings.push(
          'A provider record was outside the supported genres and was not imported.'
        );
        continue;
      }
      events.push({
        id: `ticketmaster:${item.id}`,
        title: item.name,
        ...date,
        venue: {
          name: venue.name,
          city: venue.city?.name || '',
          country: venue.country?.name || '',
          region: venue.state?.name || '',
          latitude: venue.location?.latitude || '',
          longitude: venue.location?.longitude || '',
        },
        lineup: item._embedded.attractions?.map((artist) => artist.name) || [
          item.name,
        ],
        genres,
        url: item.url,
        status:
          item.dates.status?.code === 'cancelled'
            ? 'cancelled'
            : item.dates.status?.code === 'postponed'
              ? 'postponed'
              : 'scheduled',
        popularity: 0,
        description: `Live at ${venue.name}. Confirm local times and ticket availability with the original listing.`,
        source: {
          id: 'ticketmaster',
          name: 'Ticketmaster',
          url: 'https://www.ticketmaster.com',
          fetched_at: new Date().toISOString(),
        },
      });
    }
    return { events, warnings };
  }
}

let spotify: SpotifyClient | undefined;
export function spotifyClient(): SpotifyClient {
  return (spotify ||= new SpotifyClient(
    process.env.SPOTIFY_CLIENT_ID || '',
    process.env.SPOTIFY_CLIENT_SECRET || ''
  ));
}
