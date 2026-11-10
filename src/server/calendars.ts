import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { z } from 'zod';
import type { Event, VenueData } from '@/types';
import { artistKey, venueKey } from '@/lib/concerts';
import { eventSchema, isWebUrl, venueSchema } from '@/lib/schema';
import { AppError } from './errors';
import { parseConcertDate } from './imports';
import { extractPagePhoto, supportedImage } from './images';

export interface CalendarSource {
  id: string;
  name: string;
  url: string;
  parser: 'metalagenda' | 'metal-de';
  city: string;
  country: string;
  extraVenues?: string[];
  venueAliases?: Record<string, string>;
}

export interface CalendarResult {
  events: Event[];
  venues: VenueData[];
  skipped: number;
  warnings: string[];
}

export const CALENDAR_SOURCES: CalendarSource[] = [
  {
    id: 'metal-de-berlin',
    name: 'metal.de / Berlin',
    url: 'https://www.metal.de/konzerte/',
    parser: 'metal-de',
    city: 'Berlin',
    country: 'Germany',
    venueAliases: {
      binuu: 'Bi Nuu',
      'kesselhaus in der kulturbrauerei': 'Kesselhaus Berlin',
    },
  },
  {
    id: 'metalagenda-amsterdam',
    name: 'Metal Agenda / Amsterdam',
    url: 'https://www.metalagenda.nl/p/amsterdam',
    parser: 'metalagenda',
    city: 'Amsterdam',
    country: 'Netherlands',
    extraVenues: [
      'https://www.metalagenda.nl/venues/paradiso',
      'https://www.metalagenda.nl/venues/volta',
    ],
  },
  {
    id: 'metalagenda-haarlem',
    name: 'Metal Agenda / Haarlem',
    url: 'https://www.metalagenda.nl/p/haarlem',
    parser: 'metalagenda',
    city: 'Haarlem',
    country: 'Netherlands',
  },
  {
    id: 'metalagenda-utrecht',
    name: 'Metal Agenda / Utrecht',
    url: 'https://www.metalagenda.nl/p/utrecht',
    parser: 'metalagenda',
    city: 'Utrecht',
    country: 'Netherlands',
    extraVenues: ['https://www.metalagenda.nl/venues/ekko'],
  },
];

export function metalDeSearches(
  endpoint: string,
  html: string,
  now = new Date()
): { url: string; genres: string[]; from: string; until: string }[] {
  const end = new Date(now);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const from = now.toISOString().slice(0, 10);
  const until = end.toISOString().slice(0, 10);
  const $ = load(html);
  const categories = [
    {
      genres: ['Metal'],
      labels: [
        'black-metal',
        'death-metal',
        'doom-metal',
        'gothic-metal-mittelalter',
        'heavy-metal',
        'modern-metal',
        'pagan-viking-metal',
        'thrash-metal',
      ],
    },
    { genres: ['Hardcore punk'], labels: ['hardcore-grindcore'] },
    {
      genres: ['Rock'],
      labels: ['post-rock-metal', 'progressive-rock-metal', 'rock'],
    },
    { genres: ['Punk'], labels: ['punk'] },
  ];
  return categories.map(({ genres, labels }) => {
    const ids = labels
      .map((label) => {
        const value = $(`#searchconcerts input.genre[id="${label}"]`).attr(
          'value'
        );
        if (!value || !/^\d{1,10}$/.test(value))
          throw new AppError(
            502,
            'SOURCE_LAYOUT_CHANGED',
            'The calendar genre filters could not be verified against its public form.'
          );
        return value;
      })
      .join(',');
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      action: 'return_concerts',
      // The public search backend expects compact dates, unlike its HTML date inputs.
      from: from.replaceAll('-', ''),
      until: until.replaceAll('-', ''),
      lat: '',
      long: '',
      radius: '',
      genres: ids,
    }).toString();
    return { url: url.href, genres, from, until };
  });
}

function text(value: string): string {
  const readable = load(value).root().text().replace(/\s+/g, ' ').trim();
  // Repair a publisher's double encoding only when the UTF-8 round trip is lossless.
  const repaired = Buffer.from(readable, 'latin1').toString('utf8');
  return /[\u00c2\u00c3]/.test(readable) &&
    Buffer.from(repaired, 'utf8').toString('latin1') === readable
    ? repaired
    : readable;
}

function calendarVenue(
  name: string,
  city: string,
  sourceUrl: string,
  source: CalendarSource
): VenueData {
  const venue = {
    name: source.venueAliases?.[artistKey(text(name))] || text(name),
    city: text(city),
    country: source.country,
    region: '',
    latitude: '',
    longitude: '',
  };
  return venueSchema.parse({
    ...venue,
    id: venueKey(venue),
    event_count: 0,
    genres: ['Metal'],
    source_url: sourceUrl,
  });
}

