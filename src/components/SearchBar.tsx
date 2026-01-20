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
    <div className="glass-dark p-6 md:p-8 shadow-metal-steel/20 shadow-2xl border border-metal-steel/20 animate-mechanical-scale clip-angle-dual">
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-0 md:flex md:gap-4 md:items-end">
        {/* Location Input */}
        <div className="flex-1">
          <label htmlFor="location" className="block text-sm font-display font-bold uppercase tracking-wider text-metal-steel mb-2">
            Location
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="input-metal w-full"
          />
        </div>

        {/* Artist Input */}
        <div className="flex-1">
          <label htmlFor="artist" className="block text-sm font-display font-bold uppercase tracking-wider text-accent-crimson mb-2">
            Artist
          </label>
          <input
            type="text"
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist name"
            className="input-metal w-full"
          />
        </div>

        {/* Date Input */}
        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-display font-bold uppercase tracking-wider text-accent-cobalt mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-metal w-full"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="btn-metal btn-metal-crimson flex-1 md:flex-none"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}