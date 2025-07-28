'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Event } from '@/types';
import { getAllEvents } from '@/lib/api';
import { formatDate, isFavorite, addToFavorites, removeFromFavorites } from '@/lib/utils';

const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => <div className="bg-gray-200 animate-pulse rounded-lg h-64" />
});

interface EventDetailClientProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailClient({ params }: EventDetailClientProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isEventFavorite, setIsEventFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { id } = await params;
        // Get all events and find the specific one
        const allEvents = await getAllEvents('demo-app-id');
        const foundEvent = allEvents.find(e => e.id === id);
        
        setEvent(foundEvent || null);
        if (foundEvent) {
          setIsEventFavorite(isFavorite(foundEvent.id));
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Failed to load event:', err);
        setError('Failed to load event details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [params]);

  const toggleFavorite = () => {
    if (!event) return;
    
    if (isEventFavorite) {
      removeFromFavorites(event.id);
      setIsEventFavorite(false);
    } else {
      addToFavorites(event.id);
      setIsEventFavorite(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Event Not Found'}
          </h1>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-700 mr-4"
            >
              ← Back to Events
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Event Details
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {event.lineup.join(', ')}
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    {formatDate(event.datetime)}
                  </p>
                </div>
                <button
                  onClick={toggleFavorite}
                  className={`p-3 rounded-full transition-colors duration-200 ${
                    isEventFavorite 
                      ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700'
                  }`}
                  aria-label={isEventFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
              </div>

              {event.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    About this Event
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {event.description}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Venue Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <div>
                        <div className="font-medium">{event.venue.name}</div>
                        <div className="text-sm">
                          {event.venue.city}, {event.venue.region}, {event.venue.country}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Lineup
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {event.lineup.map((artist, index) => (
                      <span 
                        key={index}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {artist}
                      </span>
                    ))}
                  </div>
                </div>

                {event.offers.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Tickets
                    </h3>
                    <div className="space-y-2">
                      {event.offers.map((offer, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {offer.type}
                            </span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              offer.status === 'available' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            }`}>
                              {offer.status}
                            </span>
                          </div>
                          {offer.status === 'available' && (
                            <a
                              href={offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                            >
                              Buy Now
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-6">
            <EventMap events={[event]} />
          </div>
        </div>
      </main>
    </div>
  );
}