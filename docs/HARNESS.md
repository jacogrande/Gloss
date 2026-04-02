# Harness Spec

This document defines the working harness for Gloss: the repo shape, the script contract, the validation loop, and the eval model that should make both humans and agents effective.

## Scope

Gloss is a depth-first vocabulary product for advanced readers. The harness should optimize for:

- low-friction capture
- constrained lexical enrichment
- reliable review generation
- clear architectural boundaries
- fast, repeatable validation

It should not optimize for:

- autonomous multi-agent behavior
- giant prompt files
- vague "try it and see" QA
- open-ended AI chat as the primary UX

## Stack Decision

Current working stack:

- `apps/web`: React SPA built with Vite
- `apps/api`: Hono API for privileged logic, Better Auth, AI orchestration, and worker endpoints
- `React Router 7`: used in SPA mode, not framework mode
- `Railway`: default host for the SPA, API, workers, and Postgres
- `Better Auth`: session and user auth mounted inside the Hono API
- `TypeScript`: required across web, API, shared types, tests, and scripts
- `bun`: workspace package manager

## Repo Layout

Target layout:

```text
.
|-- AGENTS.md
|-- apps/
|   |-- api/
|   |   |-- src/
|   |   |   |-- routes/
|   |   |   |-- services/
|   |   |   |-- jobs/
|   |   |   |-- lib/
|   |   |   `-- index.ts
|   |   `-- test/
|   `-- web/
|       |-- src/
|       |   |-- app/
|       |   |-- routes/
|       |   |-- features/
|       |   |-- lib/
|       |   `-- main.tsx
|       `-- test/
|-- packages/
|   `-- shared/
|       |-- src/
|       |   |-- schemas/
|       |   |-- types/
|       |   `-- contracts/
|       `-- test/
|-- e2e/
|   |-- fixtures/
|   `-- specs/
|-- scripts/
|-- db/
|   |-- migrations/
|   |-- seed.sql
|   `-- fixtures/
`-- docs/
    |-- core.md
    |-- HARNESS.md
    |-- PRODUCT.md
    |-- ARCHITECTURE.md
    |-- FRONTEND.md
    |-- RELIABILITY.md
    |-- SECURITY.md
    |-- QUALITY_SCORE.md
    |-- evals/
    |   |-- README.md
    |   |-- datasets/
    |   `-- graders/
    `-- plans/
        `-- active/
```

## Ownership Boundaries

- `apps/web` owns presentation, local interaction state, optimistic UX, and browser-side auth/session wiring.
- `apps/api` owns Better Auth handlers, privileged mutations, AI calls, OCR calls, lexical ingestion, scheduling, rate limits, and audit logging.
- `packages/shared` owns schemas, contracts, and cross-app types. No product logic should be duplicated between web and API.
- `db` owns schema, migrations, seed fixtures, and any local database bootstrapping.
- `e2e` owns smoke journeys that validate user-visible flows, not implementation detail.

## Script Contract

These scripts are part of the harness and should be implemented as the repo is scaffolded.

### Core Dev

- `bun run dev`
  Starts web and API together.
- `bun run dev:web`
  Starts the Vite SPA.
- `bun run dev:api`
  Starts the Hono API in watch mode.
- `bun run build`
  Builds shared packages, web, and API.

### Quality

- `bun run lint`
  Lint all TS, SQL, and config files.
- `bun run harness:check`
  Validate core harness artifacts, doc freshness, plan shape, and required repo links.
- `bun run lint:boundaries`
  Enforce lightweight structural boundaries between web, API, shared, routes, and services.
- `bun run typecheck`
  Run TS project references or workspace typechecks.
- `bun run test`
  Run unit and integration tests.
- `bun run test:unit`
  Fast pure-logic tests.
- `bun run test:integration`
  API, DB, schema, and provider boundary tests.
- `bun run test:e2e`
  Full Playwright suite against local services with live enrichment providers by default. The runner chooses isolated local web/API ports automatically to avoid stale-port collisions.
- `bun run test:e2e:fuzzy`
  Manifest-driven Playwright journey fuzz suite. Covers every documented user journey with deterministic inputs and live-provider browser execution by default.
- `bun run test:e2e:fixture`
  Explicit fixture override for the full local Playwright suite.
- `bun run test:e2e:fuzzy:fixture`
  Explicit fixture override for the journey-fuzz Playwright suite.
- `bun run test:e2e:hosted`
  Hosted Playwright verification against explicit preview or staging origins.
- `bun run test:e2e:live`
  Compatibility alias for the live-provider local Playwright suite.
- `bun run smoke`
  Short Playwright happy-path journey set. Uses the same isolated local browser-test runner as `test:e2e` and live enrichment providers by default.
- `bun run smoke:fixture`
  Explicit fixture override for the smoke suite.
- `bun run smoke:hosted`
  Short hosted Playwright verification against explicit preview or staging origins.
- `bun run smoke:live`
  Compatibility alias for the live-provider smoke suite.

### Data and Infra

- `bun run db:start`
  Start the native local Postgres cluster used for development and tests.
