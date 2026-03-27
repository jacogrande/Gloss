# Manual QA

This document describes how to run and validate the current Sprint 3 MVP locally.

## Scope

Sprint 3 covers:

- Bun workspace setup
- native local PostgreSQL bootstrap
- Hono API
- Better Auth email/password sessions
- React SPA login and authenticated shell
- manual seed capture
- personal library browsing
- seed detail pages
- constrained seed enrichment
- smoke and eval scripts for the capture and enrichment flow

This is a local-development guide. Railway deploys are covered in [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md).

## Prerequisites

Install these first:

- Bun `1.1.42+`
- Node `20.19+` or `22.12+`
- PostgreSQL binaries available on `PATH`

Required PostgreSQL binaries:

- `initdb`
- `pg_ctl`
- `psql`
- `createdb`

If PostgreSQL binaries are installed but not on `PATH`, set `POSTGRES_BIN_DIR` to their directory.

## Local Setup

From the repo root:

```bash
bun install
cp .env.example .env
bun run db:reset
```

What `bun run db:reset` does:

- starts the repo-local PostgreSQL cluster under `.local/postgres`
- creates the `gloss` database if needed
- applies migrations from `db/migrations`
- seeds the demo account

Seeded demo credentials:

- email: `demo@gloss.local`
- password: `password1234`

## Running The App

Start both services:

```bash
bun run dev
```

Local URLs:

- `bun run dev` prints the chosen `webOrigin` and `apiOrigin`
- if `5173` or `8787` is already occupied, the runner picks the next free local port
- use the printed origins for browser and curl checks
- default targets remain:
  - web: `http://127.0.0.1:5173`
  - api: `http://127.0.0.1:8787`
  - health: `http://127.0.0.1:8787/health`

If you only want one service:

```bash
bun run dev:web
bun run dev:api
```

To stop the local PostgreSQL cluster when finished:

```bash
bun run db:stop
```

## Fast Validation

Run the full Sprint 3 validation set:

```bash
bun run lint
bun run typecheck
bun run test
bun run eval
bun run smoke
```

Expected result:

- all commands exit `0`
- `bun run eval` prints JSON summaries for journey and boundary checks
- `bun run smoke` passes in Playwright against the split local web and API servers
- `bun run eval` prints separate summaries for capture journeys, enrichment journeys, HTTP boundaries, and enrichment traces

Useful narrower checks:

```bash
bun run test:integration
bun run test:web
bun run build
```

## Provider Keys

You do not need external provider keys for the normal local Sprint 3 harness.

These commands run in deterministic fixture mode by default:

- `bun run test`
- `bun run eval`
- `bun run smoke`
- `bun run dev`

Dedicated live browser validation entrypoints:

- `bun run smoke:live`
- `bun run test:e2e:live`

You only need provider credentials when you want to verify the live enrichment path against real vendors.

Required env vars for live enrichment verification:

- `ENRICHMENT_PROVIDER_MODE=live`
- `OPENAI_API_KEY`
- `MERRIAM_WEBSTER_DICTIONARY_API_KEY`
- `MERRIAM_WEBSTER_THESAURUS_API_KEY`

Optional but recommended:

- `OPENAI_MODEL`

Example:

```bash
ENRICHMENT_PROVIDER_MODE=live \
OPENAI_API_KEY=... \
MERRIAM_WEBSTER_DICTIONARY_API_KEY=... \
MERRIAM_WEBSTER_THESAURUS_API_KEY=... \
bun run smoke:live
```

Use that mode for targeted provider validation, not for everyday smoke or regression checks.

## Sprint 3 Test Matrix

Use each layer for a different kind of confidence.

### `bun run test:unit`

What it is for:

- fast validation of pure shared and web logic
- normalization, filtering, formatting, and contract helper behavior
- safe refactors that should not depend on the DB or browser boundary

Run this when:

- changing pure transforms
- changing shared schemas or helpers
- refactoring library filtering or display helpers

### `bun run test:integration`

What it is for:

