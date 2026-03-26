# MVP Roadmap

This roadmap breaks the Gloss MVP into five focused sprints. It is designed for a small team or solo-founder pace and assumes each sprint is roughly `1-2 weeks` of concentrated work.

The order is intentional:

1. establish the repo and deployment spine
2. prove capture and storage
3. prove constrained enrichment
4. prove review and scheduling
5. harden, measure, and release to a private alpha

## Working Assumptions

- Default stack: `Vite + React SPA + React Router 7 + Hono + Railway + Railway Postgres + Better Auth`
- Package manager: `pnpm`
- ORM/data layer bias: `Drizzle + node-postgres`
- Model/API bias: `OpenAI Responses API` with `Structured Outputs`
- Browser extension and OCR are explicitly deferred until after core MVP proof
- Cost discipline matters more than platform maximalism

## Why Five Sprints

Five sprints is the best fit for the current product:

- three sprints is too compressed and tends to hide AI and review risk until too late
- six sprints is likely too granular for a hobby MVP and encourages premature polish

This plan aims to get to a credible private alpha without turning the roadmap into a long waterfall.

## Summary

| Sprint | Focus | Primary outcome |
| --- | --- | --- |
| 1 | Foundation | Running web, API, DB, auth, and deploy pipeline |
| 2 | Capture | Authenticated users can create and browse Word Seeds |
| 3 | Enrichment | Seeds gain constrained AI-backed lexical scaffolding |
| 4 | Review | Users can complete meaningful review sessions with basic scheduling |
| 5 | Hardening | Smoke tests, evals, staging, metrics, and private alpha readiness |

## Sprint 1: Foundation

### Goal

Establish the codebase, runtime, auth, and deployment spine so later work lands on a stable base.

### Scope

- scaffold `apps/web`, `apps/api`, `packages/shared`, and `db`
- configure workspace TypeScript, linting, and formatting
- stand up Railway services for:
  - web
  - api
  - postgres
- wire Better Auth into Hono under `/api/auth/*`
- define the first shared schemas and environment contracts
- create a `health` endpoint and basic authenticated route

### Recommended technology and integrations

- `Better Auth + Hono`
  - Better Auth has first-party Hono integration and expects auth handlers under `/api/auth/*`.
  - It supports email/password out of the box and favors cookie-based session flows.
- `Railway for hosting and Postgres`
  - Railway can host the SPA, API, and Postgres in one project.
  - Railway private networking gives service-to-service connectivity over internal DNS at runtime.
- `Drizzle + node-postgres`
  - Drizzle is a good fit for a TS-first Postgres app.
  - The Drizzle Postgres docs support both `pg` and `postgres.js`; for MVP, `node-postgres` is the safer default.

### Research notes

- Better Auth’s docs recommend mounting the handler directly in Hono and using `credentials: "include"` on the client when crossing origins.
- Keep DB migrations and seed steps explicit instead of hiding them in frontend build steps.
- Railway static hosting now supports zero-config deploys, custom domains, SSL, and PR previews. That keeps web hosting simple.

### Exit criteria

- a user can sign up or sign in locally
- the web app can call an authenticated API endpoint successfully
- the repo builds in CI or the equivalent local script path
- Railway environments exist for local, preview, and production planning

### Explicit deferrals

- email verification
- password reset email delivery
- browser extension
- OCR

## Sprint 2: Capture And Library

### Goal

Make the product real enough that a user can save Word Seeds from reading and browse them later.

### Scope

- design and migrate initial product tables:
  - `profiles`
  - `sources`
  - `seeds`
  - `seed_contexts`
- implement manual capture flow
- implement seed list and seed detail skeleton
- enforce API-level ownership on all reads and writes
- add seed fixtures for local development

### Recommended technology and integrations

- `Hono RPC`
  - Share request and response types between the API and SPA.
  - This reduces boilerplate and keeps contracts aligned with shared schemas.
- `React Router 7` in SPA mode
  - Keep routing simple and do not adopt framework mode or SSR yet.