function calendarEvent(
  source: CalendarSource,
  venue: VenueData,
  title: string,
  date: string,
  lineup: string[],
  url: string,
  genres: string[],
  image?: string
): Event {
  return eventSchema.parse({
    id: `source:${createHash('sha256').update(`${url}|${date}|${venue.id}`).digest('hex').slice(0, 40)}`,
    title,
    datetime: date,
    date_only: true,
    venue: {
      name: venue.name,
      city: venue.city,
      country: venue.country,
      region: venue.region,
      latitude: venue.latitude,
      longitude: venue.longitude,
    },
    lineup: [...new Set(lineup)],
    genres,
    url,
    image_url: image,
    image_kind: image ? 'event' : undefined,
    description: `Listed by ${source.name} at ${venue.name}, ${venue.city}. The calendar supplies the date, not a confirmed start time. Check the original listing with the venue before booking.`,
    source: {
      id: source.id,
      name: source.name,
      url: source.url,
      fetched_at: new Date().toISOString(),
      genre_basis: 'calendar',
    },
    status: /\b(?:cancelled|canceled|abgesagt|geannuleerd)\b/i.test(title)
      ? 'cancelled'
      : /\b(?:postponed|verschoben|uitgesteld)\b/i.test(title)
        ? 'postponed'
        : /\b(?:sold out|ausverkauft|uitverkocht)\b/i.test(title)
          ? 'sold_out'
          : 'scheduled',
    popularity: 0,
  });
}

function nonConcert(title: string, lineup: string[]): boolean {
  return (
    /\b(?:club night|clubnacht|rave|dj set|listening party|luistersessie|filmvertoning|cinema|screening|gabber|hardstyle)\b/i.test(
      title
    ) ||
    (!lineup.length && /\((?:19|20)\d{2}\)/.test(title))
  );
}

function dutchDate(value: string): string | null {
  const months = [
    'januari',
    'februari',
    'maart',
    'april',
    'mei',
    'juni',
    'juli',
    'augustus',
    'september',
    'oktober',
    'november',
    'december',
  ];
  const match = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i.exec(value.trim());
  if (!match) return null;
  const month = months.indexOf(match[2].toLowerCase()) + 1;
  return parseConcertDate(
    `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`
  ).datetime;
}

export function parseMetalAgendaPage(
  html: string,
  source: CalendarSource,
  url = source.url
): CalendarResult {
  const $ = load(html);
  const heading = $('h1').first().text().trim();
  const profile = /^Metal concerten bij (.+) te (.+)$/i.exec(heading);
  const profileVenue =
    profile && artistKey(profile[2]) === artistKey(source.city)
      ? calendarVenue(profile[1], profile[2], url, source)
      : undefined;
  if (
    !profileVenue &&
    artistKey(heading) !==
      artistKey(`Metal concerten in ${source.city} en omstreken`)
  ) {
    throw new AppError(
      502,
      'SOURCE_LAYOUT_CHANGED',
      'The calendar city or venue heading could not be verified.'
    );
  }
  const result: CalendarResult = {
    events: [],
    venues: [],
    skipped: 0,
    warnings: [],
  };
  const venues = new Map<string, VenueData>();
  $('#cont_right a[href*="/venues/"]').each((_, element) => {
    const label = $(element).text().trim();
    const separator = label.indexOf('|');
    const href = $(element).attr('href');
    if (separator < 0 || !href) return;
    const sourceUrl = new URL(href, source.url).href;
    venues.set(
      sourceUrl,
      calendarVenue(
        label.slice(separator + 1).trim(),
        label.slice(0, separator).trim(),
        sourceUrl,
        source
      )
    );
  });
  if (profileVenue) {
    const website = $('a')
      .toArray()
      .map((element) => $(element).text().trim())
      .find(isWebUrl);
    if (website) profileVenue.url = website;
    venues.set(url, profileVenue);
  }
  result.venues = [...venues.values()].filter(
    (venue) => artistKey(venue.city) === artistKey(source.city)
  );
  if (
    !$('#cont_left .agendapunt').length &&
    !/geen metal concerten/i.test($('body').text())
  ) {
    throw new AppError(
      502,
      'SOURCE_LAYOUT_CHANGED',
      'The calendar has neither concert records nor an explicit empty-listing message.'
    );
  }
  let date: string | null = null;
  $('#cont_left')
    .children('.dateheader, .agendapunt')
    .each((_, element) => {
      if ($(element).hasClass('dateheader')) {
        const header = $(element).clone();
        header.find('sub').remove();
        date = dutchDate(header.text());
        return;
      }
      const item = $(element).find('.left').first();
      const venueLink = item.find('a[href*="/venues/"]').first();
      const venueHref = venueLink.attr('href');
      let venue = venueHref
        ? venues.get(new URL(venueHref, source.url).href)
        : profileVenue;
      if (!venue && venueHref) {
        const label = artistKey(text(venueLink.text()));
        venue = [...venues.values()].find(
          (candidate) =>
            artistKey(`${candidate.name} ${candidate.city}`) === label
        );
        if (venue) venue.source_url = url;
      }
      if (venue && artistKey(venue.city) !== artistKey(source.city)) {
        result.skipped++;
        return;
      }
      const title = text(item.find('h3').first().text());
      const bands = item
        .find('div')
        .toArray()
        .map((entry) => $(entry).text())
        .find((value) => /^\s*Bands:/i.test(value));
      const lineup = bands
        ? bands
            .replace(/^\s*Bands:\s*/i, '')
            .split('|')
            .map(text)
            .filter((name) => name && !/^t\.?b\.?a\.?$/i.test(name))
        : [];
      if (nonConcert(title, lineup)) {
        result.skipped++;
        return;
      }
      const href = item.find('h3').first().closest('a').attr('href');
      if (!date || !venue || !title || !href || !isWebUrl(href)) {
        result.skipped++;
        result.warnings.push(
          'A calendar record had an unverified date, venue, title, or original link.'
        );
        return;
      }
      result.events.push(
        calendarEvent(
          source,
          venue,
          title,
          date,
          lineup,
          href,
          ['Metal'],
          extractPagePhoto($.html(element), url).image_url
        )
      );
    });
  return result;
}

