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
    <div className="min-h-screen bg-dark-space">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-blue/20 to-neon-purple/20 animate-gradient opacity-60"></div>
          <div className="absolute inset-0 grid-pattern opacity-20"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-cyan/10 blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-neon-blue/10 blur-3xl animate-float-slow"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="text-center">
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl mb-6">
                <span className="block neon-text-cyan animate-pulse-glow">
                  EXPLORE
                </span>
                <span className="block mt-2 text-white">
                  EPIC <span className="neon-text-blue">VENUES</span>
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl font-body font-light text-white/80 mb-8 max-w-3xl mx-auto">
                Find and follow the best concert venues and performance spaces
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-space to-transparent"></div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="glass-dark p-6 md:p-8 rounded-2xl shadow-neon-cyan/20 shadow-2xl border border-white/10 animate-scale-in">
            <form onSubmit={handleSearch} className="space-y-6 md:space-y-0 md:flex md:gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="venue-name" className="block text-sm font-display font-semibold uppercase tracking-wider text-neon-cyan mb-2">
                  Venue Name
                </label>
                <input
                  type="text"
                  id="venue-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by venue name"
                  className="input-neon w-full"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="venue-location" className="block text-sm font-display font-semibold uppercase tracking-wider text-neon-blue mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="venue-location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City or Country"
                  className="input-neon w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-neon btn-neon-cyan flex-1 md:flex-none"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-3 glass border border-white/20 rounded-lg font-display font-semibold text-sm uppercase tracking-wider text-white/70 hover:text-white hover:border-white/40 transition-all duration-300"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <VenueList venues={venues} loading={loading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-20">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-void to-transparent opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="font-display font-black text-2xl mb-2">
              <span className="neon-text-pink">FIND</span>
              <span className="text-neon-cyan ml-2">CONCERTS</span>
            </h3>
            <p className="text-white/60 text-sm font-body">
              The ultimate social network for live music
            </p>
            <div className="mt-4 text-xs text-white/40 font-display tracking-wider">
              © 2024 FIND CONCERTS • ALL RIGHTS RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
