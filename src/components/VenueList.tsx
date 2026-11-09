import type { VenueData } from '@/types';
import VenueCard from './VenueCard';
import { EmptyState, LoadingGrid } from './Ui';

export default function VenueList({
  venues,
  loading,
}: {
  venues: VenueData[];
  loading?: boolean;
}) {
  if (loading) return <LoadingGrid />;
  if (!venues.length)
    return (
      <EmptyState title="No venues found.">
        <p>Try another city or venue name.</p>
      </EmptyState>
    );
  return (
    <div className="event-grid">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
}
