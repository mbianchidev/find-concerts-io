'use client';

import DirectoryPage from '@/components/DirectoryPage';
import VenueList from '@/components/VenueList';
import { venueSchema } from '@/lib/schema';

export default function VenuesPage() {
  return (
    <DirectoryPage
      endpoint="/venues"
      schema={venueSchema}
      eyebrow="VENUES"
      title="Find a venue."
      description="Venues from the listings. You can follow one even when it has no upcoming gigs."
      render={(venues) => <VenueList venues={venues} />}
    />
  );
}
