# Manual QA

This document explains how to validate the current Gloss MVP across Sprint 1, Sprint 2, Sprint 3, and Sprint 4.

Use it for three different goals:

- quick local confidence after a change
- a full manual pass before calling the current MVP healthy
- optional live-vendor validation against real OpenAI and Merriam-Webster keys

This is a local-development guide. Railway deployment setup lives in [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md).

## Scope

The current QA surface spans:

- Sprint 1 foundation
  - Bun workspace
  - native local PostgreSQL bootstrap
  - Hono API
  - Better Auth email/password sessions
  - React SPA login and protected shell
- Sprint 2 capture and library
  - manual seed capture
  - personal library browsing
  - seed detail pages
  - ownership isolation
- Sprint 3 constrained enrichment
  - lexical-evidence gathering
  - constrained enrichment output
  - pending, ready, and failed enrichment states
  - retry behavior
  - smoke and eval coverage for capture and enrichment
- Sprint 4 review engine and scheduling
  - review queue summaries
  - short review session creation
  - card submission and durable review events
  - review-state updates and stage advancement

## Prerequisites

Install these first:

- Bun `1.1.42+`
- Node `20.19+` or `22.12+`
- PostgreSQL binaries on `PATH`

Required PostgreSQL binaries:

- `initdb`
- `pg_ctl`
- `psql`
- `createdb`

If PostgreSQL is installed but not on `PATH`, set `POSTGRES_BIN_DIR` to its binary directory.

## Local Setup

From the repo root:

```bash
bun install
cp .env.example .env
bun run db:reset
```

What `bun run db:reset` does:

- starts the repo-local PostgreSQL cluster under `.local/postgres`
- creates the local `gloss` database if needed
- applies migrations from `db/migrations`
- seeds the demo account and demo seed data

Seeded demo credentials:

- email: `demo@gloss.local`
- password: `password1234`

## Running The App

Start both services:

```bash
bun run dev
```

Important notes:

- `bun run dev` prints the chosen `webOrigin` and `apiOrigin`
- when `ENRICHMENT_PROVIDER_MODE` is unset, `bun run dev` auto-selects `live` if `OPENAI_API_KEY`, `MERRIAM_WEBSTER_DICTIONARY_API_KEY`, and `MERRIAM_WEBSTER_THESAURUS_API_KEY` are all present
- if `5173` or `8787` is already occupied, the dev runner chooses the next free local port
- use the printed origins for browser and `curl` checks

Default targets remain:

- web: `http://127.0.0.1:5173`
- api: `http://127.0.0.1:8787`
- health: `http://127.0.0.1:8787/health`

If you only want one service:

```bash
bun run dev:web
bun run dev:api
```

To stop the repo-local PostgreSQL cluster when finished:

```bash
bun run db:stop
```

## Validation Profiles

Choose the smallest profile that answers your question.

### 1. Fixture Regression

Use this for normal development and pre-merge confidence.

```bash
bun run harness:check
bun run lint:boundaries
bun run lint
bun run typecheck
bun run test
bun run eval
bun run smoke
```

Expected result:

- every command exits `0`
- the harness/doc checks pass before app-level validation starts
- fixture-mode smoke passes in a real browser
- fixture-mode eval prints passing summaries for:
  - capture journeys
  - enrichment journeys
  - review journeys
  - HTTP boundary checks
  - enrichment trace checks
  - review trace checks

### 2. Full Manual Pass

Use this when you want to manually verify the current MVP from the browser and API surface.

Recommended order:

1. `bun run harness:check`
2. `bun run lint:boundaries`
3. `bun run db:reset`
4. `bun run dev`
5. complete the browser checklist in this document
6. complete the API checklist in this document
7. finish with `bun run smoke` and `bun run eval`

### 3. Live Vendor Validation

Use this only when you want to verify the real provider path, not everyday regressions.

Required env vars in your shell or repo-root `.env`:

- `OPENAI_API_KEY`
- `MERRIAM_WEBSTER_DICTIONARY_API_KEY`
- `MERRIAM_WEBSTER_THESAURUS_API_KEY`

Optional:

- `OPENAI_MODEL`

Run:

```bash
bun run smoke:live
set -a; source .env; set +a; ENRICHMENT_PROVIDER_MODE=live bun run eval
```

Expected result:

- live smoke passes without assuming fixture-specific words
- live eval passes the live enrichment dataset
- live trace eval passes evidence-driven guardrail checks

## Test Matrix

Use each layer for a different kind of confidence.

### `bun run test:unit`

Use for:

- shared pure transforms
- schema helpers
- normalization logic
- display or mapping helpers

### `bun run test:integration`

Use for:

- Hono routes
- Postgres access
- Better Auth flows
- ownership rules
- enrichment orchestration and persistence

### `bun run test:web`

Use for:

- route-level React behavior
- redirect behavior
- loading, pending, and retry states
- API client error handling

### `bun run smoke`

Use for:

- real browser validation across split local web and API origins
- cookies, CORS, routing, capture, library, and enrichment working together

