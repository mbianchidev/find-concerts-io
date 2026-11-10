'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Event, SavedConcertStatus } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';
import { useApp } from './AppProvider';
import Icon from './Icon';
import ConcertStatusSelect from './ConcertStatusSelect';

interface EventCardProps {
  event: Event;
  className?: string;
  savedView?: boolean;
  onStatusSaved?: (status: SavedConcertStatus) => void;
}

export default function EventCard({
  event,
  className = '',
  savedView = false,
  onStatusSaved,
}: EventCardProps) {
  const { saves, toggleSaved, ready, pending } = useApp();
  const saved = saves.some(
    (item) => item.type === 'event' && item.id === event.id
  );
  return (
    <article className={`event-card ${className}`}>
      <div className="event-poster">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt=""
            fill
            className="poster-image"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
        <span className="date-ticket">
          {event.datetime
            ? formatDate(event.datetime, true, savedView)
            : 'DATE TBA'}
        </span>
        <button
          className={`save-button ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? 'Unsave' : 'Save'} ${event.title}`}
          aria-pressed={saved}
          disabled={!ready || pending}
          onClick={() => void toggleSaved('event', event.id)}
        >
          <Icon name="bookmark" fill={saved ? 'currentColor' : 'none'} />
        </button>
        {event.is_private && (
          <span className="private-label">
            <Icon name="lock" />
            Private import
          </span>
        )}
      </div>
      <div className="event-card-body">
        <div className="event-tags">
          {event.genres.map((genre) => (
            <span className="genre-tag" key={genre}>
              {genre}
            </span>
          ))}
          {event.status !== 'scheduled' && (
            <span className="status-tag">{event.status.replace('_', ' ')}</span>
          )}
        </div>
        <h3>
          <Link href={`/events/${encodeURIComponent(event.id)}`}>
            {event.title}
          </Link>
        </h3>
        <p className="venue-line">
          <Icon name="location" />
          <span>
            {[event.venue.name, event.venue.city].filter(Boolean).join(' / ') ||
              'Venue to be announced'}
          </span>
        </p>
        <p className="show-time">
          {event.datetime
            ? formatTime(event.datetime, event.date_only)
            : event.date_label || 'Date to be announced'}
          {event.import_details?.status && (
            <span>{event.import_details.status}</span>
          )}
        </p>
        {event.reason && <p className="muted-note">{event.reason}</p>}
        {savedView && (
          <ConcertStatusSelect
            eventId={event.id}
            title={event.title}
            onStatusSaved={onStatusSaved}
          />
        )}
        <div className="event-card-footer">
          <span>
            {event.is_private ? 'Your concert history' : event.source.name}
          </span>
          <Link
            href={`/events/${encodeURIComponent(event.id)}`}
            className="show-link"
            aria-label={`View ${event.title}`}
          >
            View show <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
