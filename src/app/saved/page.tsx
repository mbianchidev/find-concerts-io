'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import Icon from '@/components/Icon';
import { ErrorState, PageIntro, Pager } from '@/components/Ui';
import { apiData, useApiData, useApiPage } from '@/lib/api';
import { eventSchema, notificationSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

const notificationsSchema = z.array(notificationSchema);

export default function SavedPage() {
  const { user, saves, toggleSaved, ready, pending } = useApp();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const savedEvents = saves.filter((item) => item.type === 'event');
  const following = saves.filter((item) => item.type !== 'event');
  const ids = savedEvents
    .slice((page - 1) * 12, page * 12)
    .map((item) => item.id);
  const path = user
    ? `/me/saved-events?page=${page}&limit=12`
    : `/events?ids=${encodeURIComponent(ids.join(','))}&past=true&limit=12`;
  const concerts = useApiPage(path, eventSchema, user?.id || 'guest', ready);
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
  const total = user ? concerts.data?.meta.total || 0 : savedEvents.length;
  const hasNext = user
    ? concerts.data?.meta.has_next || false
    : page * 12 < savedEvents.length;
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow={user ? 'SAVED TO YOUR ACCOUNT' : 'SAVED IN THIS BROWSER'}
        title="Your saved gigs."
      >
        <p>
          {user ? (
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
      <div className="saved-layout">
        <section aria-label="Saved concerts">
          <div className="section-heading">
            <div>
              <h2>Your shows.</h2>
              <p className="result-count" role="status">
                {total} saved concerts
              </p>
            </div>
            <Link className="show-link" href="/">
              Find another show <Icon name="arrow" />
            </Link>
          </div>
          <ErrorState
            error={concerts.error}
            retry={() => void concerts.refetch()}
          />
          <EventList
            events={concerts.data?.data || []}
            loading={!ready || concerts.isPending}
            emptyMessage="Tap the bookmark on a concert to keep it here. Some older listings may no longer be available."
          />
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
