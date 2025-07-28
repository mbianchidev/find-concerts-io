'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { formatDate, isFavorite, addToFavorites, removeFromFavorites } from '@/lib/utils';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const [isEventFavorite, setIsEventFavorite] = useState(false);

  useEffect(() => {
    setIsEventFavorite(isFavorite(event.id));
  }, [event.id]);

  const toggleFavorite = () => {
    if (isEventFavorite) {
      removeFromFavorites(event.id);
      setIsEventFavorite(false);
    } else {
      addToFavorites(event.id);
      setIsEventFavorite(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {event.lineup.join(', ')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              {formatDate(event.datetime)}
            </p>
          </div>
          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isEventFavorite 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-400 hover:text-red-500'
            }`}
            aria-label={isEventFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="font-medium">{event.venue.name}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-300 ml-6">
            {event.venue.city}, {event.venue.region}, {event.venue.country}
          </div>
        </div>

        {event.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="flex justify-between items-center">
          <Link 
            href={`/event/${event.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            View Details
          </Link>
          {event.offers.length > 0 && event.offers[0].status === 'available' && (
            <a
              href={event.offers[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              Buy Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}