# Sprint 1 Foundation

## Goal

Establish the runnable foundation for Gloss so Sprint 2 can focus on product behavior instead of bootstrapping. At the end of this sprint, the repo should contain a working monorepo, a deployable SPA and API, a connected Postgres database, a functioning Better Auth flow, and the first validation scripts needed to keep the system stable.

## Context

This plan implements Sprint 1 from [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md). The current architecture and harness assumptions come from:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/ARCHITECTURE.md](/Users/jackson/Code/projects/gloss/docs/ARCHITECTURE.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)

The stack for this sprint is fixed unless a concrete blocker appears:

- `apps/web`: Vite + React + React Router 7 in SPA mode
- `apps/api`: Hono on Node
- `auth`: Better Auth mounted under `/api/auth/*`
- `database`: Railway Postgres
- `data layer`: Drizzle + `node-postgres`
- `shared contracts`: `packages/shared`
- `package manager`: `bun`

This sprint is about infrastructure and developer ergonomics, not feature depth. The primary product outcome is that a user can authenticate and reach an authenticated application shell backed by the real API and database.

## Constraints

- Keep the repo shape aligned with [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md).
- Keep auth and authorization inside the API layer; the browser must not talk to Postgres directly.
- Better Auth handlers must live under `/api/auth/*`.
- Use cookie-based sessions. Do not store auth tokens in `localStorage`.
- Use explicit migrations and seeds. Do not hide DB setup in ad hoc startup scripts.
- Build the minimum required for Sprint 2. Do not pull in enrichment, review, OCR, or extension work.
- Prefer a small set of proven tools over clever stack additions.
- Every new path should have at least one plausible validation step, even if the full test suite does not exist yet.

## Non-Goals

Do not spend Sprint 1 on:

- manual capture UI beyond what is required to prove auth and routing
- seed CRUD
- lexical provider integration
- OpenAI integration
- eval runner implementation
- browser extension work
- OCR/file import work
- email verification, reset flows, or transactional email delivery
- production polish of visual design beyond a basic application shell

## Deliverables

By the end of this sprint, the repo should include:

