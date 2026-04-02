# Sprint 2 Capture And Library

## Goal

Make Gloss feel like a real product by letting an authenticated user capture a `Word Seed`, browse a personal library, and open a seed detail page backed by real Railway Postgres data and API-level authorization.

At the end of this sprint, Gloss should support the first full non-authenticated-product journey:

1. sign in
2. manually capture a word with optional sentence and source metadata
3. see the saved seed in a personal library
4. open the seed detail page

Sprint 2 should prove the app can store durable reading-linked vocabulary objects before any AI enrichment work begins.

## Context

This plan implements Sprint 2 from [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md). The working constraints and architecture come from:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/Users/jackson/Code/projects/gloss/docs/ARCHITECTURE.md)
- [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md)

Sprint 1 already established:

- Bun workspace and root validation scripts
- Better Auth session flow
- Hono API bootstrap
- Railway-oriented deployment docs
- native local PostgreSQL development flow

Sprint 2 should build on that baseline without revisiting auth or infrastructure unless a capture-specific blocker appears.

The stack for this sprint remains:

- `apps/web`: Vite + React + React Router 7 SPA
- `apps/api`: Hono API on Bun/Node compatibility
- `database`: Railway Postgres locally mirrored by the native local Postgres helper
- `auth`: Better Auth under `/api/auth/*`
- `data layer`: Drizzle schema + `node-postgres`
- `shared contracts`: `packages/shared`
- `package manager`: `bun`

## Product Outcome

The implementation should satisfy the product brief for the first two user-visible MVP promises:

- users can capture words from real reading
- the captured words become durable product objects, not transient notes

Concrete Sprint 2 product behaviors:

- manual capture must be fast and calm
- source sentence and source metadata remain optional but first-class
- the library belongs to the signed-in user only
- the seed detail page shows captured context cleanly, without pretending enrichment exists yet

## Constraints

- Keep all product reads and writes in the API layer. The browser must not access Railway Postgres directly.
- Keep Railway deploy topology simple:
  - `apps/api` remains a stateless API service
  - `apps/web` remains a static SPA
  - Railway Postgres remains the system of record
- Use explicit SQL migrations for every schema change.
- Keep route handlers thin and side-effect boundaries explicit.
- Preserve the current auth model:
  - cookie-based sessions
  - Better Auth remains mounted at `/api/auth/*`
  - ownership checks stay in the API
- Treat captured text and source metadata as untrusted input.
- Keep Sprint 2 free of AI, OCR, extension, or import-job logic unless a minimal placeholder reduces near-term churn.
- Do not add background workers or cron for capture. Manual capture should be a synchronous API mutation.

## Functional Programming Rules

Sprint 2 should reinforce a functional style instead of drifting into stateful service objects.

Required coding rules:

- prefer pure functions for:
  - word normalization
  - filter parsing
  - DTO mapping
  - route-query decoding
  - presentational transforms
- isolate side effects in narrow modules:
  - repositories for DB access
  - route handlers for HTTP
  - seed scripts for fixtures
- do not hide mutation behind long-lived class instances
- pass dependencies explicitly into functions instead of importing ambient mutable singletons where avoidable
- keep domain values immutable once created; prefer derived copies over in-place mutation
- use shared schemas and typed contracts as the boundary between layers
- represent failures with stable typed error codes, not ad hoc thrown strings

Practical implication:

- repository functions should accept inputs and return value objects
- service functions should compose repository calls plus pure transforms
- React components should receive plain props and keep network effects at route or feature boundaries

## Non-Goals

Do not spend Sprint 2 on:

- AI enrichment generation
- article import
- browser extension capture
- OCR or image upload
- scheduler logic
- review sessions
- advanced search relevance
- deduplication heuristics beyond obvious normalization helpers
- collaborative or sharing features

## Deliverables

By the end of Sprint 2, the repo should include:

- capture-oriented database tables and migrations:
  - `sources`
  - `seeds`
  - `seed_contexts`
- shared request and response contracts for:
  - create seed
  - list seeds
  - get seed detail
- API endpoints for:
  - create seed
  - list current-user seeds
  - fetch current-user seed detail
- authorization coverage proving one user cannot read or mutate another user's seeds
- a manual capture screen at `/capture`
- a library screen at `/library`
- a seed detail route at `/seeds/:seedId`
- deterministic seed fixtures for the demo user
- at least one real smoke path covering:
  - sign in
  - capture
  - library browse
- Railway-oriented docs or notes updated where necessary for new routes, fixtures, or preview validation

## Domain Model Direction

Sprint 2 should create the smallest durable schema that still supports future enrichment and review work cleanly.

### `sources`

Purpose:

- store optional source metadata attached to a capture
- give the library something to filter or group by later

Recommended fields:

- `id`
- `user_id`
- `kind`
  - likely `manual`, `article`, `book`, or `other`
- `title`
- `author`
- `url`
- `created_at`
- `updated_at`

Rules:

- a source belongs to one user
- source metadata is optional
- source records can be sparse in Sprint 2

### `seeds`

