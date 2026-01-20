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
    <div className="min-h-screen bg-void-black">
      <Header />
      
      <main>
        {/* Epic Hero Section */}
        <div className="relative overflow-hidden">
          {/* Metallic Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-metal-gunmetal/15 via-metal-charcoal/12 to-metal-chrome/10 opacity-70"></div>
          
          {/* Geometric Grid Pattern */}
          <div className="absolute inset-0 grid-pattern opacity-30"></div>
          
          {/* Angular Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-metal-steel/8 blur-3xl animate-precision-float clip-hexagon"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-metal-charcoal/10 blur-3xl animate-precision-float-slow clip-angle-dual"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-accent-crimson/8 blur-3xl animate-precision-float delay-300"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="text-center">
              {/* Headline */}
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 animate-mechanical-slide">
                <span className="block metal-text-crimson animate-pulse-sheen">
                  DISCOVER
                </span>
                <span className="block mt-2">
                  <span className="metal-text-steel">LIVE</span>
                  <span className="text-white mx-4">•</span>
                  <span className="metal-text-cobalt">MUSIC</span>
                </span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-xl md:text-2xl lg:text-3xl font-body font-medium text-white/80 mb-8 max-w-4xl mx-auto animate-mechanical-slide delay-200">
                Join the <span className="metal-text-orange font-bold">ultimate social network</span> for music lovers.
                <span className="block mt-2">Find concerts, follow artists, connect with the scene.</span>
              </p>
              
              {/* Stats Bar */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12 animate-mechanical-slide delay-400">
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold metal-text-crimson">10K+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1 font-bold">Events</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold metal-text-steel">500+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1 font-bold">Artists</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold metal-text-cobalt">100+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1 font-bold">Venues</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void-black to-transparent"></div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Results Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <EventList events={events} loading={loading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-20">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian to-transparent opacity-70"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Logo */}
            <h3 className="font-display font-black text-3xl mb-3">
              <span className="metal-text-crimson">FIND</span>
              <span className="text-metal-steel ml-2">CONCERTS</span>
            </h3>
            
            {/* Tagline */}
            <p className="text-white/60 text-base mb-6 font-body font-medium">
              The ultimate social network for live music
            </p>
            
            {/* Social Icons Placeholder */}
            <div className="flex justify-center gap-6 mb-8">
              <div className="w-10 h-10 glass metal-border-crimson flex items-center justify-center hover:bg-accent-crimson/10 transition-all cursor-pointer clip-angle-dual">
                <span className="text-accent-crimson text-xl">♪</span>
              </div>
              <div className="w-10 h-10 glass metal-border-steel flex items-center justify-center hover:bg-metal-steel/10 transition-all cursor-pointer clip-angle-dual">
                <span className="text-metal-steel text-xl">♫</span>
              </div>
              <div className="w-10 h-10 glass metal-border-cobalt flex items-center justify-center hover:bg-accent-cobalt/10 transition-all cursor-pointer clip-angle-dual">
                <span className="text-accent-cobalt text-xl">♬</span>
              </div>
            </div>
            
            {/* Copyright */}
            <div className="text-xs text-white/40 font-display tracking-wider font-bold">
              © 2024 FIND CONCERTS • ALL RIGHTS RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}