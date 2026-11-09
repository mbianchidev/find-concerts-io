import type { Artist } from '@/types';
import ArtistCard from './ArtistCard';
import { EmptyState, LoadingGrid } from './Ui';

export default function ArtistList({
  artists,
  loading,
}: {
  artists: Artist[];
  loading?: boolean;
}) {
  if (loading) return <LoadingGrid />;
  if (!artists.length)
    return (
      <EmptyState title="No artists found.">
        <p>Try another name or collect more venue listings.</p>
      </EmptyState>
    );
  return (
    <div className="event-grid">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  );
}
