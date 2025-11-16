'use client';

import { VenueData } from '@/types';
import Image from 'next/image';
import { useWatchlist } from '@/lib/hooks';

interface VenueCardProps {
  venue: VenueData;
  className?: string;
}

export default function VenueCard({ venue, className = '' }: VenueCardProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isWatched = isInWatchlist(venue.id, 'venue');

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWatchlist(venue.id, 'venue');
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="relative h-48 w-full">
        <Image
          src={venue.image_url || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&h=300&fit=crop'}
          alt={venue.name}
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
              {venue.name}
            </h3>
            <p className="text-sm text-gray-600">
              {venue.city}, {venue.region}
            </p>
            <p className="text-xs text-gray-500">
              {venue.country}
            </p>
          </div>
        </div>

        {venue.description && (
          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
            {venue.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {venue.capacity && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Capacity:</span> {venue.capacity.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
