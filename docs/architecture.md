# Architecture

The app uses Next.js App Router pages and versioned Node route handlers.
TanStack Query manages browser server state; one shared provider keeps session,
saved-item, and follow state consistent across pages. Guest saves use browser
storage and are not silently copied into an account.

## Server and storage

`src/server/store.ts` reuses one `node:sqlite` connection per process. SQLite
uses WAL, a busy timeout, foreign keys, prepared statements, transactions, and
indexes for owner/date lookups, source dates, saves, notifications, and jobs.
It avoids a second Express server, database pool, or mandatory Redis/Valkey
service for this single-host workload. The queue and public-response cache are
persistent database tables rather than process-local promises or timers.

This is a deliberate change from the original mock/static app and speculative
PostgreSQL/NextAuth architecture. Local username/password authentication uses
salted scrypt hashes and opaque, revocable sessions. Only session-token hashes
are stored. Cookies are HttpOnly, SameSite=Lax, Secure on HTTPS, and expire after
30 days. Mutations require the configured same origin; cross-origin credential
access is not enabled. Authentication, general API, import, provider, email,
and collector limits are enforced server-side.

Authentication transitions preserve the active session-query observer instead
of clearing it with the rest of the cache. Sign-in confirms the issued cookie
against the server before publishing authenticated state. User-scoped caches
are removed on account switches/logout without losing the session subscription.
Private profile fields and password changes live under account settings.
The profile migration adds columns transactionally without resetting accounts,
credentials, sessions, or concert data.

The public venue table is independent of upcoming event availability. Schema v3
backfills public venue identities without reading private imports into this table.
Directories merge persistent venue metadata with filtered upcoming counts, so an
empty room can still be followed and receive notifications when a new gig arrives.
Verified publisher aliases share one identity; arbitrary similar names are not
automatically merged.

Public concert rows have no owner. Imported rows have an account owner and a
separate ID namespace. Public listings, public artist/venue directories,
trending, sitemaps, and structured data never include imports. Every private
read checks ownership, including detail and calendar routes. Private HTML is
dynamic; a client access boundary also hides stale private content after logout.
Account deletion cascades to its records, saves, sessions, subscriptions,
imports, and notifications. The app does not encrypt the database at rest.

## Discovery

Filtering searches concert titles, support acts, venues, cities, countries,
local calendar dates, and genres. Upcoming-day comparisons normalize explicit
timestamp offsets to UTC, while date filters retain the venue-local calendar date.
The dedicated `city` facet is a complete, case-insensitive, NFKC-normalized match,
not a venue-name substring or a surrounding-area search. Discovery and directory
URLs preserve it across reloads, pagination resets on filter changes, and Clear
removes it. Private city options are available only to the signed-in owner.
Recommendations use actual saved genres, followed artists, and followed venues,
and exclude saved, canceled, postponed,
or past events. Similar shows use the selected concert as their seed.
Trending ranks actual account saves in the chosen area; absent popularity does
not become an invented count. Tours group multiple collected dates by artist
without claiming an official tour name.

Calendar exports escape and fold iCalendar text, preserve time offsets, use
exclusive all-day end dates, and reject unconfirmed dates. Private attendance
plans and workbook notes are not included in calendar links.

## Collection and jobs

`scripts/server.ts` starts Next and the worker together for both `npm run dev`
and `npm start`. They remain separate OS processes with the same loaded
environment and SQLite path, so background collection does not run on the HTTP
server's event loop. Missing collection configuration defaults to six hours;
an explicitly empty interval disables scheduled website requests while retaining
queue processing.

The launcher forwards shutdown to both processes, stops the peer when either
fails, and returns a failure exit code. Unix process groups include Next's own
development-server children in cleanup. A 30-second shutdown deadline prevents
orphaned or indefinitely hanging workers. Docker uses the same launcher directly;
Compose no longer starts a duplicate worker service.

Venue adapters parse only the current event content, explicit dates, and
genre words found in the venue description. Known access restrictions and
layout changes are surfaced. Public metadata links back to the original page;
the app does not republish long artist biographies. Private data is never
sent to sources or used as a hidden provider search.

Specialist calendar adapters scope Berlin, Amsterdam, Haarlem, and Utrecht
explicitly. Berlin queries the same public search endpoint as metal.de's form,
using verified current genre IDs and a one-year date range. Metal Agenda supplies
dated listings and venue profiles; nearby towns are not imported as the target city.
Calendar-derived category labels are marked separately from description-derived
genres. Missing times stay all-day, not guessed evening timestamps. A tour URL,
date, and venue determine event identity, preserving separate dates for one tour.
Unknown coordinates, reversible publisher encoding errors, and verified venue-link
aliases do not discard otherwise valid concert records.

Robots policies, delays, and access-limit state are shared per origin for the
entire run. Redirect destinations are checked before requesting them. Blocked
origins and failed robots checks are not retried through another city source.

CLI and scheduled collection use the same persistent queue. Jobs have exclusive,
renewable ten-minute leases, bounded attempts, and completion ownership checks.
Only one scrape job can be pending/running at a time. Notifications are unique
per account and event. Failed notification delivery retries with backoff up to
five attempts; source failures remain explicit until a later collection.
City-scoped CLI jobs retain their requested scope; incompatible already-queued
options produce an explicit conflict. Scheduling checks every configured source,
so a recent manual city refresh cannot starve the rest.
In-app notifications work without external services. SMTP requires confirmed
ownership, push requires permission and a supported endpoint, and push delivery
is tied to the signed-in session. External delivery is at-least-once on failure;
a process crash after a provider accepts a message can cause a retry.

## Performance and monitoring

Route-level bundles and React Query avoid loading import and integration
interfaces on every page. Next Image optimizes supported venue posters.
The server caches only the public catalogue for 30 seconds; changes invalidate
it. API responses use `private, no-store`. The service worker caches public
static assets and a generic offline page, never API or private HTML responses.

Pino records request IDs, resource paths, status codes, and durations, not
request bodies, cookies, passwords, search strings, or imported rows. First-party
operational timing aggregates expire after 14 days. Browser usage counts and
Core Web Vitals require opt-in and honor Do Not Track. Optional Sentry receives
only generic failure messages and random request IDs with automatic collection
disabled. Hosting logs and backups remain the operator's responsibility.
