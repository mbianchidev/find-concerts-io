'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import EventList from '@/components/EventList';
import { Event, SearchFilters } from '@/types';
import { mockEvents, filterEvents } from '@/data/mockData';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [loading, setLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

  const handleSearch = async (filters: SearchFilters) => {
    setLoading(true);
    setCurrentFilters(filters);
    
    // Simulate API call delay
    setTimeout(() => {
      const filteredEvents = filterEvents(mockEvents, filters);
      setEvents(filteredEvents);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                Find Your Next
                <span className="block text-yellow-300">Concert Experience</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Discover live music events, concerts, and festivals happening near you or anywhere in the world.
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <EventList events={events} loading={loading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Find Concerts</h3>
            <p className="text-gray-300 text-sm">
              Discover amazing live music events worldwide
            </p>
            <div className="mt-4 text-xs text-gray-400">
              © 2024 Find Concerts. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}