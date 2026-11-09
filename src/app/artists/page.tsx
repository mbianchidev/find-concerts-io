'use client';

import DirectoryPage from '@/components/DirectoryPage';
import ArtistList from '@/components/ArtistList';
import { artistSchema } from '@/lib/schema';

export default function ArtistsPage() {
  return (
    <DirectoryPage
      endpoint="/artists"
      schema={artistSchema}
      eyebrow="THE PEOPLE MAKING THE NOISE"
      title="Find your next favourite."
      description="Artists from collected venue lineups. Follow them to hear when another show lands."
      render={(artists) => <ArtistList artists={artists} />}
    />
  );
}
