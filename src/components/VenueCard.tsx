'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { VenueData } from '@/types';
import { useApp } from './AppProvider';
import Icon from './Icon';

export default function VenueCard({ venue }: { venue: VenueData }) {
  const search = useSearchParams();
  const query = new URLSearchParams(search);
  query.delete('page');
  query.delete('location');
  if (venue.city) query.set('city', venue.city);
  else query.delete('city');
  query.set('venue', venue.id);
  const { saves, toggleSaved, ready, pending } = useApp();
  const followed = saves.some(
    (item) => item.type === 'venue' && item.id === venue.id
  );
  return (
    <article className="entity-card venue-card">
      <div className="venue-illustration" aria-hidden="true">
        <Icon name="location" width="52" height="52" />
        <span>
          THE ROOMS
          <br />
          THAT MATTER.
        </span>
      </div>
      <div className="entity-content">
        <p className="eyebrow">
          {[venue.city, venue.country].filter(Boolean).join(' / ')}
        </p>
        <h2>{venue.name}</h2>
        <p>
          {venue.event_count
            ? `${venue.event_count} matching ${venue.event_count === 1 ? 'show' : 'shows'} collected`
            : 'No matching gigs collected yet.'}
        </p>
        <Link href={`/?${query}#shows`} className="show-link">
          See the lineup <Icon name="arrow" />
        </Link>
        {(venue.url || venue.source_url) && (
          <a
            className="show-link"
            href={venue.url || venue.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {venue.url ? 'Venue website' : 'Source calendar'}{' '}
            <Icon name="external" />
          </a>
        )}
      </div>
      <button
        className={`button ${followed ? 'button-soft' : 'button-outline'}`}
        disabled={!ready || pending}
        aria-pressed={followed}
        onClick={() => void toggleSaved('venue', venue.id)}
      >
        {followed ? 'Following venue' : 'Follow venue'}
      </button>
    </article>
  );
}