Current smoke scope:

- sign in
- capture
- seed detail
- enrichment
- library browse
- review queue
- review session start
- review card submission

### `bun run eval`

Use for:

- harness-level invariants that ordinary tests can miss
- product expectations around capture, enrichment, boundaries, and trace quality

Current eval scope:

- capture preserves context and source metadata
- enrichment returns constrained valid payloads
- weak evidence omits fields instead of inventing them
- failed enrichment persists a stable failed state
- review queue excludes failed enrichments
- review sessions persist typed cards and complete cleanly
- review submissions append durable events and update review state
- split-origin HTTP boundaries expose the right headers and error codes
- traces persist versions, validation state, and guardrail decisions

## Recommended Closeout Order

For most user-facing changes:

1. run `bun run test:unit` or `bun run test:web` while iterating
2. run `bun run test:integration` after API, DB, or auth changes
3. run `bun run smoke` after any product-flow or deployment-boundary change
4. run `bun run eval` after any boundary, schema, or provider behavior change
5. run the full closeout set before merging:
   `bun run lint && bun run typecheck && bun run test && bun run smoke && bun run eval`

## Manual Browser QA

Run this section in order for the cleanest full-product pass.

### Sprint 1 Foundation

#### 1. Unauthenticated Redirect

1. Run `bun run db:reset`.
2. Run `bun run dev`.
3. Open the printed `webOrigin`.

Expected result:

- the app redirects unauthenticated users to `/login`

#### 2. Sign Up A New User

1. Open `/login`.
2. Switch to sign-up mode.
3. Enter:
   - a fresh email such as `reader+qa@example.com`
   - a name
   - a password of at least 8 characters
4. Submit the form.

Expected result:

- you are redirected to `/library`
- the authenticated shell loads
- the shell shows the signed-in user email
- the library empty state renders

#### 3. Sign Out

1. Click `Sign out`.

Expected result:

- you return to `/login`
- revisiting `/library` redirects back to `/login`

#### 4. Sign In With The Seeded Demo Account

1. Sign in with:
   - email: `demo@gloss.local`
   - password: `password1234`

Expected result:

- login succeeds
- you land on `/library`
- the library loads demo entries
- at least one card shows the word `lapidary`

#### 5. Reload Stability

1. While signed in on `/library`, refresh the page.

Expected result:

- session recovery succeeds
- the app remains authenticated
- the page does not bounce back to `/login`

### Sprint 2 Capture And Library

#### 6. Word-Only Capture

1. Open `/capture`.
2. Enter:
   - word: `sesquipedalian`
3. Submit the form.

Expected result:

- the request succeeds without a full page reload
- the app navigates to `/seeds/<id>`
- the detail page shows the word `sesquipedalian`
- stage renders as `new`
- the captured-context block remains stable even without sentence or source metadata

#### 7. Rich Capture With Source Metadata

1. Open `/capture`.
2. Enter:
   - word: `pellucid`
   - sentence: `Her explanation was pellucid even under pressure.`
   - source kind: `book`
   - source title: `On Style`
   - source author: `A. Reader`
3. Submit the form.

Expected result:

- the request succeeds
- the detail page shows:
  - word `pellucid`
  - sentence `Her explanation was pellucid even under pressure.`
  - source title `On Style`
  - source author `A. Reader`
  - stage `new`

#### 8. Library Browse

1. Navigate back to `/library`.
2. Confirm the newly created seed appears near the top.
3. Change the stage filter to `new`.

Expected result:

- the new seed appears in the list
- the seed card shows the source title and sentence preview
- filtering by `new` still includes the seed
- the library remains user-scoped

#### 9. Seed Detail Reload Stability

1. Open the new seed detail page directly.
2. Refresh the browser.

Expected result:

- the detail page reloads in place
- the session remains valid
- the captured sentence and source metadata still render

#### 10. User Scope Check

1. Sign out from the demo account.
2. Sign back in as the fresh user you created earlier.
3. Open `/library`.

Expected result:

- the fresh user does not see the demo user’s seeds
- the fresh user only sees their own seeds
- direct navigation to a demo seed detail URL does not reveal demo seed content

### Sprint 3 Constrained Enrichment

#### 11. Ready Enrichment State

1. While signed in, capture or open a `pellucid` seed with:
   - sentence: `Her explanation was pellucid even under pressure.`
2. Wait on the seed detail page for the enrichment panel to settle.

Expected result in fixture mode:

- the panel settles into a ready state
- the enrichment block shows:
  - a non-empty gloss
  - related word `lucid`
  - contrastive word `opaque`

Expected result in live mode:

- the panel reaches a usable ready state
- the gloss is non-empty
- optional fields may vary based on vendor evidence

#### 12. Failed Enrichment State

1. Capture a seed with:
   - word: `obscurium`
2. Wait for the enrichment panel to settle.

Expected result:

- the panel does not remain stuck on `Lexical scaffolding`
- the panel renders `Enrichment paused`
- the UI exposes a `Retry enrichment` button
- the page remains usable

