# Architecture

This document defines the system boundaries for the MVP stack.

## Chosen Stack

- `apps/web`: Vite + React + React Router 7 in SPA mode
- `apps/api`: Hono running on Node
- `Railway`: web hosting, API hosting, worker hosting, and Postgres
- `Better Auth`: auth and session management inside the Hono API
- `packages/shared`: schemas, contracts, and common types

## Why This Split

Gloss is not an SSR-first product and it is not a chat-first agent app. The MVP is better served by:

- a fast SPA for authenticated product work
- a thin, typed API layer for privileged actions
- a SQL-backed system of record
- application-enforced authorization in one place
- controlled background jobs for enrichment and review generation

## Service Responsibilities

### Web

The SPA owns:

- auth session bootstrap via Better Auth client calls
- navigation and route-level data loading
- capture form UX
- library browsing
- review session UI
- optimistic UI where safe

The SPA does not own:

- LLM calls
- OCR calls
- lexical vendor calls
- privileged data writes
- scheduler decisions that must be authoritative

### API

The Hono API owns:

- Better Auth handlers and session lookup
- authenticated request handling
- AI prompt assembly
- lexical source aggregation
- OCR orchestration
- review generation
- scheduling mutations
- rate limiting
- audit logs and execution traces
- worker and cron endpoints

### Database

Railway Postgres owns:

- canonical user data
- seed and review state
- SQL migrations and seed fixtures
- Better Auth tables

Optional later:

- Railway Buckets or other S3-compatible storage for imported files or page images

## Initial Domain Model

These are the MVP tables or equivalent records to plan around:

- `profiles`
- `sources`
- `seeds`
- `seed_contexts`
- `seed_enrichments`
- `review_cards`
- `review_events`
- `review_state`
- `capture_jobs`
- `eval_runs`

Key rules:

- `seeds` are the durable product object.
- raw imported text is stored separately from normalized enrichment output.
- AI-generated fields should be versioned so prompts and schemas can evolve safely.

## API Surface

Suggested route groups:

- `/health`
- `/api/auth/*`
- `/capture/*`
- `/seeds/*`
- `/review/*`
- `/jobs/*`
- `/internal/evals/*`

Keep route handlers thin. Business logic belongs in services, and all request/response bodies should use shared schemas.

## Background Jobs

MVP jobs:

- `capture.enrich`
- `capture.ocr_extract`
- `review.generate`
- `source.import`

Each job must:

- accept a typed payload
- write status transitions
- emit structured logs
- persist a compact trace for AI-involved steps

## AI Boundary

Only the API may call model providers.

Prompt assembly rules:

- lexical source facts first
- user capture context second
- schema and allowed fields third
- style constraints last

The model should never be asked to invent:

- etymology without support
- large synonym clusters
- unsupported register claims
- unrelated semantic neighbors

## Data Access Pattern

For MVP:

- the web app should use Better Auth client helpers for sign-in, sign-out, and session refresh
- the web app should call the API for all product data reads and writes
- the API must enforce user ownership for every user-scoped query and mutation

This keeps the browser simple and puts authorization in one reviewable place.

## Deferred Decisions

These are deliberately postponed until the MVP proves demand:

- server-side rendering
- vector search as a primary retrieval path
- multi-agent orchestration
- collaborative features
- browser extension as a required launch dependency
