'use client';

import { Event } from '@/types';
import EventCard from './EventCard';

interface EventListProps {
  events: Event[];
  loading?: boolean;
}

export default function EventList({ events, loading = false }: EventListProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-neon animate-pulse">
            {/* Image Skeleton */}
            <div className="h-56 skeleton-neon"></div>
            
            {/* Content Skeleton */}
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="h-6 skeleton-neon rounded w-3/4"></div>
                <div className="h-4 skeleton-neon rounded w-1/2"></div>
              </div>
              
              <div className="space-y-2">
                <div className="h-4 skeleton-neon rounded w-full"></div>
                <div className="h-3 skeleton-neon rounded w-2/3"></div>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <div className="h-3 skeleton-neon rounded w-20"></div>
                <div className="h-8 skeleton-neon rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          {/* Animated Icon */}
          <div className="mb-8 relative">
            <div className="text-8xl animate-float">🎵</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-neon-pink/20 blur-3xl animate-pulse-glow"></div>
            </div>
          </div>
          
          {/* Heading */}
          <h3 className="text-3xl font-display font-bold neon-text-pink mb-4">
            NO EVENTS FOUND
          </h3>
          
          {/* Description */}
          <p className="text-lg text-white/60 mb-8">
            Try adjusting your search filters to discover amazing concerts and live music events.
          </p>
          
          {/* Decorative Elements */}
          <div className="flex justify-center gap-4 text-2xl">
            <span className="animate-pulse text-neon-cyan">♪</span>
            <span className="animate-pulse delay-200 text-neon-lime">♫</span>
            <span className="animate-pulse delay-400 text-neon-orange">♬</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-white/10">
        <h2 className="text-3xl md:text-4xl font-display font-black">
          <span className="neon-text-pink">{events.length}</span>
          <span className="text-white ml-3">
            {events.length === 1 ? 'Event' : 'Events'}
          </span>
        </h2>
        
        <div className="text-sm text-white/50 font-display uppercase tracking-wider mt-2 md:mt-0">
          Live Music • Worldwide
        </div>
      </div>
      
      {/* Event Grid with Staggered Animation */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event, index) => {
          const delayClass = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500'][index % 6];
          return (
            <div 
              key={event.id} 
              className={`animate-slide-in ${delayClass}`}
            >
              <EventCard event={event} />
            </div>
          );
        })}
      </div>
    </div>
  );
}