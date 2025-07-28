'use client';

import { useState } from 'react';
import { SearchFilters } from '@/types';
import { genres } from '@/data/mockData';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

export default function SearchForm({ onSearch }: SearchFormProps) {
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleInputChange = (field: keyof SearchFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    onSearch({});
  };

  return (
    <div className="glass-effect rounded-2xl p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12 border border-gray-700">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-white">
          Find Your Next Concert
        </h2>
        <p className="text-gray-300 text-base sm:text-lg">
          Search through thousands of live music events worldwide
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Location</span>
              </div>
            </label>
            <input
              type="text"
              placeholder="City, State, or Country"
              value={filters.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span>Artist</span>
              </div>
            </label>
            <input
              type="text"
              placeholder="Artist or band name"
              value={filters.artist || ''}
              onChange={(e) => handleInputChange('artist', e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2v8h12V6H4z" clipRule="evenodd" />
                </svg>
                <span>Venue</span>
              </div>
            </label>
            <input
              type="text"
              placeholder="Venue name"
              value={filters.venue || ''}
              onChange={(e) => handleInputChange('venue', e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>Date</span>
              </div>
            </label>
            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h2a2 2 0 002-2V3a2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" clipRule="evenodd" />
                </svg>
                <span>Genre</span>
              </div>
            </label>
            <select
              value={filters.genre || ''}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all duration-200"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre} className="bg-gray-800">{genre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 justify-center">
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search Events</span>
            </div>
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear Filters</span>
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}