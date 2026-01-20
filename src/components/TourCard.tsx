'use client';

import { Tour } from '@/types';
import { getArtistById } from '@/data/mockData';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';

interface TourCardProps {
  tour: Tour;
  className?: string;
}

export default function TourCard({ tour, className = '' }: TourCardProps) {
  const artist = getArtistById(tour.artist_id);

  if (!artist) return null;

  const startDate = formatDate(tour.start_date);
  const endDate = formatDate(tour.end_date);

  return (
    <div className={`card-metal group ${className}`}>
      {/* Tour Image */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src={tour.image_url || artist.image_url}
          alt={tour.name}
          fill
          className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void-black via-void-black/60 to-transparent"></div>
        
        {/* Shows Count Badge */}
        <div className="absolute top-3 left-3 badge-metal badge-orange backdrop-blur-md animate-pulse-sheen">
          <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          {tour.event_count} Shows
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tour Name */}
        <div className="mb-3">
          <h3 className="text-xl font-display font-bold text-white mb-1 group-hover:text-accent-orange transition-colors">
            {tour.name}
          </h3>
          <p className="text-sm text-white/70 font-body font-medium">
            {artist.name}
          </p>
        </div>

        {/* Genre Badge */}
        <span className="badge-metal badge-cobalt inline-block mb-4">
          {artist.genre}
        </span>

        {/* Tour Dates */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-metal-steel" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-metal-steel font-display font-bold">{startDate}</span>
              <span className="text-white/50 mx-2">→</span>
              <span className="text-accent-cobalt font-display font-bold">{endDate}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {tour.description && (
          <p className="text-sm text-white/70 mb-4 line-clamp-2 font-medium">
            {tour.description}
          </p>
        )}

        {/* Cities List */}
        {tour.cities.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-accent-crimson font-display uppercase tracking-wider mb-2 font-bold">Tour Cities:</p>
            <div className="flex flex-wrap gap-2">
              {tour.cities.slice(0, 3).map((city, index) => (
                <span key={index} className="text-xs px-2 py-1 glass-dark border border-white/10 text-white/80 font-medium clip-angle-tl">
                  {city}
                </span>
              ))}
              {tour.cities.length > 3 && (
                <span className="text-xs px-2 py-1 badge-metal badge-steel">
                  +{tour.cities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-xs text-white/50 font-display font-bold">
            {artist.tracker_count.toLocaleString()} followers
          </div>
          
          {tour.url && (
            <a
              href={tour.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-metal btn-metal-cobalt text-xs py-2 px-4"
            >
              Tour Info
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
