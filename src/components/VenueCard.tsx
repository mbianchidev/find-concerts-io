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
    <div className={`card-metal group ${className}`}>
      {/* Venue Image */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={venue.image_url || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&h=300&fit=crop'}
          alt={venue.name}
          fill
          className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-void-black via-void-black/60 to-transparent"></div>
        
        {/* Animated Location Pin */}
        <div className="absolute top-3 left-3 flex items-center gap-2 glass-dark px-3 py-2 animate-precision-float clip-angle-tl">
          <svg className="w-5 h-5 text-accent-cobalt" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-white text-xs font-display font-bold">{venue.city}</span>
        </div>
        
        {/* Watch Button */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-3 right-3 glass-dark p-2.5 transition-all duration-300 hover:scale-110 clip-angle-dual ${
            isWatched ? 'animate-pulse-sheen' : ''
          }`}
          aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? (
            <svg className="w-6 h-6 text-accent-crimson" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white/60 hover:text-accent-crimson transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Venue Name & Location */}
        <div className="mb-4">
          <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-accent-cobalt transition-colors">
            {venue.name}
          </h3>
          
          <div className="flex items-start gap-2 text-sm text-white/70 mb-1">
            <svg className="w-4 h-4 text-accent-cobalt mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-white/90 font-medium">{venue.city}, {venue.region}</p>
              <p className="text-white/60 text-xs font-medium">{venue.country}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {venue.description && (
          <p className="text-sm text-white/70 mb-4 line-clamp-2 font-medium">
            {venue.description}
          </p>
        )}

        {/* Capacity Badge */}
        {venue.capacity && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="badge-metal badge-steel">
              <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {venue.capacity.toLocaleString()} Capacity
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
