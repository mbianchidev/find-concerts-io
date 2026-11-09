'use client';

import { GENRES } from '@/lib/concerts';

export default function GenreFilters({
  value,
  onChange,
}: {
  value?: string;
  onChange: (genre?: string) => void;
}) {
  return (
    <div className="genre-filters" role="group" aria-label="Filter by genre">
      <span>FIND YOUR FREQUENCY</span>
      {[undefined, ...GENRES].map((genre) => (
        <button
          key={genre || 'all'}
          className="genre-chip"
          aria-pressed={value === genre || (!value && !genre)}
          onClick={() => onChange(genre)}
        >
          {genre || 'All sounds'}
        </button>
      ))}
    </div>
  );
}