- a `bun` workspace with `apps/web`, `apps/api`, `packages/shared`, and `db`
- TypeScript configuration for the workspace
- lint and formatting configuration
- initial Drizzle setup and first migrations
- Better Auth configuration connected to Postgres
- an authenticated API route and an authenticated web route
- a basic logged-in app shell
- local development scripts matching the harness names:
  - `bun run dev`
  - `bun run dev:web`
  - `bun run dev:api`
  - `bun run build`
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test`
  - `bun run db:migrate`
  - `bun run db:seed`
- a minimal smoke path or scripted check proving login and authenticated API access
- deployment notes and environment variable documentation for Railway

## Workstreams

### 1. Workspace And Tooling

Set up the repo so later work lands cleanly.

Expected outputs:

- root `package.json`
- root `tsconfig` strategy
- shared lint and formatter configuration
- root scripts wired to workspace tasks

Decisions:

- keep the workspace simple
- avoid turbo or additional orchestration unless startup friction becomes real
- prefer one lint and typecheck flow over package-specific drift

### 2. Shared Contracts

Create `packages/shared` as the contract layer.

Expected outputs:

- shared environment schema helpers
- common API response envelope or error shape
- initial auth/session types where useful
- placeholder product contract modules for later Sprint 2 use

Rules:

- put cross-app schemas here
- do not put business logic here
- prefer Zod-backed contracts so runtime validation and TS types stay aligned

### 3. Database And Migration Spine

Create the first real database layer.

Expected outputs:

- Drizzle config
- first migration set
- local DB bootstrap instructions
- deterministic seed script or SQL fixture

Minimum Sprint 1 schema target:

- Better Auth required tables
- `profiles`

Optional only if it reduces later churn:

- `sources` as an empty or near-empty first migration stub

Rules:

- migrations must be explicit and checked into `db/migrations`
- keep schema names plain and readable
- do not add future-MVP tables just because they are known already

### 4. API Foundation

Stand up the Hono service as the authoritative app backend.

Expected outputs:

- `apps/api/src/index.ts`
- route organization under `routes/`
- service organization under `services/`
- shared DB bootstrap under `lib/`
- `/health` endpoint
- `/api/auth/*` Better Auth mount
- one authenticated test route such as `/me` or `/session`

Rules:

- keep handlers thin
- return typed payloads
- include stable error codes for expected failures
- add structured request logging early

### 5. Web Foundation

Stand up the React SPA and prove session-aware routing.

Expected outputs:

- Vite app scaffold
- React Router setup in SPA mode
- login route
- authenticated route or shell route
- session bootstrap from Better Auth client helpers

Rules:

- keep the route tree small
- only build the screens required to prove auth and navigation
- use cookie-based auth and `credentials: "include"` where needed

### 6. Railway Deployment Spine

Make the application deployable on the target host early.

Expected outputs:

- Railway service layout documented:
  - web
  - api
  - postgres
- build and start commands defined
- required environment variables documented
- local and production origin assumptions documented

Rules:

- keep deployment topology simple
- prefer one repo with separate services over premature micro-splitting
- keep Postgres access configuration explicit

### 7. Validation Baseline

Set up the smallest validation surface that can catch obvious breakage.

Expected outputs:

- lint and typecheck runnable
- at least one API test
- at least one auth/session integration test
- a minimal smoke check for:
  - sign in
  - authenticated route access

Rules:

- do not wait for Sprint 5 to start validation
- keep smoke narrow and deterministic
- if Playwright setup is too heavy for Sprint 1, use a temporary scripted auth check, then replace it in Sprint 2

## Sequence

Recommended execution order:

1. Scaffold workspace and root configs.
2. Create `packages/shared` and basic contract utilities.
3. Configure Drizzle and the first Postgres connection path.
4. Wire Better Auth to the DB and generate or author its required migrations.
5. Stand up the Hono API with `health` and authenticated session endpoints.
6. Stand up the web SPA with login and authenticated shell routes.
7. Wire local scripts and environment loading.
8. Add minimal tests and smoke coverage.
9. Document Railway setup and verify deployment assumptions.

This order matters because Better Auth and the API layer depend on the DB being coherent, and the SPA should not be built against guessed auth contracts.

## Detailed Step Breakdown

## Steps

1. Create the monorepo skeleton and root config.
   Deliverables:
   root `package.json`, Bun workspace config, base `tsconfig`, ignore files, and initial script wiring.

2. Scaffold `packages/shared` with runtime-safe contract helpers.
   Deliverables:
   Zod setup, shared types, initial error contract, and environment parsing helpers.

3. Scaffold `apps/api` with Hono and Node serving.
   Deliverables:
   app bootstrap, route folders, health route, logger stub, env loading, and test bootstrap.

4. Scaffold `apps/web` with Vite, React, and React Router 7.
   Deliverables:
   route tree, login route, authenticated shell route, API client wrapper, and basic styling shell.

5. Add Drizzle, Postgres connection utilities, and the first migration set.
   Deliverables:
   `db/migrations`, Drizzle config, DB client helpers, and deterministic local seed path.

6. Integrate Better Auth with Postgres and expose it via Hono.
   Deliverables:
   Better Auth config, `/api/auth/*` handler, session lookup middleware or helper, and session-backed `/me` or `/session` endpoint.

7. Connect the web app to Better Auth.
   Deliverables:
   sign-up or sign-in form, auth status bootstrap, protected-route gating, and logout path.

8. Add initial validation and developer scripts.
   Deliverables:
   working `lint`, `typecheck`, `test`, `build`, `db:migrate`, and `db:seed` scripts, plus at least one API and auth integration test.

9. Add a minimal smoke path.
   Deliverables:
   either Playwright or a temporary script proving login plus authenticated API access.

10. Document Railway service setup and production environment variables.
    Deliverables:
    deployment notes, required env vars, origin assumptions, cookie-domain assumptions, and any known local-to-prod differences.

## Environment Variables

Expected Sprint 1 variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` or equivalent canonical base URL for auth callbacks
- `WEB_ORIGIN`
- `API_ORIGIN`
- `NODE_ENV`

Possibly useful:

- `PORT`
- `LOG_LEVEL`
- `COOKIE_DOMAIN` for production only if needed

Rules:

- production secrets must not be committed
- local development should have a documented `.env` shape
- do not introduce provider env vars for OpenAI or lexical vendors yet

## Definition Of Done

Sprint 1 is complete when all of the following are true:

- the monorepo exists and installs cleanly
- the web app runs locally
- the API runs locally
- the database can be migrated and seeded locally
- Better Auth persists sessions in Postgres
- a user can sign in and reach an authenticated route
- the SPA can call an authenticated API endpoint successfully
- lint and typecheck pass
- at least one automated auth or session test exists
- Railway deployment assumptions are documented well enough for implementation

## Validation

- `bun install` completes successfully
- `bun run build` succeeds across the workspace
- `bun run lint` passes
- `bun run typecheck` passes
- `bun run test` passes for the initial API and auth checks
- `bun run db:migrate` applies the initial migration set cleanly
- `bun run db:seed` loads deterministic local data cleanly
- local sign-in works end to end
- authenticated API access works end to end
- smoke or equivalent scripted auth check passes

## Risks

- Better Auth schema and migration flow may not match the first-pass Drizzle setup cleanly.
- Cross-origin cookie behavior can create local auth confusion if web and API are served from different origins too early.
- Railway deployment assumptions can drift from local development if environment variables and service boundaries are not documented carefully.
- Overbuilding Sprint 1 can delay product work; the biggest risk is accidentally implementing Sprint 2 or Sprint 3 concerns here.
- Adding too many infra tools now can create maintenance cost without reducing real risk.

## Mitigations

- Keep the initial auth flow minimal: email/password plus session bootstrap only.
- Prefer same-site or same-domain local assumptions where practical to reduce cookie complexity.
- Add one authenticated API route early and exercise it from the SPA before polishing anything else.
- Keep the schema minimal and resist adding future product tables until they are needed.
- Use the roadmap as a guardrail when deciding whether work belongs in Sprint 1.

## Open Questions

- Should the SPA be served as a separate Railway static service in Sprint 1, or should the API serve the built assets initially to reduce deployment complexity?
- The local DB flow uses a native local Postgres helper that shells out to `initdb`, `pg_ctl`, `psql`, and `createdb`. The required binaries can come from `PATH` or `POSTGRES_BIN_DIR`.
- Do we want Playwright in Sprint 1, or is a temporary auth smoke script sufficient until Sprint 2?

These questions should be resolved during execution, but none of them should block the sprint from starting.

## Status Log

- 2026-03-26: created from the MVP roadmap, harness, architecture, reliability, and security docs.
