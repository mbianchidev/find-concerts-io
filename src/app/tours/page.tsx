'use client';

import DirectoryPage from '@/components/DirectoryPage';
import TourList from '@/components/TourList';
import { tourSchema } from '@/lib/schema';

export default function ToursPage() {
  return (
    <DirectoryPage
      endpoint="/tours"
      schema={tourSchema}
      eyebrow="ANOTHER CITY. SAME FRONT ROW."
      title="Catch the next date."
      description="Collected dates grouped by artist. These are verified listings, not invented official tour schedules."
      render={(tours) => <TourList tours={tours} />}
    />
  );
}
