'use client';

import DirectoryPage from '@/components/DirectoryPage';
import TourList from '@/components/TourList';
import { tourSchema } from '@/lib/schema';

export default function ToursPage() {
  return (
    <DirectoryPage
      endpoint="/tours"
      schema={tourSchema}
      eyebrow="COLLECTED DATES"
      title="Tour dates."
      description="We group gigs by band. Check each venue for tickets and times."
      render={(tours) => <TourList tours={tours} />}
    />
  );
}
