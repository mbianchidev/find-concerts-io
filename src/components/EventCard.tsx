'use client';

import { Event } from '@/types';
import { getArtistById } from '@/data/mockData';
import { formatDate, formatTime } from '@/lib/utils';
import { useWishlist } from '@/lib/hooks';
import Image from 'next/image';

interface EventCardProps {
  event: Event;
  className?: string;
}

export default function EventCard({ event, className = '' }: EventCardProps) {
  const artist = getArtistById(event.artist_id);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWished = isInWishlist(event.id);

  if (!artist) return null;

  const eventDate = formatDate(event.datetime);
  const eventTime = formatTime(event.datetime);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWishlist(event.id);
  };

  return (
    <div className={`card-neon group ${className}`}>
      {/* Image Container */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={artist.image_url}
          alt={artist.name}
          fill
          className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-space via-dark-space/50 to-transparent"></div>
        
        {/* Date Badge */}
        <div className="absolute top-3 left-3 badge-neon badge-pink backdrop-blur-md">
          {eventDate}
        </div>
        
        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 glass-dark rounded-full p-2.5 transition-all duration-300 hover:scale-110 group/wishlist"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWished ? (
            <svg className="w-6 h-6 text-neon-pink animate-pulse-glow" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white/60 group-hover/wishlist:text-neon-pink transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Artist Name & Time */}
        <div className="mb-3">
          <h3 className="text-xl font-display font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">
            {artist.name}
          </h3>
          <p className="text-sm text-neon-lime font-body">
            {eventTime}
          </p>
        </div>

        {/* Venue Info */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <p className="text-base font-semibold text-white/90 mb-1">
            {event.venue.name}
          </p>
          <p className="text-sm text-white/60">
            {event.venue.city}, {event.venue.country}
          </p>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-white/70 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Lineup */}
        {event.lineup.length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-neon-cyan font-display uppercase tracking-wider mb-1">Lineup:</p>
            <p className="text-sm text-white/80">
              {event.lineup.slice(0, 3).join(', ')}
              {event.lineup.length > 3 && ` +${event.lineup.length - 3} more`}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-auto">
          <div className="text-xs text-white/50 font-display">
            {artist.tracker_count.toLocaleString()} followers
          </div>
          
          {event.offers.length > 0 && event.offers[0].status === 'available' && (
            <a
              href={event.offers[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon btn-neon-cyan text-xs py-2 px-4"
            >
              Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}