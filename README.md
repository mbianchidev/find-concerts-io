# Find Concerts IO

Find metal, hardcore, rock, and punk gigs. Filter by place, dates, and venue, sort by date or band, open venue maps, and keep your saved shows and concert archive. Dark mode is on by default.

Next.js, React, TypeScript, TanStack Query, and SQLite. This is a **full-stack Node app**, not a static GitHub Pages export.

## Run locally

Use the Node version in `.nvmrc` (Node 22.13+ is required for SQLite).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Both `npm run dev` and `npm start` automatically start the background worker, with six-hour collection by default. Stop the server to stop both processes. For one collection run, use `npm run scrape`.

Private data lives in `.data/`, which is ignored by Git and Docker builds. Keep it outside disposable checkouts or export it before removing a worktree. Public registration never grants administrator access.

## Docs

- [Development, tests, and hosted deployment](docs/development.md)
- [Architecture and data boundaries](docs/architecture.md)
- [Saved shows, attendance statuses, and archive](docs/saved-concerts.md)
- [Private workbook imports](docs/imports.md)
- [API and optional integrations](docs/api.md)
- [Privacy defaults](docs/privacy.md)

Licensed under [Apache-2.0](LICENSE).
