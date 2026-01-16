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
    <div className="min-h-screen bg-dark-space">
      <Header />
      
      <main>
        {/* Epic Hero Section */}
        <div className="relative overflow-hidden">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/20 via-neon-purple/20 to-neon-cyan/20 animate-gradient opacity-60"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 grid-pattern opacity-20"></div>
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-pink/10 blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-neon-cyan/10 blur-3xl animate-float-slow"></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-neon-lime/10 blur-3xl animate-float delay-300"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="text-center">
              {/* Headline */}
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 animate-slide-in">
                <span className="block neon-text-pink animate-pulse-glow">
                  DISCOVER
                </span>
                <span className="block mt-2">
                  <span className="neon-text-cyan">LIVE</span>
                  <span className="text-white mx-4">•</span>
                  <span className="neon-text-lime">MUSIC</span>
                </span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-xl md:text-2xl lg:text-3xl font-body font-light text-white/80 mb-8 max-w-4xl mx-auto animate-slide-in delay-200">
                Join the <span className="neon-text-orange font-semibold">ultimate social network</span> for music lovers.
                <span className="block mt-2">Find concerts, follow artists, connect with the scene.</span>
              </p>
              
              {/* Stats Bar */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12 animate-slide-in delay-400">
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold neon-text-pink">10K+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1">Events</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold neon-text-cyan">500+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1">Artists</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold neon-text-lime">100+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wider mt-1">Venues</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-space to-transparent"></div>
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
        <div className="absolute inset-0 bg-gradient-to-t from-dark-void to-transparent opacity-50"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Logo */}
            <h3 className="font-display font-black text-3xl mb-3">
              <span className="neon-text-pink">FIND</span>
              <span className="text-neon-cyan ml-2">CONCERTS</span>
            </h3>
            
            {/* Tagline */}
            <p className="text-white/60 text-base mb-6 font-body">
              The ultimate social network for live music
            </p>
            
            {/* Social Icons Placeholder */}
            <div className="flex justify-center gap-6 mb-8">
              <div className="w-10 h-10 rounded-full glass neon-border-pink flex items-center justify-center hover:bg-neon-pink/10 transition-all cursor-pointer">
                <span className="text-neon-pink text-xl">♪</span>
              </div>
              <div className="w-10 h-10 rounded-full glass neon-border-cyan flex items-center justify-center hover:bg-neon-cyan/10 transition-all cursor-pointer">
                <span className="text-neon-cyan text-xl">♫</span>
              </div>
              <div className="w-10 h-10 rounded-full glass neon-border-lime flex items-center justify-center hover:bg-neon-lime/10 transition-all cursor-pointer">
                <span className="text-neon-lime text-xl">♬</span>
              </div>
            </div>
            
            {/* Copyright */}
            <div className="text-xs text-white/40 font-display tracking-wider">
              © 2024 FIND CONCERTS • ALL RIGHTS RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}