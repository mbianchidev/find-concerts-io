'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import { AccountGate, ErrorState, PageIntro } from '@/components/Ui';
import { apiData, useApiData } from '@/lib/api';
import { GENRES } from '@/lib/concerts';
import {
  eventSchema,
  notificationConfigSchema,
  spotifyArtistSchema,
} from '@/lib/schema';

const healthSchema = z.object({
  status: z.string(),
  notifications: notificationConfigSchema,
  providers: z.object({ spotify: z.boolean(), ticketmaster: z.boolean() }),
});
const spotifySchema = z.array(spotifyArtistSchema);
const ticketmasterSchema = z.object({
  events: z.array(eventSchema),
  warnings: z.array(z.string()),
});

export default function IntegrationsPage() {
  const { user } = useApp();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('Rock');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const health = useApiData('/health', healthSchema);
  const spotify = useMutation({
    mutationFn: () =>
      apiData(
        `/integrations/spotify/artists?q=${encodeURIComponent(query)}`,
        spotifySchema
      ),
  });
  const ticketmaster = useMutation({
    mutationFn: () =>
      apiData('/integrations/ticketmaster/searches', ticketmasterSchema, {
        method: 'POST',
        body: JSON.stringify({ q: query, city, genre }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['page'] });
    },
  });
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow="OPTIONAL CONNECTIONS / NO HIDDEN FALLBACKS"
        title="Go a little further."
      >
        <p>
          Search artist metadata or additional event listings when the server
          has provider credentials. Searches are explicit; private workbooks are
          never sent to these services.
        </p>
      </PageIntro>
      {!user ? (
        <AccountGate>
          Sign in before using optional music-provider searches.
        </AccountGate>
      ) : (
        <>
          <ErrorState error={health.error} />
          <section className="panel">
            <h2>Choose what to look for.</h2>
            <div className="mapping-grid">
              <label htmlFor="integration-query">
                Artist or concert
                <input
                  id="integration-query"
                  minLength={2}
                  maxLength={200}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="At least two characters"
                />
              </label>
              <label htmlFor="integration-city">
                City (Ticketmaster)
                <input
                  id="integration-city"
                  value={city}
                  maxLength={200}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label htmlFor="integration-genre">
                Genre (Ticketmaster)
                <select
                  id="integration-genre"
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                >
                  {GENRES.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <div className="account-grid" style={{ marginTop: 25 }}>
            <section className="panel">
              <h2>Spotify artist metadata.</h2>
              <p>
                {health.data?.providers.spotify
                  ? 'Find artist profiles and genres. Previews appear only when Spotify actually supplies one.'
                  : 'Not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the server.'}
              </p>
              <button
                className="button"
                disabled={
                  !health.data?.providers.spotify ||
                  query.trim().length < 2 ||
                  spotify.isPending
                }
                onClick={() => spotify.mutate()}
              >
                {spotify.isPending ? 'Searching...' : 'Search Spotify'}
              </button>
              <ErrorState error={spotify.error} />
              {spotify.data && (
                <div className="directory-results">
                  {!spotify.data.length && <p>No matching artist profiles.</p>}
                  {spotify.data.map((artist) => (
                    <div className="source-card" key={artist.id}>
                      <a
                        href={artist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {artist.name}
                      </a>
                      <p>
                        {artist.genres.join(', ') ||
                          'No genres supplied by Spotify'}
                      </p>
                      {artist.preview_url ? (
                        <audio
                          controls
                          preload="none"
                          src={artist.preview_url}
                          onError={() =>
                            setPreviewError(
                              'Spotify supplied a preview, but it could not be played. Open the original artist profile instead.'
                            )
                          }
                          aria-label={`Preview for ${artist.name}`}
                        />
                      ) : (
                        <p className="muted-note">
                          No preview supplied by Spotify.
                        </p>
                      )}
                    </div>
                  ))}
                  {previewError && <p role="alert">{previewError}</p>}
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Ticketmaster event listings.</h2>
              <p>
                {health.data?.providers.ticketmaster
                  ? 'Find additional matching concerts and add verified records to the public catalogue. Incomplete records are reported, not silently discarded.'
                  : 'Not configured. Set TICKETMASTER_API_KEY on the server. Venue scraping works without this integration.'}
              </p>
              <button
                className="button"
                disabled={
                  !health.data?.providers.ticketmaster ||
                  query.trim().length < 2 ||
                  ticketmaster.isPending
                }
                onClick={() => ticketmaster.mutate()}
              >
                {ticketmaster.isPending
                  ? 'Searching...'
                  : 'Search Ticketmaster'}
              </button>
              <ErrorState error={ticketmaster.error} />
              {ticketmaster.data && (
                <p className="success-panel" role="status">
                  {ticketmaster.data.events.length} verified concerts added or
                  updated. {ticketmaster.data.warnings.length} provider
                  warnings.
                </p>
              )}
              {ticketmaster.data?.warnings.length ? (
                <ul className="issue-list">
                  {ticketmaster.data.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
          {ticketmaster.data && (
            <section
              className="listing-section"
              aria-label="Ticketmaster results"
            >
              <EventList
                events={ticketmaster.data.events}
                emptyMessage="No supported upcoming concerts matched this search."
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
