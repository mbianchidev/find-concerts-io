# Development and deployment

## Local setup

Use `.nvmrc` with `nvm install && nvm use`, then `npm ci`.
Supported runtimes are Node 22.13+ within Node 22, and Node 24+. Node 20 is no longer supported because the server uses native SQLite.
Copy `.env.example` to `.env.local`; never commit provider credentials or private data.
`APP_ORIGIN` must exactly match the browser origin, including its port.
HTTP is accepted only for localhost; public deployments require HTTPS.

Run `npm run dev`, then open `http://localhost:3000`. The development and
production startup commands both launch the web server and its background worker.
No second terminal or separate worker command is needed. Browsing and guest saves
do not require an account. Create an account to sync saves, use private imports,
or receive followed-artist and venue notifications.

```bash
# One-off collection, serialized with worker collection jobs.
npm run scrape

# Explicitly ignore the app's 15-minute source cooldown, not robots.txt.
npm run scrape -- --force

# Collect only configured sources for these cities.
npm run scrape -- --city Berlin --city Amsterdam --city Haarlem --city Utrecht

# Grant an existing account administrator access from the server console.
npm run account:admin -- --username existing-account
```

With `SCRAPE_INTERVAL_MINUTES=360`, collection becomes due when any configured
source is uncollected or six hours old. Refreshing one city does not postpone
other sources. City options are repeatable and case-insensitive; unsupported
cities fail explicitly. If a collector job with different options is already
queued, the CLI reports the conflict instead of silently ignoring its requested scope.
Managed server startup defaults to 360 minutes when the variable is omitted.
Set `SCRAPE_INTERVAL_MINUTES=` explicitly for queue-only operation without website
requests. The standalone `npm run worker` command remains available for a
deliberately separate worker deployment; do not run it alongside the managed
server. Administrators can queue collection
at `/sources` when the worker is online. No public registration can claim admin.
The CLI, web app, and worker must use the **same `DATABASE_PATH`**.

Server options still pass through, for example
`npm start -- --hostname 127.0.0.1 --port 3000`. Both child processes receive the
same loaded environment and database path. Ctrl+C or SIGTERM stops both. If either
process fails, the other is stopped and startup exits with a failure code instead
of leaving a web server running without its collector. Shutdown allows 30 seconds
for current work before forcefully stopping remaining processes; unfinished jobs
are recovered through their existing queue leases after restart.

Collection covers The Underworld and The Black Heart in London, metal.de's
public concert calendar for Berlin, and Metal Agenda for Amsterdam, Haarlem,
and Utrecht. Dutch city calendars also list surrounding towns; those are excluded
unless their exact city matches. Additional verified venue profiles retain rooms
with no currently listed gigs. Coverage is not a guarantee of every venue or show.

The collector checks robots.txt once per origin per run, honors crawl delay,
and waits at least 1.5 seconds between requests, including redirects. A 403 or
429 stops further requests to that origin. Official venue adapters read at most
40 detail pages; Berlin uses the published concert-search form and its current
genre taxonomy for a bounded one-year range. No forbidden calendar-export feeds,
browser challenges, logins, proxies, or private APIs are used.

Calendar categories are not independently verified artist subgenres. Dates without
published start times remain all-day records; unknown coordinates remain unknown.
Source errors and changed layouts are explicit. Failures do not erase existing
records, and known cancellations/postponements refresh previously collected gigs.

Collection also enriches missing tour/band photos, with official venue imagery
as a fallback. Only origins in `src/lib/image-sources.json` are eligible for
photo-page requests; supported image hosts in that same file configure Next Image.
Add a host only after checking its public markup and robots policy. Requests
retain the same delays, redirect restrictions, and origin-level access stops as
concert collection. Up to 80 additional photo pages are read per run; cached
lookups let subsequent runs progress without repeatedly downloading known photos.
New imagery appears after the next collection, or an explicitly queued refresh.

Image optimization allows up to three redirects so existing Squarespace URLs
can reach their CDN. Private IPs stay blocked at every hop. This fixes rendering
without re-scraping or rewriting saved concert records.

Cheerio's `encoding-sniffer` dependency is overridden to the compatible 1.x API,
which uses `@exodus/bytes` instead of deprecated `whatwg-encoding`. UTF-8,
Windows-1252, and stream-decoding regressions cover the override. Revisit it when
Cheerio adopts the updated dependency itself.

