'use client';

import { useId } from 'react';
import type { SavedConcertStatus } from '@/types';
import { SAVED_CONCERT_STATUS_LABELS } from '@/lib/concerts';
import { savedConcertStatusSchema } from '@/lib/schema';
import { useApp } from './AppProvider';

interface ConcertStatusSelectProps {
  eventId: string;
  title: string;
  onStatusSaved?: (status: SavedConcertStatus) => void;
}

export default function ConcertStatusSelect({
  eventId,
  title,
  onStatusSaved,
}: ConcertStatusSelectProps) {
  const id = useId();
  const { saves, setSavedStatus, ready, pending } = useApp();
  const saved = saves.find(
    (item) => item.type === 'event' && item.id === eventId
  );
  return (
    <div className="saved-concert-status">
      <label htmlFor={id}>
        Your status<span className="sr-only">{` for ${title}`}</span>
      </label>
      <select
        id={id}
        value={saved?.status ?? ''}
        disabled={!ready || pending}
        onChange={async (event) => {
          const status = savedConcertStatusSchema.parse(
            event.currentTarget.value
          );
          if (await setSavedStatus(eventId, status)) onStatusSaved?.(status);
        }}
      >
        <option value="" disabled>
          Set status
        </option>
        {Object.entries(SAVED_CONCERT_STATUS_LABELS).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