Purpose:

- store the durable vocabulary object

Recommended fields:

- `id`
- `user_id`
- `source_id` nullable
- `word`
- `normalized_word`
- `stage`
  - start with `new`
- `created_at`
- `updated_at`

Rules:

- `word` keeps the captured surface form
- `normalized_word` supports future dedupe/filter work
- `stage` should exist now even if Sprint 2 only uses `new`

### `seed_contexts`

Purpose:

- preserve reading-linked context separately from the seed row

Recommended fields:

- `id`
- `seed_id`
- `kind`
  - start with `sentence`
- `text`
- `is_primary`
- `created_at`

Rules:

- sentence text is optional at capture time
- if present, it should be the primary display context on the seed detail page
- this table should remain extensible for future paragraph or OCR-derived context without redesigning the seed row

## API Shape

Sprint 2 should keep API surface small and typed.

Recommended endpoints:

- `POST /capture/seeds`
  - create a seed from manual input
- `GET /seeds`
  - list current-user seeds with optional filters
- `GET /seeds/:seedId`
  - fetch a single current-user seed detail

Optional only if it materially simplifies the web app:

- `GET /sources`
  - list current-user sources for filter dropdowns

Do not add update or delete routes unless implementation pressure makes one of them clearly necessary.

## Web Route Shape

Sprint 2 should activate the route map described in [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md).

Required routes:

- `/capture`
- `/library`
- `/seeds/:seedId`

Behavior expectations:

- `/capture`
  - fast manual form
  - word required
  - sentence optional
  - source metadata optional
- `/library`
  - list current-user seeds
  - show stage and source summary where available
  - support at least one filter path
- `/seeds/:seedId`
  - show captured word
  - show captured sentence if present
  - show source metadata if present
  - show clear placeholder space for later enrichment rather than fake content

## Railway-Oriented Design Notes

Sprint 2 should preserve the deployment shape already documented in [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md).

Practical rules:

- keep all seed persistence in Railway Postgres-compatible SQL
- avoid filesystem coupling in the capture flow
- keep API handlers stateless so Railway web/API services remain horizontally simple
- prefer straightforward paginated SQL queries over in-memory filtering in the API
- keep migrations safe for Railway pre-deploy execution
- avoid introducing any local-only assumptions that would break preview deploys

Operational implication:

- seed creation should be one API mutation followed by deterministic SQL writes
- library browsing should be one read query family with explicit auth predicates
- fixtures should use the same schema and repository code where practical

## Workstreams

### 1. Shared Capture Contracts

Create the contract layer before route implementation.

Expected outputs:

- seed stage enum
- source kind enum
- create-seed input schema
- list-seeds query schema
- seed-summary response schema
- seed-detail response schema

Rules:

- shared schemas live in `packages/shared`
- web and API must both consume the same contract definitions
- schema names should leave room for enrichment fields later without pretending they exist now

### 2. Database Schema And Migration Design

Add Sprint 2 data tables cleanly.

Expected outputs:

- Drizzle schema additions for `sources`, `seeds`, and `seed_contexts`
- SQL migrations checked into `db/migrations`
- indexes for:
  - `user_id`
  - `source_id`
  - `normalized_word`
  - `stage`

Rules:

- ownership should be queryable via `user_id` without joins in every path where possible
- foreign keys should be explicit
- deletes should be intentional:
  - user-owned rows should usually cascade from seed to seed contexts
  - source linkage should be thought through before choosing cascade or set-null

### 3. Pure Domain Helpers

Extract pure logic instead of burying it in handlers.

Expected outputs:

- `normalizeWord`
- source metadata normalization
- list filter parsing
- response mappers from DB rows to API contracts
- perhaps a lightweight source upsert key builder if needed

Rules:

- these functions should have focused unit tests
- no DB or HTTP dependencies inside them

### 4. Repository Layer

Create explicit capture and library repositories in the API.

Expected outputs:

- create source record or reuse strategy
- insert seed row
- insert optional seed context
- list seeds for current user
- fetch a single seed detail for current user

Rules:

- repositories should accept typed inputs and return typed data
- every query path must enforce `user_id` ownership
- avoid generic repository abstractions; write concrete functions for the product workflow

### 5. Capture Service And Routes

Build the authoritative mutation path.

Expected outputs:

- `POST /capture/seeds`
- typed validation
- stable error codes for:
  - invalid input
  - unauthorized access
  - not found where relevant

Rules:

- create route handlers should decode input, call a service, and encode output
- service code should decide how source creation, seed creation, and context creation compose
- do not let the route handler own transaction choreography if a service can own it cleanly

### 6. Library And Seed Detail Routes

Build read paths that the SPA can consume directly.

Expected outputs:

- `GET /seeds`
- `GET /seeds/:seedId`
- optional query filtering by:
  - stage
  - source

Rules:

- use compact summary payloads for library cards
- use a richer payload for seed detail
- list endpoints should be efficient enough for a normal-sized hobby dataset without extra infra

### 7. SPA Capture, Library, And Detail UX

