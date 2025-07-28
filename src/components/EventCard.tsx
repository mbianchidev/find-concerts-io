'use client';

import { Event } from '@/types';
import { getArtistById } from '@/data/mockData';
import { formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';

interface EventCardProps {
  event: Event;
  className?: string;
}

export default function EventCard({ event, className = '' }: EventCardProps) {
  const artist = getArtistById(event.artist_id);

  if (!artist) return null;

  const eventDate = formatDate(event.datetime);
  const eventTime = formatTime(event.datetime);

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
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {eventDate}
        </div>
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