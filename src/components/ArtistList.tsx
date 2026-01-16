'use client';

import { Artist } from '@/types';
import ArtistCard from './ArtistCard';

interface ArtistListProps {
  artists: Artist[];
  loading?: boolean;
}

export default function ArtistList({ artists, loading = false }: ArtistListProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-neon animate-pulse">
            <div className="h-56 skeleton-neon"></div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="h-6 skeleton-neon rounded w-3/4"></div>
                <div className="h-4 skeleton-neon rounded w-1/2"></div>
              </div>
              <div className="h-6 skeleton-neon rounded w-20"></div>
              <div className="flex justify-between items-center pt-4">
                <div className="h-3 skeleton-neon rounded w-24"></div>
                <div className="h-3 skeleton-neon rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <div className="mb-8 relative">
            <div className="text-8xl animate-float">🎤</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-neon-purple/20 blur-3xl animate-pulse-glow"></div>
            </div>
          </div>
          
          <h3 className="text-3xl font-display font-bold neon-text-purple mb-4">
            NO ARTISTS FOUND
          </h3>
          
          <p className="text-lg text-white/60 mb-8">
            Try adjusting your search filters to discover amazing artists.
          </p>
          
          <div className="flex justify-center gap-4 text-2xl">
            <span className="animate-pulse text-neon-pink">♪</span>
            <span className="animate-pulse delay-200 text-neon-cyan">♫</span>
            <span className="animate-pulse delay-400 text-neon-lime">♬</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-white/10">
        <h2 className="text-3xl md:text-4xl font-display font-black">
          <span className="neon-text-purple">{artists.length}</span>
          <span className="text-white ml-3">
            {artists.length === 1 ? 'Artist' : 'Artists'}
          </span>
        </h2>
        
        <div className="text-sm text-white/50 font-display uppercase tracking-wider mt-2 md:mt-0">
          Global Talent
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist, index) => {
          const delayClass = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500'][index % 6];
          return (
            <div 
              key={artist.id} 
              className={`animate-slide-in ${delayClass}`}
            >
              <ArtistCard artist={artist} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
