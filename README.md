# Find Concerts IO

Find metal, hardcore, rock, and punk shows from original venue listings. Save concerts, follow artists and venues, get recommendations, export calendars, and manage your private concert history and profile.

Next.js, React, TypeScript, TanStack Query, and SQLite. This is a **full-stack Node app**, not a static GitHub Pages export.

## Run locally

Use the Node version in `.nvmrc` (Node 22.13+ is required for SQLite).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). In another terminal, run `npm run worker` for collection and notifications. For one collection run, use `npm run scrape`.

Private data lives in `.data/`, which is ignored by Git and Docker builds. Keep it outside disposable checkouts or export it before removing a worktree. Public registration never grants administrator access.

## Docs

- [Development, tests, and hosted deployment](docs/development.md)
- [Architecture and data boundaries](docs/architecture.md)
- [Private workbook imports](docs/imports.md)
- [API and optional integrations](docs/api.md)
- [Privacy defaults](docs/privacy.md)

Licensed under [Apache-2.0](LICENSE).
