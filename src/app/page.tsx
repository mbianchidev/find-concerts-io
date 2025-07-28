'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Event, SearchFilters } from '@/types';
import { getAllEvents } from '@/lib/api';
import { filterEvents } from '@/lib/utils';
import SearchForm from '@/components/SearchForm';
import EventCard from '@/components/EventCard';

// Dynamically import the map component to avoid SSR issues
const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => <div className="bg-gray-200 animate-pulse rounded-lg h-96" />
});

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Using the getAllEvents API function with a demo app_id
        const allEvents = await getAllEvents('demo-app-id');
        setEvents(allEvents);
        setFilteredEvents(allEvents);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleSearch = async (filters: SearchFilters) => {
    setIsLoading(true);
    
    // The filtering is now done client-side, but we simulate API delay
    // In a real app, this could be server-side filtering
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filtered = filterEvents(events, filters);
    setFilteredEvents(filtered);
    setIsLoading(false);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    if (viewMode === 'list') {
      setViewMode('map');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Find Concerts IO
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Discover music events worldwide
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <SearchForm onSearch={handleSearch} />

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {isLoading ? 'Searching...' : `${filteredEvents.length} events found`}
          </div>
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Map View
            </button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 text-lg mb-2">
              {error}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reload page
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EventMap 
                events={filteredEvents} 
                selectedEvent={selectedEvent}
                onEventSelect={handleEventSelect}
              />
            )}

            {filteredEvents.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  No events found
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                  Try adjusting your search criteria
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 dark:text-gray-300">
            <p>&copy; 2024 Find Concerts IO. Discover music events worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}