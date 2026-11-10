'use client';

import Link from 'next/link';
import type { Event } from '@/types';
import { artistKey } from '@/lib/concerts';
import { apiUrl, useApiPage } from '@/lib/api';
import { googleCalendarUrl } from '@/lib/calendar';
import { eventSchema } from '@/lib/schema';
import { useApp } from './AppProvider';
import EventList from './EventList';
import Icon from './Icon';
import { AccountGate, ErrorState } from './Ui';
import ConcertStatusSelect from './ConcertStatusSelect';

export function PrivateContent({
  ownerId,
  children,
}: {
  ownerId: string;
  children: React.ReactNode;
}) {
  const { user, ready } = useApp();
  if (!ready)
    return (
      <p className="container muted-note" role="status">
        Checking private account access...
      </p>
    );
  if (user?.id !== ownerId)
    return (
      <div className="container">
        <AccountGate>
          Sign in to the account that owns this concert.
        </AccountGate>
      </div>
    );
  return children;
}

export function EventActions({ event }: { event: Event }) {
  const { saves, toggleSaved, ready, pending } = useApp();
  const saved = saves.some(
    (item) => item.type === 'event' && item.id === event.id
  );
  return (
    <>
      <div className="detail-actions">
        <button
          className="button"
          disabled={!ready || pending}
          aria-pressed={saved}
          onClick={() => void toggleSaved('event', event.id)}
        >
          <Icon name={saved ? 'check' : 'bookmark'} />
          {saved ? 'Show saved' : 'Save this show'}
        </button>
        {event.url && (
          <a
            className="button button-outline"
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Original listing & tickets
            <Icon name="external" />
          </a>
        )}
      </div>
      {saved && (
        <div className="detail-saved-status">
          <ConcertStatusSelect eventId={event.id} title={event.title} />
        </div>
      )}
      {event.datetime && (
        <div className="detail-actions">
          <a
            className="button button-outline"
            href={apiUrl(`/events/${encodeURIComponent(event.id)}/calendar`)}
          >
            <Icon name="calendar" />
            Download .ics
          </a>
          <a
            className="button button-outline"
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Calendar
            <Icon name="external" />
          </a>
        </div>
      )}
      <p className="muted-note">
        Calendar exports contain the concert, date, and location, never your
        private attendance plans or notes.
      </p>
      {!event.is_private && (
        <div className="detail-actions">
          {event.lineup.map((name) => {
            const id = artistKey(name);
            const followed = saves.some(
              (item) => item.type === 'artist' && item.id === id
            );
            return (
              <button
                key={id}
                className="button button-outline"
                aria-pressed={followed}
                disabled={!ready || pending}
                onClick={() => void toggleSaved('artist', id)}
              >
                <Icon name={followed ? 'check' : 'bell'} />
                {followed ? 'Following' : 'Follow'} {name}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export function SimilarEvents({ id }: { id: string }) {
  const { user } = useApp();
  const results = useApiPage(
    `/events/${encodeURIComponent(id)}/similar?limit=3`,
    eventSchema,
    user?.id || 'public'
  );
  return (
    <section className="listing-section" aria-labelledby="similar-shows">
      <div className="section-heading">
        <h2 id="similar-shows">While you are here.</h2>
        <Link className="show-link" href="/">
          All shows <Icon name="arrow" />
        </Link>
      </div>
      <ErrorState error={results.error} retry={() => void results.refetch()} />
      <EventList
        events={results.data?.data || []}
        loading={results.isPending}
        emptyMessage="No other upcoming shows match this concert's artists or genres yet."
      />
    </section>
  );
}