- `Playwright`
  - Add the first smoke journey as soon as capture works.

### Research notes

- Hono’s RPC support is a good fit for a monorepo with strict TypeScript settings.
- Playwright bundles the runner, assertions, traces, and reports, which makes it the right early smoke-testing choice for a small app.
- Better Auth’s email verification and reset flows are real but should stay deferred until the sign-in flow itself is proven.

### Exit criteria

- an authenticated user can create a seed with word, sentence, and optional source metadata
- the user can view a library page and a seed detail page
- cross-user access to seeds is denied
- one smoke test covers sign-in, manual capture, and library browsing

### Explicit deferrals

- article import
- background capture jobs
- AI enrichment

## Sprint 3: Constrained Enrichment

### Goal

Prove that saved seeds can become useful, structured learning objects rather than raw notes.

### Scope

- add `seed_enrichments` and related trace storage
- implement enrichment service in the API
- assemble lexical evidence before model calls
- generate:
  - gloss in context
  - register note
  - one related word
  - one contrastive word
  - one morphology note
- store prompt template versions and schema versions
- render enrichment in the seed detail view

### Recommended technology and integrations

- `OpenAI Responses API`
  - OpenAI recommends Responses for new projects.
  - It is the current default for structured, tool-using, stateful model workflows.
- `Structured Outputs`
  - Use JSON schema or Zod-backed parsing so enrichment payloads are typed and machine-checkable.
- `Merriam-Webster Dictionary + Thesaurus API`
  - Strong candidate for authoritative lexical evidence in a hobby MVP.
  - The developer center says non-commercial use is free up to 1000 queries per day per API key for up to two reference APIs.
- `Datamuse API`
  - Good as a secondary signal source for related words, collocations, and candidate contrasts.
  - Datamuse’s own docs say it lacks rich definitions and example sentences, so it should remain a candidate-sourcing tool rather than the authority layer.

### Research notes

- OpenAI’s Structured Outputs docs explicitly recommend schema-based outputs over plain JSON mode.
- The Responses API docs recommend Responses over Chat Completions for new builds.
- Merriam-Webster provides strong structured lexical content for definitions, examples, usage, and thesaurus-style relations.
- Datamuse is read-only, requires no API key, and allows substantial free usage, but its data is noisier and should be treated as candidate material rather than truth.

### Exit criteria

- enrichment jobs complete end to end for manual captures
- unsupported fields are omitted instead of fabricated
- the seed detail page shows the constrained enrichment block
- `pnpm eval:journeys` exists for the first enrichment cases

### Explicit deferrals

- giant semantic neighborhoods
- multi-step agent loops
- freeform chat tutoring

## Sprint 4: Review Engine And Scheduling

### Goal

Turn enriched seeds into meaningful practice rather than passive storage.

### Scope

- add:
  - `review_cards`
  - `review_events`
  - `review_state`
- implement first review session UI
- implement first four exercise families:
  - meaning in context
  - recognition in a fresh sentence
  - contrastive choice
  - register judgment
- implement a simple multi-skill scheduler
- record review events and update seed state

### Recommended technology and integrations

- `Railway cron jobs`
  - Use only for coarse maintenance tasks such as queue backfills, stale job cleanup, or daily summaries.
  - Do not use cron for user-triggered immediate review generation.
- `Railway private networking`
  - Useful if review generation or background processing is split into a dedicated worker service.
- `OpenAI Responses API + Structured Outputs`
  - Reuse the same schema-first discipline from enrichment for review card generation.

### Research notes

- Railway cron services must finish and exit; if a previous run is still active, Railway skips the next run.
- Railway cron has a minimum frequency of 5 minutes and does not guarantee exact execution timing, so it is a poor fit for real-time user requests.
- This makes an always-on API path or worker process the correct place for immediate review generation.

### Exit criteria

