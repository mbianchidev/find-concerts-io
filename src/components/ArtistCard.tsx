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
    <div className={`card-metal group ${className}`}>
      {/* Artist Image */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={artist.image_url}
          alt={artist.name}
          fill
          className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-void-black via-void-black/60 to-transparent"></div>
        
        {/* Follow Button - Overlaid on Image */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-3 right-3 glass-dark p-2.5 transition-all duration-300 hover:scale-110 group/heart clip-angle-dual ${
            isWatched ? 'animate-pulse-sheen' : ''
          }`}
          aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched ? (
            <svg className="w-6 h-6 text-accent-crimson" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white/60 group-hover/heart:text-accent-crimson transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Artist Name & Stats */}
        <div className="mb-4">
          <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-accent-crimson transition-colors">
            {artist.name}
          </h3>
          
          {/* Followers Count */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="font-display font-bold">
              <span className="text-metal-steel">{artist.tracker_count.toLocaleString()}</span> followers
            </span>
          </div>
          
          {/* Genre Badge */}
          <span className="badge-metal badge-crimson inline-block">
            {artist.genre}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm text-white/70 font-medium">
            <span className="font-display font-bold text-accent-cobalt">{artist.upcoming_event_count}</span> upcoming shows
          </div>
          
          <a
            href={artist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-metal-steel hover:text-accent-crimson text-sm font-display font-bold uppercase tracking-wider transition-colors group/link"
          >
            View
            <span className="inline-block ml-1 transition-transform group-hover/link:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