- `bun run db:reset`
  Rebuild local DB and apply migrations and seeds.
- `bun run db:migrate`
  Apply pending migrations.
- `bun run db:seed`
  Load deterministic local fixture data.
- `bun run deploy:check-env`
  Validate preview, staging, or private-alpha environment alignment from the current shell env. Pass explicit flags such as `-- --environment staging --target combined` when needed.

### Agent and Eval

- `bun run eval`
  Run the MVP eval set with live enrichment providers by default and summarize failures by category.
- `bun run eval:browser`
  Run the manifest-driven Playwright journey fuzz suite as part of the eval harness.
- `bun run eval:fixture`
  Explicit fixture override for the full eval harness.
- `bun run eval:journeys`
  Run output-level evals for capture, enrichment, and review generation.
- `bun run eval:traces`
  Run trace graders on stored API execution traces.
- `bun run eval:add-case`
  Append a new eval dataset row from a concrete bug or regression.
- `bun run report:alpha`
  Derive the current private-alpha KPI snapshot, event counts, and warning signals from typed product events and seed state.
- `bun run fixtures:seed`
  Load seed data for local smoke tests and evals.

## Task Flow

Default flow for substantial work:

1. Read `AGENTS.md` and the minimum linked docs.
2. Create or update a plan in `docs/plans/active/` if the task is non-trivial and still in flight.
3. Make the smallest change that resolves the task.
4. Run the narrowest validation that can disprove the change quickly.
5. If the task touches AI behavior, run the relevant evals.
6. If the task changes a user journey, run the relevant browser fuzz coverage.
7. If a failure mode is new, add an eval case before closing the work.
8. Keep docs and scorecards current enough that `bun run harness:check` stays green.

## Runtime Visibility

The harness must make runtime state inspectable.

Minimum observability for API requests and jobs:

- `request_id`
- `job_id` when applicable
- `user_id` or anonymous actor tag
- `session_id` when authenticated
- `journey`
- `route`
- `model`
- `provider`
- `tool_calls`
- `schema_version`
- `status`
- `latency_ms`
- `db_time_ms`
- `error_code`
- `guardrail_flags`
- `validation_outcome`
- `seed_id` when relevant

Minimum server-side product events for private alpha telemetry:

- `auth.sign_in`
- `auth.sign_in_failed`
- `auth.sign_up`
- `seed.capture`
- `seed.enrichment.requested`
- `seed.enrichment.ready`
- `seed.enrichment.failed`
- `review.session.started`
- `review.session.completed`
- `review.card.submitted`

Minimum observability for the web app:

- route name
- capture source type
- review session id
- seed id
- auth status
- surfaced API error code
- client timing for initial load and review submission

## AI Harness Rules

- All AI requests originate from `apps/api`.
- Every AI output must target a versioned schema in `packages/shared`.
- Lexical source material and source record ids should be assembled before the model call.
- Unsupported fields must be omitted. Do not backfill etymology, relations, or register with guesses.
- Store compact execution traces for enrichment and review-generation jobs.
- Use deterministic prompt templates for MVP workflows. Avoid freeform "figure it out" prompting.

## Release Gates

No feature is considered complete unless it satisfies all of:

- architecture boundaries still hold
- touched paths have a validation story
- `bun run harness:check` is green for the current repo state
- `bun run lint:boundaries` is green for touched architecture paths
- logs and error codes are intelligible
- preview and staging verification notes stay current for private-alpha work
- AI output is schema-checked
- at least one smoke or eval path covers the new behavior
- every documented user journey stays covered by the `@journey-fuzz` Playwright inventory
- CI can run the relevant scripts without hand-edited local state

## Alpha Ops

Private-alpha operator workflow lives in [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md).

Required rules:

- preview is fast feedback only
- staging is the promotion gate
- every escaped bug must land as a test or eval artifact before closure
- use `bun run report:alpha --pretty` for typed KPI and telemetry snapshots instead of ad hoc SQL

## Documents In This Harness

- `docs/PRODUCT.md`: build-level product brief
- `docs/ROADMAP.md`: sprint-level build sequencing and integration choices
- `docs/ARCHITECTURE.md`: service boundaries and data ownership
- `docs/DEPLOYMENT.md`: Railway service layout and native local Postgres rules
- `docs/PRIVATE_ALPHA.md`: preview, staging, issue-intake, and promotion rules
- `docs/QA.md`: local runbook and manual QA steps
- `docs/FRONTEND.md`: UI, routing, and SPA rules
- `docs/GLOSS_ART_DIRECTION.md`: concrete visual direction for the main product UI
- `docs/STAGEHAND_AESTHETIC_REPORT.md`: external design-reference analysis used for Gloss art direction
- `docs/RELIABILITY.md`: test strategy, trace policy, and failure loop
- `docs/SECURITY.md`: data handling and tool safety rules
- `docs/QUALITY_SCORE.md`: living release rubric
- `docs/evals/*`: datasets and grader definitions
- `docs/plans/active/*`: execution plans for ongoing work
- `docs/plans/completed/*`: archived execution records for completed work
