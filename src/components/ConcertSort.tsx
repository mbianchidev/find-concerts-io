'use client';

import { useId } from 'react';
import type { SearchFilters } from '@/types';
import { searchFiltersSchema } from '@/lib/schema';

export default function ConcertSort({
  value,
  onChange,
  rankedLabel,
}: {
  value: SearchFilters['sort'];
  onChange: (value: SearchFilters['sort']) => void;
  rankedLabel?: string;
}) {
  const id = useId();
  return (
    <div className="concert-sort">
      <label htmlFor={id}>Sort by</label>
      <select
        id={id}
        value={value || (rankedLabel ? '' : 'date_asc')}
        onChange={(event) =>
          onChange(
            event.target.value
              ? searchFiltersSchema.shape.sort.parse(event.target.value)
              : undefined
          )
        }
      >
        {rankedLabel && <option value="">{rankedLabel}</option>}
        <option value="date_asc">Date: soonest first</option>
        <option value="date_desc">Date: latest first</option>
        <option value="band_asc">Band: A to Z</option>
        <option value="band_desc">Band: Z to A</option>
      </select>
    </div>
  );
}
