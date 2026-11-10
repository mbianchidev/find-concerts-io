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

Schema v4 adds a checked personal attendance status to saved rows, preserving
bookmark timestamps and defaulting existing concert saves to Interested. It does
not rewrite public concert status or original workbook fields. The archive unions
saved shows with owned private imports, deduplicates identities, and applies past
dates and personal-status filters before pagination. Guest lists fetch public
metadata in bounded ID batches before the same filtering and sorting. Attendance
is never inferred from a date. Late save responses are ignored after an account
switch rather than repopulating a different account's cache.

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
One Where field offers city suggestions and broader venue/country text, rather
than independent city and location controls. The `city` facet is a complete,
case-insensitive, NFKC-normalized match,
not a venue-name substring or a surrounding-area search. Discovery and directory
URLs preserve it across reloads, pagination resets on filter changes, and Clear
removes it. Private city options are available only to the signed-in owner.
Upcoming includes today. Today/past shortcuts and inclusive date ranges combine;
multi-day concerts match overlapping ranges. The browser supplies its local
reference day, with UTC as the API-only default. Concerts sort by chronological
date or headliner name before pagination, with unknown dates last. Venue dropdowns
count the entire filtered result set, excluding their own selection and empty
venues; this does not remove empty rooms from the followable venue catalogue.
Recommendations use actual saved genres, followed artists, and followed venues,
and exclude saved, canceled, postponed,
or past events. Similar shows use the selected concert as their seed.
Trending ranks actual account saves in the chosen area; absent popularity does
not become an invented count. Tours group multiple collected dates by artist
without claiming an official tour name.

Dark mode is the default regardless of system appearance. Semantic CSS tokens
cover discovery, directories, details, imports, and account settings in both
themes. A small head script applies an explicitly saved light preference before
paint. The accessible header toggle persists locally, synchronizes open tabs,
updates browser chrome, and reports blocked storage without breaking the toggle.
The root body tolerates attributes added by browser extensions before hydration.
This exception is limited to the body element; descendant hydration mismatches
remain visible.

Calendar exports escape and fold iCalendar text, preserve time offsets, use
exclusive all-day end dates, and reject unconfirmed dates. Private attendance
plans and workbook notes are not included in calendar links.

Concert details include a load-on-demand OpenStreetMap venue map with a marker,
native pan/zoom controls, and attribution. Listing coordinates are used first.
Missing public locations use a server-side Nominatim lookup only after a click,
with an application-wide one-request-per-second limit shared through SQLite.
Name, city, country, and place category must match; ambiguous results never become
pins. Positive and negative results use the existing persistent cache. The map
keeps private imports out of both geocoding and embedded maps.

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

Photo collection reads event/tour JSON-LD, performer images, lazy/responsive
posters, and Open Graph/Twitter metadata. Missing calendar artwork is enriched
from explicitly curated event/tour pages, then reused headliner photos, then an
official venue photo. Venue fallback imagery is not reused as artist imagery.
`src/lib/image-sources.json` is shared by extraction and Next Image, so an accepted
host is also renderable. Photo-page origins are separately curated. Image
optimization follows at most three redirects so legacy Squarespace URLs reach
their CDN. Private IPs remain blocked at every hop, with DNS results pinned to
prevent rebinding. Next applies the host allowlist to the initial URL, not redirect
destinations. Private imports never trigger photo-page collection.
Photo-page requests share the collection's robots policies, delays, and
blocked-origin state.
The run adds at most 80 photo content-page lookups, deduplicates URLs, and caches
successful images for seven days or empty metadata for one day. Lookup failures
are surfaced as collection warnings without erasing concerts or existing photos;
later event artwork can replace a venue fallback.

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
