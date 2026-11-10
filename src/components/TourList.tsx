import type { Tour } from '@/types';
import TourCard from './TourCard';
import { EmptyState, LoadingGrid } from './Ui';

export default function TourList({
  tours,
  loading,
}: {
  tours: Tour[];
  loading?: boolean;
}) {
  if (loading) return <LoadingGrid />;
  if (!tours.length)
    return (
      <EmptyState title="No tours match these filters.">
        <p>At least two gigs by the same band need to match these filters.</p>
      </EmptyState>
    );
  return (
    <div className="tour-grid">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}
