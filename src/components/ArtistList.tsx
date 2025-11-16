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
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-t-lg"></div>
            <div className="bg-white p-4 rounded-b-lg shadow-md">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded mb-3 w-1/2"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🎤</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No artists found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search criteria to find more artists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {artists.length} {artists.length === 1 ? 'Artist' : 'Artists'} Found
        </h2>
        <div className="text-sm text-gray-500">
          Showing results for your search
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}