const germanRecord = z.object({
  date: z.string().max(200),
  title: z.string().min(1).max(1000),
  billing: z.string().max(10000).nullable(),
  link: z.string().max(2048),
  image: z.unknown().optional(),
  image_url: z.unknown().optional(),
  poster: z.unknown().optional(),
  location: z.object({
    name: z.string().min(1).max(1000),
    city: z.string().max(500),
    link: z.string().max(2048),
    lat: z
      .string()
      .max(30)
      .nullish()
      .transform((value) => value ?? ''),
    long: z
      .string()
      .max(30)
      .nullish()
      .transform((value) => value ?? ''),
  }),
});

export function parseMetalDeCalendar(
  body: string,
  source: CalendarSource,
  genres: string[],
  from: string,
  until: string
): CalendarResult {
  const response = z
    .object({
      status: z.enum(['success', 'error']),
      message: z.string().optional(),
      data: z.array(z.unknown()).max(5000).optional(),
    })
    .parse(JSON.parse(body));
  const result: CalendarResult = {
    events: [],
    venues: [],
    skipped: 0,
    warnings: [],
  };
  if (response.status === 'error') {
    if (response.message === 'Keine Konzerte gefunden.') return result;
    throw new AppError(
      502,
      'SOURCE_SEARCH_ERROR',
      'The public concert search returned an error instead of verified listings.'
    );
  }
  if (!response.data)
    throw new AppError(
      502,
      'SOURCE_LAYOUT_CHANGED',
      'The public concert search did not return its listing data.'
    );
  const venues = new Map<string, VenueData>();
  const events = new Map<string, Event>();
  for (const value of response.data) {
    const location = z
      .object({ location: z.object({ city: z.string() }) })
      .safeParse(value);
    if (
      location.success &&
      artistKey(text(location.data.location.city)) !== artistKey(source.city)
    ) {
      result.skipped++;
      continue;
    }
    const parsed = germanRecord.safeParse(value);
    if (!parsed.success) {
      result.skipped++;
      result.warnings.push(
        'A public search record had invalid concert metadata.'
      );
      continue;
    }
    const row = parsed.data;
    if (artistKey(text(row.location.city)) !== artistKey(source.city)) {
      result.skipped++;
      continue;
    }
    const match = /(\d{2})\.(\d{2})\.(\d{4}|\d{2})(?!\d)/.exec(text(row.date));
    const years = Array.from(
      { length: Number(until.slice(0, 4)) - Number(from.slice(0, 4)) + 1 },
      (_, index) => Number(from.slice(0, 4)) + index
    ).filter(
      (year) =>
        match &&
        (match[3].length === 4
          ? year === Number(match[3])
          : year % 100 === Number(match[3]))
    );
    const date =
      match && years.length === 1
        ? parseConcertDate(`${years[0]}-${match[2]}-${match[1]}`).datetime
        : null;
    if (
      !date ||
      date < from ||
      date > until ||
      !isWebUrl(row.link) ||
      !isWebUrl(row.location.link)
    ) {
      result.skipped++;
      result.warnings.push(
        'A public search record had an unverified date or original link.'
      );
      continue;
    }
    const venue = calendarVenue(
      text(row.location.name),
      source.city,
      row.location.link,
      source
    );
    venue.latitude = row.location.lat;
    venue.longitude = row.location.long;
    venue.genres = [...genres];
    venues.set(venue.id, venue);
    const title = text(row.title);
    const lineup = text(row.billing || '')
      .split(/,\s*|\s+und\s+/i)
      .map((name) => name.trim())
      .filter(Boolean);
    const headliner = lineup
      .toSorted((a, b) => b.length - a.length)
      .find((name) => artistKey(title).startsWith(artistKey(name)));
    if (headliner)
      lineup.unshift(...lineup.splice(lineup.indexOf(headliner), 1));
    if (nonConcert(title, lineup)) {
      result.skipped++;
      continue;
    }
    const event = calendarEvent(
      source,
      venue,
      title,
      date,
      lineup,
      row.link,
      genres,
      supportedImage(row.image_url, row.link) ||
        supportedImage(row.image, row.link) ||
        supportedImage(row.poster, row.link)
    );
    events.set(event.id, event);
  }
  result.events = [...events.values()];
  result.venues = [...venues.values()];
  return result;
}
