'use client';

import type { Event } from '@/types';
import EventCard from './EventCard';
import { EmptyState, LoadingGrid } from './Ui';

export default function EventList({
  events,
  loading = false,
  emptyMessage = 'Try a different city, artist, or genre. New shows appear after the collector runs.',
}: {
  events: Event[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  if (loading) return <LoadingGrid />;
  if (!events.length)
    return (
      <EmptyState title="No shows on this list.">
        <p>{emptyMessage}</p>
      </EmptyState>
    );
  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
