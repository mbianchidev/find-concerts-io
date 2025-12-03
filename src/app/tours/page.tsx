'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import TourList from '@/components/TourList';
import { Tour } from '@/types';
import { mockTours, filterTours } from '@/data/mockData';

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>(mockTours);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchArtist, setSearchArtist] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filtered = filterTours(mockTours, { 
        name: searchName,
        artist: searchArtist 
      });
      setTours(filtered);
      setLoading(false);
    }, 500);
  };

  const handleClear = () => {
    setSearchName('');
    setSearchArtist('');
    setTours(mockTours);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                Discover
                <span className="block text-yellow-300">Epic Tours</span>
              </h1>
              <p className="text-xl md:text-2xl text-green-100 mb-8 max-w-3xl mx-auto">
                Follow your favorite artists on their world tours and catch them live.
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
            <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="tour-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Tour Name
                </label>
                <input
                  type="text"
                  id="tour-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by tour name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="tour-artist" className="block text-sm font-medium text-gray-700 mb-1">
                  Artist
                </label>
                <input
                  type="text"
                  id="tour-artist"
                  value={searchArtist}
                  onChange={(e) => setSearchArtist(e.target.value)}
                  placeholder="Search by artist"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
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
          <TourList tours={tours} loading={loading} />
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
