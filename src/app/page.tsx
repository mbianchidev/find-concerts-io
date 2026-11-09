'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import GenreFilters from '@/components/GenreFilters';
import Icon from '@/components/Icon';
import SearchBar from '@/components/SearchBar';
import { AccountGate, ErrorState, LoadingGrid, Pager } from '@/components/Ui';
import { useApiData, useApiPage } from '@/lib/api';
import { eventSchema, sourceStatusSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

const sourcesSchema = z.array(sourceStatusSchema);

function Discovery() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useApp();
  const view = params.get('view') || 'all';
  const genre = params.get('genre') || undefined;
  const filters = {
    artist: params.get('artist') || undefined,
    location: params.get('location') || undefined,
    city: params.get('city') || undefined,
    date: params.get('date') || undefined,
    genre,
  };
  const query = new URLSearchParams({
    page: params.get('page') || '1',
    limit: '12',
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  if (view === 'trending') query.set('view', 'trending');
  const endpoint = view === 'for-you' ? '/me/recommendations' : '/events';
  const results = useApiPage(
    `${endpoint}?${query}`,
    eventSchema,
    view === 'for-you' ? user?.id || 'signed-out' : 'public',
    view !== 'for-you' || (!!user && ready)
  );
  const sources = useApiData('/sources', sourcesSchema);

  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.replace(`/${next.size ? `?${next}` : ''}#shows`, { scroll: false });
  };

  return (
    <main id="main" tabIndex={-1}>
      <div className="container">
        <section className="hero" aria-labelledby="discovery-title">
          <div>
            <p className="eyebrow">
              <span className="status-dot" />
              LIVE MUSIC. REAL PLANS.
            </p>
            <h1 id="discovery-title">
              Find your
              <br />
              next <span>front row.</span>
            </h1>
            <p className="hero-copy">
              The heavy riffs. The small rooms. The nights you talk about for
              years. Find a show worth getting out for.
            </p>
            <div className="hero-links">
              <a className="show-link" href="#shows">
                Explore the listings <Icon name="arrow" />
              </a>
              <span className="hero-note">Venue and specialist calendars</span>
            </div>
          </div>
          <div className="gig-pass" aria-hidden="true">
            <div className="pass-picture">
              <Image
                src="/crowd.jpg"
                alt=""
                fill
                sizes="(max-width: 520px) 90vw, 45vw"
                priority
              />
              <div className="pass-caption">
                <small>LESS SCROLLING. MORE SHOWS.</small>SEE YOU
                <br />
                IN THE PIT.
              </div>
            </div>
            <div className="pass-spine">
              <span>METAL / HARDCORE / ROCK / PUNK</span>
            </div>
            <span className="pass-sticker">YOUR NEXT NIGHT STARTS HERE</span>
          </div>
        </section>
        <SearchBar
          key={[
            filters.artist,
            filters.city,
            filters.location,
            filters.date,
          ].join('|')}
          initial={filters}
          onSearch={(next) =>
            update(
              Object.keys(next).length
                ? {
                    artist: next.artist,
                    location: next.location,
                    city: next.city,
                    date: next.date,
                  }
                : {
                    artist: undefined,
                    location: undefined,
                    city: undefined,
                    date: undefined,
                    genre: undefined,
                  }
            )
          }
        />
        <GenreFilters
          value={genre}
          onChange={(next) => update({ genre: next })}
        />
        <section
          className="listing-section"
          id="shows"
          aria-labelledby="shows-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="shows-title">
                {view === 'for-you'
                  ? 'A little more your kind of loud.'
                  : view === 'trending'
                    ? filters.city || filters.location
                      ? `Trending around ${filters.city || filters.location}.`
                      : "On the scene's radar."
                    : 'Good nights ahead.'}
              </h2>
              <p className="result-count" role="status">
                {results.data
                  ? `${results.data.meta.total} ${results.data.meta.total === 1 ? 'show' : 'shows'}${view === 'trending' ? ' ranked by real account saves' : ' from venue and specialist calendars'}`
                  : view === 'for-you' && !user
                    ? 'Personal recommendations, without the noise.'
                    : 'Finding the next good night...'}
              </p>
            </div>
            <div
              className="filter-segments"
              role="group"
              aria-label="Concert view"
            >
              <button
                aria-pressed={view === 'all'}
                onClick={() => update({ view: undefined })}
              >
                All shows
              </button>
              <button
                aria-pressed={view === 'for-you'}
                onClick={() => update({ view: 'for-you' })}
              >
                <Icon name="bookmark" />
                For you
              </button>
              <button
                aria-pressed={view === 'trending'}
                onClick={() => update({ view: 'trending' })}
              >
                <Icon name="bolt" />
                Trending
              </button>
            </div>
          </div>
          {view === 'for-you' && !user ? (
            <AccountGate>
              Save a few shows or follow an artist, and get recommendations
              based on your scene.
            </AccountGate>
          ) : (
            <>
              <ErrorState
                error={results.error}
                retry={() => void results.refetch()}
              />
              <EventList
                events={results.data?.data || []}
                loading={results.isPending}
                emptyMessage={
                  view === 'for-you'
                    ? 'Save a show or follow an artist to help us find your next one.'
                    : view === 'trending'
                      ? 'No upcoming shows have account saves in this area yet. Try All shows to browse every listing.'
                      : undefined
                }
              />
              {results.data && (
                <Pager
                  page={results.data.meta.page}
                  total={results.data.meta.total}
                  hasNext={results.data.meta.has_next}
                  onChange={(page) => update({ page: String(page) })}
                />
              )}
            </>
          )}
        </section>
        {!user && (
          <section className="scene-banner">
            <div>
              <h2>Your scene. All in one place.</h2>
              <p>
                Save the shows. Follow the bands. Bring your concert history
                along.
              </p>
            </div>
            <Link className="button" href="/account">
              Make it yours <Icon name="arrow" />
            </Link>
          </section>
        )}
        <div className="source-strip">
          <span>SOURCED LISTINGS. ALWAYS CHECK WITH THE VENUE.</span>
          {sources.data?.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={
                source.error ||
                (source.last_run
                  ? `Collected ${formatDate(source.last_run)}`
                  : 'Not collected yet')
              }
            >
              <span className="status-dot" />
              {source.name}
              <span className={source.error ? 'source-error' : ''}>
                {source.event_count} shows
              </span>
            </a>
          ))}
          <Link href="/sources">
            Source status <Icon name="arrow" width="13" height="13" />
          </Link>
        </div>
        <ErrorState
          error={sources.error}
          retry={() => void sources.refetch()}
        />
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="container" id="main">
          <LoadingGrid />
        </main>
      }
    >
      <Discovery />
    </Suspense>
  );
}
