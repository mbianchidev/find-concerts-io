import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  EventActions,
  PrivateContent,
  SimilarEvents,
} from '@/components/EventActions';
import Icon from '@/components/Icon';
import { formatDate, formatTime } from '@/lib/utils';
import { currentUser } from '@/server/auth';
import { appOrigin } from '@/server/config';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadEvent(id: string) {
  const store = getStore();
  const request = new Request(appOrigin(), {
    headers: { cookie: (await cookies()).toString() },
  });
  const user = currentUser(request, store);
  let eventId: string;
  try {
    eventId = decodeURIComponent(id);
  } catch {
    notFound();
  }
  return { event: store.event(eventId, user?.id), user };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { event } = await loadEvent((await params).id);
  if (!event)
    return {
      title: 'Concert unavailable',
      robots: { index: false, follow: false },
    };
  return {
    title: event.title,
    description: event.is_private
      ? 'Your account-private concert record.'
      : event.description,
    robots: event.is_private
      ? { index: false, follow: false }
      : { index: true, follow: true },
    ...(!event.is_private
      ? {
          alternates: {
            canonical: `${appOrigin()}/events/${encodeURIComponent(event.id)}/`,
          },
        }
      : {}),
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { event, user } = await loadEvent((await params).id);
  if (!event) notFound();
  const content = (
    <main className="container" id="main" tabIndex={-1}>
      {!event.is_private && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MusicEvent',
              name: event.title,
              startDate: event.datetime,
              ...(event.end_datetime ? { endDate: event.end_datetime } : {}),
              eventStatus: `https://schema.org/${event.status === 'cancelled' ? 'EventCancelled' : event.status === 'postponed' ? 'EventPostponed' : 'EventScheduled'}`,
              eventAttendanceMode:
                'https://schema.org/OfflineEventAttendanceMode',
              location: {
                '@type': 'Place',
                name: event.venue.name,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: event.venue.city,
                  addressRegion: event.venue.region,
                  addressCountry: event.venue.country,
                },
              },
              performer: event.lineup.map((name) => ({
                '@type': 'MusicGroup',
                name,
              })),
              ...(event.image_url ? { image: [event.image_url] } : {}),
              url: event.url,
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <div className="detail-header">
        <Link href={event.is_private ? '/import' : '/'} className="back-link">
          {event.is_private ? 'Back to private imports' : 'Back to discovery'}
        </Link>
      </div>
      <div className="detail-layout">
        <div>
          <p className="eyebrow">
            {event.is_private ? (
              <>
                <Icon name="lock" />
                PRIVATE CONCERT RECORD
              </>
            ) : (
              `ORIGINAL LISTING / ${event.source.name}`
            )}
          </p>
          <h1>{event.title}</h1>
          <div className="event-tags">
            {event.genres.map((genre) => (
              <span className="genre-tag" key={genre}>
                {genre}
              </span>
            ))}
            {event.status !== 'scheduled' && (
              <span className="status-tag">
                {event.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="detail-meta">
            <p>
              <Icon name="calendar" />
              {event.datetime
                ? formatDate(event.datetime)
                : event.date_label || 'Date to be announced'}
              {event.end_datetime && ` to ${formatDate(event.end_datetime)}`}
            </p>
            <p>
              <Icon name="music" />
              {event.datetime
                ? formatTime(event.datetime, event.date_only)
                : 'Time to be announced'}
            </p>
            <p>
              <Icon name="location" />
              {[event.venue.name, event.venue.city, event.venue.country]
                .filter(Boolean)
                .join(', ') || 'Venue to be announced'}
            </p>
          </div>
          {event.description && (
            <p className="detail-description">{event.description}</p>
          )}
          <EventActions event={event} />
          <a
            className="show-link"
            style={{ marginTop: 20 }}
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([event.venue.name, event.venue.city, event.venue.country].filter(Boolean).join(', '))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open interactive map <Icon name="external" />
          </a>
          {!event.is_private && (
            <p className="muted-note">
              {event.source.genre_basis === 'calendar'
                ? 'Genres follow specialist calendar categories, not verified artist subgenres. '
                : 'Genres are matched from the venue event description. '}
              Last collected {formatDate(event.source.fetched_at)}. Confirm
              dates, accessibility, and availability with the venue.
            </p>
          )}
        </div>
        <div className="detail-artwork">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={`Venue poster for ${event.title}`}
              fill
              sizes="(max-width: 800px) 90vw, 40vw"
              priority
            />
          ) : (
            <div className="poster-placeholder" aria-hidden="true">
              <span>
                LIVE
                <br />& LOUD.
              </span>
              <Icon name="music" />
            </div>
          )}
        </div>
      </div>
      {event.import_details && (
        <section className="panel">
          <h2>Your original workbook fields.</h2>
          <p>
            From {event.import_details.sheet}, row {event.import_details.row}.
            Locations, notes, prices, and attendance plans are preserved as
            written.
          </p>
          <dl className="definition-list">
            {Object.entries(event.import_details.fields).map(
              ([field, value]) => (
                <div key={field} style={{ display: 'contents' }}>
                  <dt>{field}</dt>
                  <dd>{value === null ? 'Blank' : String(value)}</dd>
                </div>
              )
            )}
          </dl>
        </section>
      )}
      {!event.is_private && <SimilarEvents id={event.id} />}
    </main>
  );
  return event.is_private && user ? (
    <PrivateContent ownerId={user.id}>{content}</PrivateContent>
  ) : (
    content
  );
}
