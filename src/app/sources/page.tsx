'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useApp } from '@/components/AppProvider';
import { ErrorState, PageIntro } from '@/components/Ui';
import { apiData, useApiData } from '@/lib/api';
import { sourceStatusSchema } from '@/lib/schema';

const sourcesSchema = z.array(sourceStatusSchema);
const jobsSchema = z.object({
  worker_online: z.boolean(),
  jobs: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      status: z.string(),
      attempts: z.number(),
      error: z.string().nullable(),
      created_at: z.string(),
      completed_at: z.string().nullable(),
    })
  ),
});

export default function SourcesPage() {
  const { user } = useApp();
  const client = useQueryClient();
  const sources = useApiData('/sources', sourcesSchema);
  const jobs = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: ({ signal }) => apiData('/jobs', jobsSchema, { signal }),
    enabled: user?.role === 'admin',
    refetchInterval: 10000,
  });
  const queue = useMutation({
    mutationFn: () =>
      apiData(
        '/jobs',
        z.object({ id: z.string(), status: z.string(), message: z.string() }),
        { method: 'POST', body: JSON.stringify({ type: 'scrape' }) }
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro eyebrow="SOURCES" title="Where we get the gigs.">
        <p>
          Venue calendars in London, metal.de for Berlin, and Metal Agenda for
          Amsterdam, Haarlem, and Utrecht. We don&apos;t have every gig. Check
          the venue&apos;s listing before you book.
        </p>
      </PageIntro>
      <div className="account-grid">
        <section className="panel">
          <h2>Collection status.</h2>
          <ErrorState
            error={sources.error}
            retry={() => void sources.refetch()}
          />
          {sources.data?.map((source) => (
            <div className="source-card" key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name}
              </a>
              <p>
                {source.event_count} upcoming matching shows.{' '}
                {source.last_run
                  ? `Last collection: ${new Date(source.last_run).toLocaleString('en-GB')}.`
                  : 'Not collected yet.'}
              </p>
              {source.error && (
                <p className="source-error" role="status">
                  {source.error}
                </p>
              )}
            </div>
          ))}
          <button
            className="button button-outline"
            onClick={() => void sources.refetch()}
          >
            Refresh status
          </button>
        </section>
        <aside className="panel">
          <h2>How collection works.</h2>
          <p>
            Every run checks robots.txt, stays on curated HTTPS origins, waits
            at least 1.5 seconds between requests on the same origin, and reads
            at most 40 detail pages per official venue. Berlin searches cover
            the next year through the calendar&apos;s public search form.
          </p>
          <p className="muted-note">
            Blocked pages, missing dates, and changed layouts are reported.
            Access restrictions are not bypassed. Unknown dates and genres are
            never invented, and existing records are retained on failure.
            Calendar categories are identified separately from artist subgenres.
            Dates without a published start time stay all-day listings.
          </p>
          <p className="muted-note">
            Private workbook data is never sent to these websites. The app
            stores factual event metadata and links back to the original
            listings, not copied artist biographies.
          </p>
        </aside>
      </div>
      {user?.role === 'admin' && (
        <section className="panel" style={{ marginTop: 30 }}>
          <h2>Collector administration.</h2>
          <p>
            Background worker:{' '}
            {jobs.data?.worker_online ? 'online' : 'offline or not yet started'}
            . Run <code>npm run worker</code> on the server to process queued
            jobs.
          </p>
          <button
            className="button"
            disabled={queue.isPending || !jobs.data?.worker_online}
            onClick={() => queue.mutate()}
          >
            Queue venue collection
          </button>
          {queue.data && (
            <p className="success-panel" role="status">
              {queue.data.message}
            </p>
          )}
          <ErrorState error={jobs.error || queue.error} />
          {jobs.data && (
            <div className="table-wrap" tabIndex={0}>
              <table>
                <caption className="sr-only">
                  Recent collector and notification jobs
                </caption>
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.data.jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.kind}</td>
                      <td>{job.status}</td>
                      <td>{job.attempts}</td>
                      <td>{job.error || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
