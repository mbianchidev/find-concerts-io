'use client';

import { useState } from 'react';
import { SearchFilters } from '@/types';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [location, setLocation] = useState('');
  const [artist, setArtist] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      location: location.trim() || undefined,
      artist: artist.trim() || undefined,
      date: date || undefined
    });
  };

  const handleClear = () => {
    setLocation('');
    setArtist('');
    setDate('');
    onSearch({});
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
        <div className="flex-1">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1">
          <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
            Artist
          </label>
          <input
            type="text"
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
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
  );
}