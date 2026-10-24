'use client';

import { Tour } from '@/types';
import TourCard from './TourCard';

interface TourListProps {
  tours: Tour[];
  loading?: boolean;
}

export default function TourList({ tours, loading = false }: TourListProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-neon animate-pulse">
            <div className="h-56 skeleton-neon"></div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="h-6 skeleton-neon rounded-sm w-3/4"></div>
                <div className="h-4 skeleton-neon rounded-sm w-1/2"></div>
              </div>
              <div className="h-6 skeleton-neon rounded-sm w-20"></div>
              <div className="h-4 skeleton-neon rounded-sm w-full"></div>
              <div className="flex gap-2">
                <div className="h-6 skeleton-neon rounded-sm w-16"></div>
                <div className="h-6 skeleton-neon rounded-sm w-16"></div>
                <div className="h-6 skeleton-neon rounded-sm w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <div className="mb-8 relative">
            <div className="text-8xl animate-precision-float">🎸</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-accent-orange/15 blur-3xl animate-pulse-sheen clip-hexagon"></div>
            </div>
          </div>
          
          <h3 className="text-3xl font-display font-black metal-text-orange mb-4">
            NO TOURS FOUND
          </h3>
          
          <p className="text-lg text-white/60 mb-8 font-medium">
            Try adjusting your search filters to discover epic tours.
          </p>
          
          <div className="flex justify-center gap-4 text-2xl">
            <span className="animate-pulse text-accent-orange">♪</span>
            <span className="animate-pulse delay-200 text-accent-cobalt">♫</span>
            <span className="animate-pulse delay-400 text-metal-steel">♬</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-white/10">
        <h2 className="text-3xl md:text-4xl font-display font-black">
          <span className="metal-text-orange">{tours.length}</span>
          <span className="text-white ml-3">
            {tours.length === 1 ? 'Tour' : 'Tours'}
          </span>
        </h2>
        
        <div className="text-sm text-white/50 font-display uppercase tracking-wider mt-2 md:mt-0 font-bold">
          World Tours
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour, index) => {
          const delayClass = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500'][index % 6];
          return (
            <div 
              key={tour.id} 
              className={`animate-slide-in ${delayClass}`}
            >
              <TourCard tour={tour} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