- a user can complete a short review session
- the scheduler prefers weak dimensions over already-strong recognition
- review events persist correctly
- smoke covers review completion
- at least one trace or output eval exists for review generation

### Explicit deferrals

- long-form production scoring
- spaced repetition sophistication beyond MVP needs
- collaborative or social review

## Sprint 5: Hardening And Private Alpha

### Goal

Make the MVP trustworthy enough to hand to real users without flying blind.

### Scope

- finish smoke and journey eval scripts
- add trace grading for enrichment and review generation
- add metrics and structured log export
- prepare preview and staging environments
- add a real email provider if verification or password reset is enabled
- tighten UX copy, error handling, and loading states

### Recommended technology and integrations

- `Playwright`
  - Expand from smoke to a minimal end-to-end regression suite.
- `Resend`
  - Good fit if Better Auth email verification or password reset becomes required.
  - Keep it out until you actually need email delivery.
- `Railway static hosting and PR previews`
  - Useful for review and QA once the app becomes shareable.
- `Railway custom domains`
  - Good enough for a first public or semi-public deployment.

### Research notes

- Railway static hosting supports automatic GitHub deploys, PR previews, SSL, and custom domains.
- Resend has a straightforward Node integration and is easy to call from a Hono service.
- Playwright provides traces and HTML reports out of the box, which aligns with the harness requirement for inspectable failures.

### Exit criteria

- `pnpm smoke` passes on the core user journeys
- `pnpm eval` exists and gates obvious enrichment or review regressions
- logs and error codes are actionable
- at least a few invited users can sign in, capture, review, and report issues

### Explicit deferrals

- browser extension launch
- OCR launch
- custom mobile app

## Post-MVP Candidates

These are plausible next steps after the core MVP proves demand:

- browser extension for web capture
- OCR for physical books
- richer lexical providers or licensed corpora
- import flows for articles and PDFs
- stronger scheduling heuristics
- analytics warehouse or event pipeline

### Research notes for deferred work

- Google Cloud Vision supports both `TEXT_DETECTION` and `DOCUMENT_TEXT_DETECTION`; it is the cleanest likely OCR integration once physical-book capture becomes real.
- Railway Buckets are a reasonable later option for uploaded page images or imported documents.
- OCR should remain deferred until manual capture proves that users actually want the product enough to tolerate later capture expansion.

## Recommended Sequencing Rules

- do not start Sprint 3 until Sprint 2 has one smoke-tested manual capture path
- do not start Sprint 4 until Sprint 3 proves constrained enrichment quality on a small eval set
- do not start private alpha until Sprint 5 has both smoke coverage and basic eval coverage

## Sources

- Better Auth Hono integration: https://www.better-auth.com/docs/integrations/hono
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password
- Better Auth email concepts: https://www.better-auth.com/docs/concepts/email
- Better Auth CLI: https://www.better-auth.com/docs/concepts/cli
- Better Auth PostgreSQL adapter: https://www.better-auth.com/docs/adapters/postgresql
- Railway static hosting: https://docs.railway.com/guides/static-hosting
- Railway private networking: https://docs.railway.com/networking/private-networking
- Railway public networking: https://docs.railway.com/networking/public-networking
- Railway cron jobs: https://docs.railway.com/cron-jobs
- Railway databases: https://docs.railway.com/databases
- Hono RPC: https://hono.dev/docs/guides/rpc
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started/postgresql-new
- OpenAI Responses migration guide: https://platform.openai.com/docs/guides/migrate-to-responses
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Playwright intro: https://playwright.dev/docs/intro
- Merriam-Webster developer center: https://dictionaryapi.com/
- Merriam-Webster dictionary API: https://dictionaryapi.com/products/api-collegiate-dictionary
- Merriam-Webster thesaurus API: https://dictionaryapi.com/products/api-collegiate-thesaurus
- Datamuse API: https://www.datamuse.com/api/
- Google Cloud Vision OCR: https://cloud.google.com/vision/docs/ocr
- Resend Node quickstart: https://resend.com/nodejs