- validating the Hono API, DB access, Better Auth session flow, and ownership rules
- proving seed create, list, and detail work correctly
- proving cross-user denial still holds

Run this when:

- changing routes
- changing Drizzle schema or DB queries
- changing auth or session behavior
- changing request or response contracts

### `bun run test:web`

What it is for:

- validating route-level React behavior without a full browser run
- catching client-side loading, redirect, and error-handling regressions early

Run this when:

- changing route components
- changing the API client
- changing protected-shell behavior

### `bun run smoke`

What it is for:

- validating the real browser against split local web and API origins
- proving cookie auth, CORS, routing, capture, library, and seed detail work together

Current Sprint 3 smoke scope:

- sign in
- manual capture
- detail-page enrichment
- library browse
- seed detail readback

Run this when:

- touching auth/session behavior
- touching capture, library, or detail flows
- touching origin, cookie, or deployment-relevant boundary behavior

### `bun run eval`

What it is for:

- validating harness-level product invariants that ordinary tests can miss
- checking current capture journeys and HTTP boundary assumptions

Current Sprint 3 eval scope:

- capture preserves context
- source metadata survives ingestion
- enrichment returns the expected compact payload
- weak evidence causes omission instead of fabrication
- failed enrichment persists a stable failed state
- split-origin CORS headers are exposed on product routes
- request ids, schema versions, and stable error codes survive unhappy paths

Run this when:

- changing route wiring
- changing response shape or error contracts
- changing logging or boundary rules

## Recommended Sprint 3 Validation Order

For most Sprint 3 changes:

1. run `bun run test:unit` or `bun run test:web` while iterating
2. run `bun run test:integration` once the API or DB boundary changes
3. run `bun run smoke` for any user-visible flow change
4. run `bun run eval` when changing boundary assumptions or harness behavior
5. run the full closeout set before merging:
   `bun run lint && bun run typecheck && bun run test && bun run smoke && bun run eval`

## Manual Browser QA

### 1. Boot Smoke Check

1. Run `bun run db:reset`.
2. Run `bun run dev`.
3. Open `http://127.0.0.1:5173`.

Expected result:

- the app redirects unauthenticated users to `/login`

### 2. Sign Up A New User

1. Open `http://127.0.0.1:5173/login`.
2. Switch the form to sign-up mode.
3. Enter:
   - a fresh email like `reader+1@example.com`
   - a name
   - a password of at least 8 characters
4. Submit the form.

Expected result:

- you are redirected to `/library`
- the authenticated shell loads
- the shell shows the signed-in user email
- the library empty state renders

### 3. Word-Only Capture

1. While signed in as the fresh user, open `/capture`.
2. Enter:
   - word: `sesquipedalian`
3. Submit the form.

Expected result:

- the request succeeds
- the app navigates to `/seeds/<id>`
- the detail page shows the word `sesquipedalian`
- the enrichment block appears and settles without breaking the page
- stage renders as `new`

### 4. Sign Out

1. From `/library`, click sign out.

Expected result:

- you return to `/login`
- revisiting `/library` redirects back to `/login`

### 5. Sign In With The Seeded Demo Account

1. Sign in with:
   - email: `demo@gloss.local`
   - password: `password1234`

Expected result:

- login succeeds
- you land on `/library`
- seeded demo entries render in the library
- at least one card shows the word `lapidary`

### 6. Reload Stability

1. While signed in on `/library`, refresh the page.

Expected result:

- session recovery succeeds
- the page remains authenticated
- the `/api/me` data reloads and the page does not bounce to `/login`

### 7. Manual Capture Flow With Context

1. While signed in, open `/capture`.
2. Enter:
   - word: `pellucid`
   - sentence: `Her explanation was pellucid even under pressure.`
   - source kind: `book`
   - source title: `On Style`
   - source author: `A. Reader`
3. Submit the form.

Expected result:

- the request succeeds without a full-page reload
- the app navigates to `/seeds/<id>`
- the detail page shows:
  - word `pellucid`
  - the sentence you entered
  - source title `On Style`
  - source author `A. Reader`
  - stage `new`
  - an enrichment block with a gloss
  - a related word entry showing `lucid`
  - a contrastive word entry showing `opaque`

