'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import VenueList from '@/components/VenueList';
import { VenueData } from '@/types';
import { mockVenues, filterVenues } from '@/data/mockData';

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueData[]>(mockVenues);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filtered = filterVenues(mockVenues, { 
        name: searchName,
        location: searchLocation 
      });
      setVenues(filtered);
      setLoading(false);
    }, 500);
  };

  const handleClear = () => {
    setSearchName('');
    setSearchLocation('');
    setVenues(mockVenues);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                Explore
                <span className="block text-yellow-300">World-Class Venues</span>
              </h1>
              <p className="text-xl md:text-2xl text-indigo-100 mb-8 max-w-3xl mx-auto">
                Find and follow the best concert venues and performance spaces.
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
            <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="venue-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  id="venue-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by venue name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="venue-location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="venue-location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City or Country"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <VenueList venues={venues} loading={loading} />
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
