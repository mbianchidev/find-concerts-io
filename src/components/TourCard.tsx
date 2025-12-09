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
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="relative h-48 w-full">
        <Image
          src={tour.image_url || artist.image_url}
          alt={tour.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {tour.event_count} Shows
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {tour.name}
            </h3>
            <p className="text-sm text-gray-600">
              {artist.name}
            </p>
            <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
              {artist.genre}
            </span>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-700">
            {startDate} - {endDate}
          </p>
        </div>

        {tour.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {tour.description}
          </p>
        )}

        {tour.cities.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Cities:</p>
            <p className="text-sm text-gray-700">
              {tour.cities.slice(0, 3).join(', ')}
              {tour.cities.length > 3 && ` +${tour.cities.length - 3} more`}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {artist.tracker_count.toLocaleString()} followers
          </div>
          
          {tour.url && (
            <a
              href={tour.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors"
            >
              View Tour
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
