'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Artist } from '@/types';
import { useApp } from './AppProvider';
import Icon from './Icon';

export default function ArtistCard({ artist }: { artist: Artist }) {
  const search = useSearchParams();
  const query = new URLSearchParams(search);
  query.delete('page');
  query.set('artist', artist.name);
  const { saves, toggleSaved, ready, pending } = useApp();
  const followed = saves.some(
    (item) => item.type === 'artist' && item.id === artist.id
  );
  return (
    <article className="entity-card">
      <div className="entity-monogram" aria-hidden="true">
        {artist.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')}
      </div>
      <div className="entity-content">
        <div className="event-tags">
          {artist.genres.map((genre) => (
            <span className="genre-tag" key={genre}>
              {genre}
            </span>
          ))}
        </div>
        <h2>{artist.name}</h2>
        <p>
          {artist.upcoming_event_count} listed{' '}
          {artist.upcoming_event_count === 1 ? 'show' : 'shows'}
        </p>
        <Link href={`/?${query}#shows`} className="show-link">
          Find shows <Icon name="arrow" />
        </Link>
      </div>
      <button
        className={`button ${followed ? 'button-soft' : 'button-outline'}`}
        disabled={!ready || pending}
        aria-pressed={followed}
        aria-label={`${followed ? 'Unfollow' : 'Follow'} ${artist.name}`}
        onClick={() => void toggleSaved('artist', artist.id)}
      >
        <Icon name={followed ? 'check' : 'bell'} />
        {followed ? 'Following' : 'Follow artist'}
      </button>
    </article>
  );
}
