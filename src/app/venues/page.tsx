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
    <div className="min-h-screen bg-void-black">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Metallic Background */}
          <div className="absolute inset-0 bg-linear-to-br from-accent-cobalt/12 via-metal-steel/10 to-metal-chrome/10 opacity-70"></div>
          <div className="absolute inset-0 grid-pattern opacity-30"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-accent-cobalt/8 blur-3xl animate-precision-float clip-hexagon"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-metal-steel/10 blur-3xl animate-precision-float-slow clip-angle-dual"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="text-center">
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl mb-6">
                <span className="block metal-text-cobalt animate-pulse-sheen">
                  EXPLORE
                </span>
                <span className="block mt-2 text-white">
                  EPIC <span className="metal-text-steel">VENUES</span>
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl font-body font-medium text-white/80 mb-8 max-w-3xl mx-auto">
                Find and follow the best concert venues and performance spaces
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-void-black to-transparent"></div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="glass-dark p-6 md:p-8 shadow-metal-cobalt/20 shadow-2xl border border-metal-steel/20 animate-mechanical-scale clip-angle-dual">
            <form onSubmit={handleSearch} className="space-y-6 md:space-y-0 md:flex md:gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="venue-name" className="block text-sm font-display font-bold uppercase tracking-wider text-accent-cobalt mb-2">
                  Venue Name
                </label>
                <input
                  type="text"
                  id="venue-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by venue name"
                  className="input-metal w-full"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="venue-location" className="block text-sm font-display font-bold uppercase tracking-wider text-metal-steel mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="venue-location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="City or Country"
                  className="input-metal w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-metal btn-metal-cobalt flex-1 md:flex-none"
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
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <VenueList venues={venues} loading={loading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-20">
        <div className="absolute inset-0 bg-linear-to-t from-obsidian to-transparent opacity-70"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="font-display font-black text-2xl mb-2">
              <span className="metal-text-crimson">FIND</span>
              <span className="text-metal-steel ml-2">CONCERTS</span>
            </h3>
            <p className="text-white/60 text-sm font-body font-medium">
              The ultimate social network for live music
            </p>
            <div className="mt-4 text-xs text-white/40 font-display tracking-wider font-bold">
              © 2024 FIND CONCERTS • ALL RIGHTS RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