Expose the new product surface in the web app.

Expected outputs:

- capture form feature
- library list feature
- seed detail feature
- route-level loading and error states

Rules:

- keep route files thin
- keep UI calm and dense, not dashboard-gimmicky
- success on capture should be immediate and obvious
- avoid giant optimistic systems; prefer server-confirmed writes with clean follow-up navigation

Recommended UX shape:

- capture submit navigates to the new seed detail page or library with success feedback
- library cards link directly to seed detail
- empty states should explain what to do next instead of feeling like a dead end

### 8. Fixtures, Smoke, And Manual QA

Turn the new flow into repeatable validation.

Expected outputs:

- demo seed fixtures for the demo user
- API integration tests for:
  - create
  - list
  - detail
  - cross-user denial
- at least one browser-visible smoke path or scripted equivalent upgraded from the Sprint 1 auth-only smoke
- manual QA doc updates if URLs or steps change

Rules:

- prefer deterministic fixtures over random data
- smoke should cover the real user journey, not only API calls
- every authorization rule should have a negative-path test

### 9. Railway Readiness

Keep the deployment contract current as product routes appear.

Expected outputs:

- any needed updates to docs for:
  - preview validation
  - data resets
  - environment expectations

Rules:

- do not introduce any environment variables that the Railway layout cannot supply simply
- keep preview and local behavior conceptually aligned

## Sequence

Recommended execution order:

1. finalize shared capture contracts and enums
2. implement DB schema additions and migrations
3. build pure normalization/filter helpers with unit tests
4. build concrete repositories
5. build capture/list/detail services and Hono routes
6. wire SPA routes and feature UIs
7. add fixtures and automated validation
8. upgrade smoke to cover capture and library
9. update docs and deployment notes

This order matters because the web should be built against settled contracts and real routes, not guessed payload shapes.

## Detailed Step Breakdown

## Steps

1. Add shared capture schemas and types in `packages/shared`.
   Deliverables:
   create-seed input schema, seed summary/detail contracts, stage/source enums, and any shared filter schemas.

2. Add Drizzle schema definitions and SQL migrations for Sprint 2 tables.
   Deliverables:
   `sources`, `seeds`, `seed_contexts`, indexes, foreign keys, and migration files.

3. Implement pure helper functions for normalization and mapping.
   Deliverables:
   `normalizeWord`, source metadata normalization, route query decoders, and API DTO mappers.

4. Implement API repositories and service orchestration.
   Deliverables:
   create seed flow, list seeds flow, get seed detail flow, and typed failure handling.

5. Implement Hono routes.
   Deliverables:
   `POST /capture/seeds`, `GET /seeds`, and `GET /seeds/:seedId`.

6. Build SPA capture, library, and detail routes.
   Deliverables:
   `/capture`, `/library`, `/seeds/:seedId`, loading states, and empty states.

7. Extend demo fixtures and QA flows.
   Deliverables:
   demo seeds for the demo user, updated seed scripts, and QA documentation as needed.

8. Add automated validation.
   Deliverables:
   pure unit tests, API integration tests, and upgraded smoke coverage for the capture-to-library flow.

9. Review Railway-readiness and operational notes.
   Deliverables:
   updated deployment/QA notes only where Sprint 2 changes require them.

## Validation

Minimum expected validation before Sprint 2 is considered done:

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`

Sprint 2-specific checks that should exist by the end:

- unit tests for pure normalization and filter helpers
- integration tests for:
  - create seed
  - list seeds
  - seed detail
  - cross-user denial
- smoke path for:
  - sign in
  - capture seed
  - open library
  - open seed detail

Manual QA should confirm:

- creating a seed with only a word works
- creating a seed with word + sentence + source metadata works
- the library only shows the signed-in user’s seeds
- a seed detail page renders captured context correctly
- logging out removes access to library and detail routes

## Risks

- Data model overreach:
  adding too many future fields now will slow delivery and muddy the capture flow.
- Context under-modeling:
  if sentence/source handling is too thin, Sprint 3 enrichment will start from bad inputs.
- Authorization regressions:
  user-scoped list/detail queries are an easy place to leak data if ownership is not part of every query.
- UI sprawl:
  capture, library, and detail can turn into three disconnected mini-apps if the shared contract layer is weak.
- Smoke fragility:
  if the first browser-visible smoke is too broad, it will be flaky instead of useful.

## Mitigations

- keep table design minimal but future-compatible
- isolate pure transforms and repository boundaries early
- write negative-path authorization tests before calling the routes done
- keep the library summary payload intentionally compact
- build one narrow, deterministic smoke path first, then expand later

## Resolved During Execution

- Source handling stayed lightweight and deterministic without over-optimizing reuse logic.
- Library filtering shipped with the narrower stage-oriented MVP behavior instead of a broader source-filter surface.
- Successful capture routed users directly to seed detail so the save action felt concrete immediately.

## Status Log

- 2026-03-26: created
- 2026-04-01: archived as completed after Sprint 2 shipped and its follow-on hardening work was absorbed into the main repo and harness.
