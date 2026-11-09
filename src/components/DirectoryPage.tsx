'use client';

import { useState } from 'react';
import type { z } from 'zod';
import type { SearchFilters } from '@/types';
import { useApiPage } from '@/lib/api';
import SearchBar from './SearchBar';
import GenreFilters from './GenreFilters';
import { ErrorState, LoadingGrid, PageIntro, Pager } from './Ui';

export default function DirectoryPage<T>({
  endpoint,
  schema,
  title,
  eyebrow,
  description,
  render,
}: {
  endpoint: string;
  schema: z.ZodType<T>;
  title: string;
  eyebrow: string;
  description: string;
  render: (items: T[]) => React.ReactNode;
}) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: '12' });
  Object.entries(filters).forEach(([name, value]) => {
    if (typeof value === 'string' && value) params.set(name, value);
  });
  const results = useApiPage(`${endpoint}?${params}`, schema);
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro eyebrow={eyebrow} title={title}>
        <p>{description}</p>
      </PageIntro>
      <SearchBar
        onSearch={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
      <GenreFilters
        value={filters.genre}
        onChange={(genre) => {
          setFilters({ ...filters, genre });
          setPage(1);
        }}
      />
      <section className="directory-results" aria-label={title}>
        <ErrorState
          error={results.error}
          retry={() => void results.refetch()}
        />
        {results.isPending ? (
          <LoadingGrid />
        ) : (
          results.data && (
            <>
              <p className="result-count" role="status">
                {results.data.meta.total} results
              </p>
              <div className="directory-results">
                {render(results.data.data)}
              </div>
              <Pager
                page={page}
                total={results.data.meta.total}
                hasNext={results.data.meta.has_next}
                onChange={setPage}
              />
            </>
          )
        )}
      </section>
    </main>
  );
}