### 8. Library Flow

1. From the detail page, click back to the library.
2. Confirm the newly created seed appears first.
3. Change the stage filter to `new`.

Expected result:

- the new seed appears in the list
- the library count remains user-scoped
- the seed card shows the source title and sentence preview
- filtering by `new` still includes the new seed

### 9. Seed Detail Reload Stability

1. Open a seed detail page at `/seeds/<id>`.
2. Refresh the browser.

Expected result:

- the detail page reloads in place
- the session remains valid
- the captured source metadata still renders

### 10. User Scope Check

1. Sign out from the demo account.
2. Sign back in as the fresh user created earlier.
3. Open `/library`.

Expected result:

- the fresh user does not see the demo user’s seeds
- the fresh user still sees the earlier word-only seed
- direct navigation to a demo seed detail URL should not reveal demo seed content

## Manual API QA

### Health Endpoint

Run:

```bash
curl http://127.0.0.1:8787/health
```

Expected result:

- HTTP `200`
- JSON response with `ok: true`

### Unauthorized Session Endpoint

Run:

```bash
curl -i http://127.0.0.1:8787/api/me
```

Expected result:

- HTTP `401`
- JSON error response
- error code `AUTH_UNAUTHORIZED`

### Seed Endpoints

Use a cookie jar to sign in and exercise capture, list, and detail:

```bash
curl -i -c /tmp/gloss.cookies \
  -H 'content-type: application/json' \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/api/auth/sign-in/email \
  --data '{"email":"demo@gloss.local","password":"password1234"}'

curl -i -b /tmp/gloss.cookies \
  -H 'content-type: application/json' \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/capture/seeds \
  --data '{"word":"pellucid","sentence":"Her explanation was pellucid even under pressure.","source":{"kind":"book","title":"On Style"}}'

curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  http://127.0.0.1:8787/seeds
```

Expected result:

- capture returns HTTP `201`
- list returns HTTP `200`
- the list payload includes the new seed
- the list payload includes the source title when one was provided

### Authorized Session Endpoint

Use a cookie jar to sign in and then call `/api/me`:

```bash
curl -i -c /tmp/gloss.cookies \
  -H 'content-type: application/json' \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/api/auth/sign-in/email \
  --data '{"email":"demo@gloss.local","password":"password1234"}'

curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  http://127.0.0.1:8787/api/me
```

Expected result:

- sign-in returns HTTP `200`
- the second request returns HTTP `200`
- the `/api/me` payload includes:
  - `user`
  - `session`
  - `profile`

## Expected Sprint 2 Behaviors

These are the behaviors that should hold every time:

- unauthenticated users cannot read `/api/me`
- the browser never stores bearer tokens in `localStorage`
- auth is cookie-based
- sign-up creates a real session immediately
- sign-out clears access to the protected shell
- the capture, library, and seed detail flows work across split local web and API origins
- the seed detail page can trigger and render enrichment
- `bun run db:reset` is deterministic
- `bun run eval` passes after a reset
- `bun run smoke` passes after a reset

## Troubleshooting

### PostgreSQL binaries not found

Symptom:

- scripts fail with messages about `initdb`, `pg_ctl`, `psql`, or `createdb`

Fix:

- add PostgreSQL to `PATH`, or set `POSTGRES_BIN_DIR`

Example:

```bash
export POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@15/bin
```

### Database ports already in use

Default local ports:

- Postgres: `54329`
- API: `8787`
- Web: `5173`

If the repo-local cluster is stuck or already running:

```bash
bun run db:stop
bun run db:start
```

### Node toolchain warning from Vite

Symptom:

- `bun run build` warns that Node is older than Vite's preferred version

Fix:

- use Node `20.19+` or `22.12+`

### Reset the environment

If local state gets confusing:

```bash
bun run db:reset
```

That is the fastest way to return to a known-good Sprint 3 state.
