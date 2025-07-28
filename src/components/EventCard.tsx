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
    <div className="music-card rounded-2xl overflow-hidden hover:music-card transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-2xl">
      {/* Card Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                {event.lineup.join(', ')}
              </h3>
              <div className="flex items-center text-gray-200 mb-2">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{formatDate(event.datetime)}</span>
              </div>
            </div>
            <button
              onClick={toggleFavorite}
              className={`p-3 rounded-full transition-all duration-200 backdrop-blur-sm ${
                isEventFavorite 
                  ? 'text-red-400 hover:text-red-300 bg-white/20 hover:bg-white/30' 
                  : 'text-gray-300 hover:text-red-400 bg-white/10 hover:bg-white/20'
              }`}
              aria-label={isEventFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/5 rounded-full blur-lg"></div>
      </div>

      {/* Card Body */}
      <div className="p-6 bg-gray-800">
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-gray-300">
            <svg className="w-5 h-5 mr-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div>
              <span className="font-semibold text-white block">{event.venue.name}</span>
              <span className="text-sm text-gray-400">
                {event.venue.city}, {event.venue.region}, {event.venue.country}
              </span>
            </div>
          </div>
        </div>

        {event.description && (
          <p className="text-gray-300 mb-6 leading-relaxed line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="flex gap-3">
          <Link 
            href={`/event/${event.id}`}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            View Details
          </Link>
          {event.offers.length > 0 && event.offers[0].status === 'available' && (
            <a
              href={event.offers[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>Tickets</span>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}