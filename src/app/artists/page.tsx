'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ArtistList from '@/components/ArtistList';
import { Artist } from '@/types';
import { mockArtists, filterArtists, getUniqueGenres } from '@/data/mockData';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>(mockArtists);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const genres = getUniqueGenres();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filtered = filterArtists(mockArtists, { 
        name: searchQuery,
        genre: selectedGenre 
      });
      setArtists(filtered);
      setLoading(false);
    }, 500);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setArtists(mockArtists);
  };

  return (
    <div className="min-h-screen bg-dark-space">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-pink/20 to-neon-orange/20 animate-gradient opacity-60"></div>
          <div className="absolute inset-0 grid-pattern opacity-20"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-purple/10 blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-neon-pink/10 blur-3xl animate-float-slow"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="text-center">
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl mb-6">
                <span className="block neon-text-purple animate-pulse-glow">
                  DISCOVER
                </span>
                <span className="block mt-2 neon-text-pink">
                  AMAZING ARTISTS
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl font-body font-light text-white/80 mb-8 max-w-3xl mx-auto">
                Follow your favorite musicians and discover new talent
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-space to-transparent"></div>
        </div>

        {/* Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="glass-dark p-6 md:p-8 rounded-2xl shadow-neon-purple/20 shadow-2xl border border-white/10 animate-scale-in">
            <form onSubmit={handleSearch} className="space-y-6 md:space-y-0 md:flex md:gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="artist-search" className="block text-sm font-display font-semibold uppercase tracking-wider text-neon-purple mb-2">
                  Search Artists
                </label>
                <input
                  type="text"
                  id="artist-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Artist name"
                  className="input-neon w-full"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="genre-select" className="block text-sm font-display font-semibold uppercase tracking-wider text-neon-pink mb-2">
                  Genre
                </label>
                <select
                  id="genre-select"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="input-neon w-full"
                >
                  <option value="all">All Genres</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-neon btn-neon-purple flex-1 md:flex-none"
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
          <ArtistList artists={artists} loading={loading} />
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