Schema version 3 adds a public venue catalogue and backfills only public events.
It preserves accounts, sessions, follows, and private imports. Stop both services
before restoring a protected pre-upgrade backup with a compatible app version.
Do not reset the database or edit its schema-version marker to force a downgrade.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm audit --audit-level=low
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
```

Unit and API integration tests use synthetic fixtures and mocked providers.
Browser tests start separate production servers on **localhost:3100** for
Chromium and **localhost:3101** for Safari/WebKit authentication/profile checks.
They use reserved `.data/e2e.sqlite` and `.data/e2e-webkit.sqlite` databases so
browser sessions and rate limits cannot interfere. `npm run test:seed` and its
validated `--browser chromium|webkit` selector reset only those test databases,
never the normal `.data/concerts.sqlite` file. Do not put real records in them.
These servers still start their workers automatically, but explicitly disable
scheduled website collection so tests never fetch or import real concert data.
Synthetic process tests also cover startup, shared configuration, peer failures,
and bounded shutdown.

Authentication coverage checks immediate username/logout changes without a hard
reload, real cookie persistence, blocked-cookie failures, profile edits,
password changes, old-password rejection, session revocation, and mobile layouts.

The browser suite includes keyboard checks, an axe WCAG audit, and 60 local API
requests with concurrency 5 and a required p95 below 1,000 ms. `npm run test:load`
can also target an already running local synthetic-data server through
`LOAD_TEST_URL`. Remote load targets are rejected. Native load testing replaces
Artillery because the available Artillery dependency tree introduced known
advisories; this avoids shipping a vulnerable test dependency.

Husky runs lint, typecheck, and unit/integration tests before commits.
Prettier formats source and docs. `HUSKY=0` is used only for automated installs;
it is not needed for ordinary development.

## Hosted production

```bash
npm run build
npm run start
```

Or build and run the supplied containers using your configured container runtime:

```bash
docker compose --env-file .env.local build --no-cache
docker compose --env-file .env.local up -d --remove-orphans
docker compose logs -f app
```

The single app container supervises the web server and worker, sharing the
existing named `concert-data` volume. `--remove-orphans` removes the old separate
worker container when upgrading, without deleting that data volume. Container
health requires both HTTP readiness and a current worker heartbeat. Compose
restarts the managed pair together and allows 35 seconds for container shutdown.
The HTTP port is bound
to loopback by default. Put a TLS reverse proxy in front, set `APP_ORIGIN` to
the public HTTPS origin, and set `TRUST_PROXY=true` only when that proxy controls
the forwarded header chain. Both processes run as an unprivileged user.

Use a persistent local filesystem for SQLite, not NFS or ephemeral serverless
storage. This deployment targets **one host**, with one app and worker sharing
SQLite WAL. It is not a horizontally scaled multi-region architecture.
Back up SQLite with its online-backup facilities or stop both services before
copying the database; copying a live database without its WAL is unsafe.
Protect backups, encrypt the volume where required, and define retention.
Do not run `docker compose down --volumes` unless you intend to delete the data.

The production image excludes local environment files, workbooks, and databases.
No hosting provider or registry is assumed. The legacy Pages deployment was
replaced by CI; this repository no longer produces a static `out/` deployment.

## CI

The workflow retains `.github/workflows/deploy.yml` so it can be manually
dispatched on the feature branch before migration merges. Its name is now `CI`;
it never deploys to Pages. It validates installs, dependency advisories, lint,
types, unit/API tests, formatting, production build, browser/accessibility/load
flows, and a production container's web and worker startup.

Public-repository draft PRs skip the expensive job. A ready PR, main push,
or manual dispatch runs full validation. For a draft, manually select its
actual branch and verify the resulting run's head SHA, rather than rerunning
an older main revision. Obsolete CI runs cancel; no production deployment is
canceled because deployment is no longer part of this workflow.

## Visual assets

Fonts are self-hosted from the Fontsource packages (DM Sans and Barlow Condensed).
The generic concert crowd photo is from
[Unsplash](https://images.unsplash.com/photo-1506157786151-b8491531f063).
It is a decorative stock image, not a photograph of any listed artist or show.
Venue posters remain attributed through the original event listing.
