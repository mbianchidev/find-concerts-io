'use client';

import { Artist } from '@/types';
import Image from 'next/image';
import { useWatchlist } from '@/lib/hooks';

interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export default function ArtistCard({ artist, className = '' }: ArtistCardProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isWatched = isInWatchlist(artist.id.toString(), 'artist');

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWatchlist(artist.id.toString(), 'artist');
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="relative h-48 w-full">
        <Image
          src={artist.image_url}
          alt={artist.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <button
          onClick={handleToggleWatchlist}
          className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all"
          aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? (
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {artist.name}
            </h3>
            <p className="text-sm text-gray-600">
              {artist.tracker_count.toLocaleString()} followers
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{artist.upcoming_event_count}</span> upcoming events
          </div>
          
          <a
            href={artist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            View Profile →
          </a>
        </div>
      </div>
    </div>
  );
}
