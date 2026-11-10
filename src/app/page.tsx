'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import ConcertSort from '@/components/ConcertSort';
import GenreFilters from '@/components/GenreFilters';
import Icon from '@/components/Icon';
import SearchBar from '@/components/SearchBar';
import { AccountGate, ErrorState, LoadingGrid, Pager } from '@/components/Ui';
import { useApiData, useApiPage } from '@/lib/api';
import {
  eventSchema,
  searchFiltersSchema,
  sourceStatusSchema,
} from '@/lib/schema';
import { formatDate, localCalendarDate } from '@/lib/utils';

const sourcesSchema = z.array(sourceStatusSchema);

function Discovery() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready } = useApp();
  const view = params.get('view') || 'all';
  const filters = searchFiltersSchema.parse(Object.fromEntries(params));
  const { genre } = filters;
  const query = new URLSearchParams({
    page: params.get('page') || '1',
    limit: '12',
    today: localCalendarDate(),
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
              METAL / HARDCORE / ROCK / PUNK
            </p>
            <h1 id="discovery-title">
              Find your
              <br />
              next <span>gig.</span>
            </h1>
            <p className="hero-copy">
              Stage diving or 2stepping in the pit, you choose.
            </p>
            <div className="hero-links">
              <a className="show-link" href="#shows">
                Browse gigs <Icon name="arrow" />
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
                SEE YOU
                <br />
                IN THE PIT.
              </div>
            </div>
            <div className="pass-spine">
              <span>METAL / HARDCORE / ROCK / PUNK</span>
            </div>
            <span className="pass-sticker">BRING EARPLUGS.</span>
          </div>
        </section>
        <SearchBar
          key={JSON.stringify(filters)}
          initial={filters}
          venues={results.data?.meta.venues}
          venuesPending={results.isFetching}
          onSearch={(next) =>
            update({
              ...Object.fromEntries(
                Object.keys(filters).map((key) => [key, undefined])
              ),
              ...next,
              genre: Object.keys(next).length ? genre : undefined,
              sort: Object.keys(next).length ? filters.sort : undefined,
            })
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
                  ? 'Gigs you might like.'
                  : view === 'trending'
                    ? 'Gigs people saved.'
                    : filters.period === 'past'
                      ? 'Past gigs.'
                      : filters.period === 'today'
                        ? 'Gigs today.'
                        : 'Gigs.'}
              </h2>
              <p className="result-count" role="status">
                {results.data
                  ? `${results.data.meta.total} ${results.data.meta.total === 1 ? 'show' : 'shows'}${view === 'trending' ? (filters.sort ? ' with account saves' : ' ranked by real account saves') : ' from venue and specialist calendars'}`
                  : view === 'for-you' && !user
                    ? 'Sign in for gig recommendations.'
                    : 'Loading gigs...'}
              </p>
            </div>
            <div className="listing-controls">
              <ConcertSort
                value={filters.sort}
                onChange={(sort) => update({ sort })}
                rankedLabel={
                  view === 'trending'
                    ? 'Most saved'
                    : view === 'for-you'
                      ? 'Recommended'
                      : undefined
                }
              />
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
          </div>
          {view === 'for-you' && !user ? (
            <AccountGate>
              Sign in to get recommendations from your saved gigs and the bands
              and venues you follow.
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
                    ? 'Save a gig or follow a band or venue to get recommendations.'
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
              <h2>Save your gigs.</h2>
              <p>
                Sign in to sync saves, follow bands and venues, or import your
                concert spreadsheet.
              </p>
            </div>
            <Link className="button" href="/account">
              Sign in <Icon name="arrow" />
            </Link>
          </section>
        )}
        <div className="source-strip">
          <span>CHECK WITH THE VENUE BEFORE YOU BOOK.</span>
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
