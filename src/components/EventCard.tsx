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
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="relative h-48 w-full">
        <Image
          src={artist.image_url}
          alt={artist.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {eventDate}
        </div>
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all"
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWished ? (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )}
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {artist.name}
            </h3>
            <p className="text-sm text-gray-600">
              {eventTime}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {event.venue.city}, {event.venue.region}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-gray-800">
            {event.venue.name}
          </p>
          <p className="text-xs text-gray-600">
            {event.venue.city}, {event.venue.country}
          </p>
        </div>

        {event.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        {event.lineup.length > 1 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Lineup:</p>
            <p className="text-sm text-gray-700">
              {event.lineup.slice(0, 3).join(', ')}
              {event.lineup.length > 3 && ' +more'}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {artist.tracker_count.toLocaleString()} followers
          </div>
          
          {event.offers.length > 0 && event.offers[0].status === 'available' && (
            <a
              href={event.offers[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
            >
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}