#### 13. Retry Path

1. From the failed `obscurium` seed, click `Retry enrichment`.

Expected result:

- the request completes cleanly
- the page remains stable
- the failed state persists with a stable message when lexical evidence is still unavailable
- no duplicate seed or corrupted detail state appears

#### 14. Enrichment Readback

1. Refresh the ready `pellucid` seed detail page.

Expected result:

- the accepted enrichment still renders after reload
- the page does not require recapture
- the saved enrichment matches the last accepted state rather than rebuilding from scratch on every load

### Sprint 4 Review Engine And Scheduling

#### 15. Review Queue

1. Sign in as `demo@gloss.local`.
2. Open `/review`.

Expected result:

- the page loads without redirect loops
- the queue shows a non-zero `due` count after `bun run db:reset`
- the dimension breakdown renders for recognition, distinction, and usage
- the primary action is enabled

#### 16. Start A Review Session

1. On `/review`, click `Start review`.

Expected result:

- a session starts immediately without a full page reload
- the page shows one card at a time
- the card shows:
  - the target word
  - a question
  - at least two answer choices
- the queue summary changes from `X due` to `Y remaining`

#### 17. Submit A Review Card

1. Select any answer choice.
2. Click `Submit`.

Expected result:

- the request completes cleanly
- the session either advances to the next card or finishes
- the UI does not get stuck on the same pending choice state
- refreshing the page does not lose the active or completed session state unexpectedly

#### 18. Complete A Short Session

1. Continue submitting answers until the session finishes.

Expected result:

- the page shows `Session finished`
- the completion state reports the number of completed cards
- returning to `/review` shows updated queue counts

## Manual API QA

Use the printed `apiOrigin` and `webOrigin` if your dev ports were auto-bumped.

### 1. Health Endpoint

Run:

```bash
curl http://127.0.0.1:8787/health
```

Expected result:

- HTTP `200`
- JSON success payload

### 2. Unauthorized Session Endpoint

Run:

```bash
curl -i http://127.0.0.1:8787/api/me
```

Expected result:

- HTTP `401`
- JSON error payload
- error code `AUTH_UNAUTHORIZED`

### 3. Sign In And Read Session

Run:

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
- `/api/me` returns HTTP `200`
- the payload includes:
  - `user`
  - `session`
  - `profile`

### 4. Capture, List, And Detail

Run:

```bash
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
- source metadata survives round-trip when provided

### 5. Enrichment Endpoint

Use the seed id returned from capture or from `GET /seeds`.

Run:

```bash
curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/seeds/<seed-id>/enrich

curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  http://127.0.0.1:8787/seeds/<seed-id>
```

Expected result in fixture mode:

- enrich returns HTTP `200`
- the seed detail payload contains a `ready` enrichment for `pellucid`
- the payload includes a non-empty gloss

Expected result for a known weak-evidence word like `obscurium`:

- enrich still returns a stable JSON payload
- the detail payload shows `failed`
- `errorCode` is `ENRICHMENT_EVIDENCE_UNAVAILABLE`

### 6. Review Queue And Session

Use a reviewable seed such as the seeded demo data or a freshly enriched `pellucid` capture.

Run:

```bash
curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  http://127.0.0.1:8787/review/queue

curl -i -b /tmp/gloss.cookies \
  -H 'content-type: application/json' \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/review/sessions \
  --data '{}'
```

Expected result:

- queue returns HTTP `200`
- the payload includes `dueCount`, `availableCount`, and `dueByDimension`
- session start returns HTTP `200` when reviewable seeds exist
- the session payload includes:
  - a session summary
  - one or more typed review cards
  - `currentCardId`

## Expected Product Behaviors

These should hold every time:

- unauthenticated users cannot read `/api/me`
- auth is cookie-based
- the browser never stores bearer tokens in `localStorage`
- sign-up creates a real session immediately
- sign-out removes access to protected routes
- capture, library, and seed detail work across split local web and API origins
- review queue and review submission work across split local web and API origins
- seed ownership is enforced in the API
- enrichment never blocks initial capture
- accepted enrichment is schema-validated before persistence
- weak evidence causes omission or stable failure, not fabrication
- failed enrichments do not enter the review queue
- review submissions append durable events and update per-seed review state
- `bun run db:reset` returns the repo to a deterministic state
- `bun run smoke` passes after a reset
- `bun run eval` passes after a reset

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

### Local ports already in use

Default local ports:

- Postgres: `54329`
- API: `8787`
- Web: `5173`

Fix:

- `bun run dev` auto-selects free web and API ports
- if the repo-local Postgres cluster is stuck, run:

```bash
bun run db:stop
bun run db:start
```

### Vite Node warning

Symptom:

- `bun run build` warns that Node is older than Vite's preferred version

Fix:

- use Node `20.19+` or `22.12+`

### Reset to a known-good state

If local state gets confusing:

```bash
bun run db:reset
```

That is the fastest way to return to a known-good Sprint 1 through Sprint 4 state.
