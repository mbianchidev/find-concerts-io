'use client';

import DirectoryPage from '@/components/DirectoryPage';
import ArtistList from '@/components/ArtistList';
import { artistSchema } from '@/lib/schema';

export default function ArtistsPage() {
  return (
    <DirectoryPage
      endpoint="/artists"
      schema={artistSchema}
      eyebrow="HEADLINERS AND SUPPORT ACTS"
      title="Find a band."
      description="Bands from the listings, including support acts. Follow them to hear about new gigs."
      render={(artists) => <ArtistList artists={artists} />}
    />
  );
}
