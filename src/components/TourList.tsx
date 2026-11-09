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
      <EmptyState title="More dates, more chances.">
        <p>
          Artists with at least two collected upcoming dates appear here. No
          tour schedules are invented.
        </p>
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
