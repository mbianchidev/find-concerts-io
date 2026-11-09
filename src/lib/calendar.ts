import type { Event } from '@/types';

function stamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error('A valid concert date is required.');
  return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function dates(event: Event): { start: string; end: string; allDay: boolean } {
  if (!event.datetime)
    throw new Error('This concert does not have a confirmed date yet.');
  const allDay = event.date_only || event.datetime.length === 10;
  if (allDay) {
    const end = new Date(
      `${(event.end_datetime || event.datetime).slice(0, 10)}T00:00:00Z`
    );
    if (!Number.isFinite(end.getTime()))
      throw new Error('A valid concert date is required.');
    end.setUTCDate(end.getUTCDate() + 1);
    return {
      start: event.datetime.slice(0, 10).replaceAll('-', ''),
      end: end.toISOString().slice(0, 10).replaceAll('-', ''),
      allDay: true,
    };
  }
  const start = stamp(event.datetime);
  // When the source gives no end time, a zero-duration calendar entry avoids inventing one.
  return {
    start,
    end: event.end_datetime ? stamp(event.end_datetime) : start,
    allDay: false,
  };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[,;]/g, '\\$&');
}

function fold(line: string): string {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 74) {
      chunks.push(chunk);
      chunk = ' ';
      bytes = 1;
    }
    chunk += character;
    bytes += size;
  }
  return [...chunks, chunk].join('\r\n');
}

export function calendarFile(event: Event, now = new Date()): string {
  const { start, end, allDay } = dates(event);
  const kind = allDay ? ';VALUE=DATE' : '';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Find Concerts IO//Concerts//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.id)}@find-concerts.io`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART${kind}:${start}`,
    `DTEND${kind}:${end}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText([event.venue.name, event.venue.city, event.venue.country].filter(Boolean).join(', '))}`,
    ...(event.url ? [`URL:${escapeText(event.url)}`] : []),
    `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
    .map(fold)
    .join('\r\n');
}

export function googleCalendarUrl(event: Event): string {
  const { start, end } = dates(event);
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    location: [event.venue.name, event.venue.city, event.venue.country]
      .filter(Boolean)
      .join(', '),
    details: event.url,
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}
