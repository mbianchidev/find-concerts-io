'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { z } from 'zod';
import type { SearchFilters } from '@/types';
import { useApiPage } from '@/lib/api';
import SearchBar from './SearchBar';
import GenreFilters from './GenreFilters';
import { ErrorState, LoadingGrid, PageIntro, Pager } from './Ui';

interface DirectoryPageProps<T> {
  endpoint: string;
  schema: z.ZodType<T>;
  title: string;
  eyebrow: string;
  description: string;
  render: (items: T[]) => React.ReactNode;
}

function DirectoryContent<T>({
  endpoint,
  schema,
  title,
  eyebrow,
  description,
  render,
}: DirectoryPageProps<T>) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: SearchFilters = {
    city: search.get('city') || undefined,
    location: search.get('location') || undefined,
    artist: search.get('artist') || undefined,
    date: search.get('date') || undefined,
    genre: search.get('genre') || undefined,
  };
  const page = search.get('page') || '1';
  const params = new URLSearchParams({ page, limit: '12' });
  Object.entries(filters).forEach(([name, value]) => {
    if (typeof value === 'string' && value) params.set(name, value);
  });
  const results = useApiPage(`${endpoint}?${params}`, schema);
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(search);
    next.delete('page');
    Object.entries(values).forEach(([name, value]) => {
      if (value) next.set(name, value);
      else next.delete(name);
    });
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, {
      scroll: false,
    });
  };
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro eyebrow={eyebrow} title={title}>
        <p>{description}</p>
      </PageIntro>
      <SearchBar
        key={[
          filters.artist,
          filters.city,
          filters.location,
          filters.date,
        ].join('|')}
        initial={filters}
        onSearch={(next) => {
          update({
            city: next.city,
            location: next.location,
            artist: next.artist,
            date: next.date,
            genre: Object.keys(next).length ? filters.genre : undefined,
          });
        }}
      />
      <GenreFilters
        value={filters.genre}
        onChange={(genre) => update({ genre })}
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
                page={results.data.meta.page}
                total={results.data.meta.total}
                hasNext={results.data.meta.has_next}
                onChange={(value) => update({ page: String(value) })}
              />
            </>
          )
        )}
      </section>
    </main>
  );
}

export default function DirectoryPage<T>(props: DirectoryPageProps<T>) {
  return (
    <Suspense
      fallback={
        <main className="container" id="main">
          <LoadingGrid />
        </main>
      }
    >
      <DirectoryContent {...props} />
    </Suspense>
  );
}
