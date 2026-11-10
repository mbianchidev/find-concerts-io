'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Event, SavedConcertStatus } from '@/types';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import Icon from '@/components/Icon';
import { ErrorState, PageIntro, Pager } from '@/components/Ui';
import { apiData, apiPage, useApiData, useApiPage } from '@/lib/api';
import {
  eventSchema,
  notificationSchema,
  savedConcertStatusSchema,
} from '@/lib/schema';
import {
  filterEvents,
  filterSavedEvents,
  SAVED_CONCERT_STATUS_LABELS,
  sortEvents,
} from '@/lib/concerts';
import { formatDate, localCalendarDate } from '@/lib/utils';

const notificationsSchema = z.array(notificationSchema);

export default function SavedPage() {
  const { user, saves, toggleSaved, ready, pending } = useApp();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [archive, setArchive] = useState(false);
  const [status, setStatus] = useState<SavedConcertStatus | ''>('');
  const statusFilter = useRef<HTMLSelectElement>(null);
  const statusFilterId = useId();
  const savedEvents = saves.filter((item) => item.type === 'event');
  const following = saves.filter((item) => item.type !== 'event');
  const ids = [...new Set(savedEvents.map((item) => item.id))];
  const today = localCalendarDate();
  const query = new URLSearchParams({
    page: String(page),
    limit: '12',
    today,
    period: archive ? 'past' : 'all',
    sort: archive ? 'date_desc' : 'date_asc',
  });
  if (status) query.set('status', status);
  const concerts = useApiPage(
    `/me/saved-events?${query}`,
    eventSchema,
    user?.id || 'signed-out',
    !!user && ready
  );
  const guestConcerts = useQuery({
    queryKey: ['page', 'guest', 'saved-events', ids],
    enabled: !user && ready && ids.length > 0,
    queryFn: async ({ signal }) => {
      const batches: string[][] = [];
      for (const id of ids) {
        const batch = batches.at(-1);
        if (
          !batch ||
          batch.length === 30 ||
          batch.join(',').length + id.length + 1 > 6000
        )
          batches.push([id]);
        else batch.push(id);
      }
      const events: Event[] = [];
      for (const batch of batches) {
        const result = await apiPage(
          `/events?ids=${encodeURIComponent(batch.join(','))}&period=all&limit=30`,
          eventSchema,
          { signal }
        );
        events.push(...result.data);
      }
      return events;
    },
  });
  const guestEvents = sortEvents(
    filterEvents(
      filterSavedEvents(guestConcerts.data || [], saves, status || undefined),
      { period: archive ? 'past' : 'all' },
      today
    ),
    archive ? 'date_desc' : 'date_asc'
  );
  const inbox = useApiData(
    '/notifications',
    notificationsSchema,
    user?.id || 'signed-out',
    !!user
  );
  const markRead = useMutation({
    mutationFn: () =>
      apiData('/notifications', notificationsSchema, {
        method: 'PATCH',
        body: '{}',
      }),
    onSuccess: (items) =>
      client.setQueryData(['data', user?.id, '/notifications'], items),
  });
  const total = user ? concerts.data?.meta.total || 0 : guestEvents.length;
  const hasNext = user
    ? concerts.data?.meta.has_next || false
    : page * 12 < guestEvents.length;
  const error = user ? concerts.error : guestConcerts.error;
  const loading =
    !ready ||
    (user ? concerts.isPending : ids.length > 0 && guestConcerts.isPending);
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow={user ? 'SAVED TO YOUR ACCOUNT' : 'SAVED IN THIS BROWSER'}
        title={archive ? 'Your gig archive.' : 'Your saved gigs.'}
      >
        <p>
          {archive ? (
            user ? (
              'Past saved gigs and your private concert imports. Set what happened; original workbook fields stay unchanged.'
            ) : (
              'Past gigs you saved in this browser, whether you went or just considered it.'
            )
          ) : user ? (
            'Your saved gigs and the bands and venues you follow.'
          ) : (
            <>
              These saves stay in this browser.{' '}
              <Link className="show-link" href="/account">
                Sign in
              </Link>{' '}
              for private concert imports, synced follows, and notifications.
            </>
          )}
        </p>
      </PageIntro>
      <div className="saved-controls">
        <fieldset className="saved-views">
          <legend className="sr-only">Concert list</legend>
          <button
            type="button"
            className={`button ${archive ? 'button-outline' : ''}`}
            aria-pressed={!archive}
            disabled={!ready}
            onClick={() => {
              setArchive(false);
              setPage(1);
            }}
          >
            Saved
          </button>
          <button
            type="button"
            className={`button ${archive ? '' : 'button-outline'}`}
            aria-pressed={archive}
            disabled={!ready}
            onClick={() => {
              setArchive(true);
              setPage(1);
            }}
          >
            Archive
          </button>
        </fieldset>
        <div className="saved-status-filter">
          <label htmlFor={statusFilterId}>Filter by status</label>
          <select
            id={statusFilterId}
            ref={statusFilter}
            value={status}
            disabled={!ready}
            onChange={(event) => {
              setStatus(
                z
                  .union([savedConcertStatusSchema, z.literal('')])
                  .parse(event.currentTarget.value)
              );
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(SAVED_CONCERT_STATUS_LABELS).map(
              ([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>
      <div className="saved-layout">
        <section aria-label={archive ? 'Concert archive' : 'Saved concerts'}>
          <div className="section-heading">
            <div>
              <h2>{archive ? 'Past shows.' : 'Your shows.'}</h2>
              <p className="result-count" role="status">
                {total} {archive ? 'past' : 'saved'}{' '}
                {total === 1 ? 'concert' : 'concerts'}
              </p>
            </div>
            <Link className="show-link" href="/">
              Find another show <Icon name="arrow" />
            </Link>
          </div>
          <ErrorState
            error={error}
            retry={() =>
              void (user ? concerts.refetch() : guestConcerts.refetch())
            }
          />
          {!error && (
            <EventList
              events={
                user
                  ? concerts.data?.data || []
                  : guestEvents.slice((page - 1) * 12, page * 12)
              }
              loading={loading}
              savedView
              onStatusSaved={(next) => {
                if (status && next !== status) {
                  setPage(1);
                  statusFilter.current?.focus();
                }
              }}
              emptyMessage={
                status
                  ? 'No concerts match this status. Choose another status or show them all.'
                  : archive
                    ? 'Past saved gigs and private imports appear here once their dates have passed.'
                    : 'Tap the bookmark on a concert to keep it here. Some older listings may no longer be available.'
              }
            />
          )}
          <Pager
            page={page}
            total={total}
            hasNext={hasNext}
            onChange={setPage}
          />
        </section>
        <aside>
          <section className="panel">
            <h2>Following.</h2>
            {following.length ? (
              <div className="following-list">
                {following.map((item) => (
                  <div
                    key={`${item.type}:${item.id}`}
                    className="following-item"
                  >
                    <span>
                      <strong>
                        {item.type === 'artist' ? 'Artist' : 'Venue'}
                      </strong>
                      <br />
                      {item.id.replaceAll('|', ' / ')}
                    </span>
                    <button
                      aria-label={`Unfollow ${item.id}`}
                      disabled={pending}
                      onClick={() => void toggleSaved(item.type, item.id)}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                Follow an{' '}
                <Link className="show-link" href="/artists">
                  artist
                </Link>{' '}
                or{' '}
                <Link className="show-link" href="/venues">
                  venue
                </Link>{' '}
                to add it here.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Your inbox.</h2>
            {!user ? (
              <p>
                Sign in for followed-artist and venue notifications. Guest
                follows remain local to this browser.
              </p>
            ) : (
              <>
                <ErrorState error={inbox.error || markRead.error} />
                {inbox.data?.length ? (
                  <>
                    <button
                      className="text-button"
                      onClick={() => markRead.mutate()}
                      disabled={markRead.isPending}
                    >
                      Mark all as read
                    </button>
                    <ul className="inbox-list">
                      {inbox.data.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/events/${encodeURIComponent(item.event_id)}`}
                          >
                            {!item.read_at && <span className="status-dot" />}{' '}
                            {item.title}
                          </Link>
                          <small>{formatDate(item.created_at)}</small>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>
                    No new shows yet. Follow an artist or venue to get started.
                  </p>
                )}
                <Link className="show-link" href="/account">
                  Notification settings <Icon name="arrow" />
                </Link>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
