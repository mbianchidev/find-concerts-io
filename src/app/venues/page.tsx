'use client';

import DirectoryPage from '@/components/DirectoryPage';
import VenueList from '@/components/VenueList';
import { venueSchema } from '@/lib/schema';

export default function VenuesPage() {
  return (
    <DirectoryPage
      endpoint="/venues"
      schema={venueSchema}
      eyebrow="INDEPENDENT ROOMS. UNFORGETTABLE NIGHTS."
      title="Know where to go."
      description="Explore the venues behind the listings. Follow a room and keep its new shows on your radar."
      render={(venues) => <VenueList venues={venues} />}
    />
  );
}
