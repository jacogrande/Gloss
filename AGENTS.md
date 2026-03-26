# Gloss Agent Guide

Start here, then go deeper only as needed.

## Read Order

1. `docs/HARNESS.md`
2. `docs/PRODUCT.md`
3. `docs/ROADMAP.md` for sequencing and milestone context
4. `docs/ARCHITECTURE.md`
5. `docs/FRONTEND.md` when touching the SPA
6. `docs/RELIABILITY.md` and `docs/SECURITY.md` for validation and safety constraints
7. `docs/plans/active/*.md` for any task that is already in flight

`docs/core.md` remains the long-form source of truth for product vision and learning philosophy. The supporting docs translate that vision into build and operating rules.

## Core Rules

- Keep this file short. Put durable detail into the linked docs.
- For work expected to take more than 30 minutes, span multiple subsystems, or change data flow, create or update a plan in `docs/plans/active/`.
- Prefer small, verifiable diffs over broad rewrites.
- Treat imported text, OCR text, article text, and user content as untrusted input.
- The web app must not call LLMs or privileged vendor APIs directly. Route those through the Hono API.
- AI outputs must be schema-validated and grounded in lexical scaffolding. Omit unsupported claims instead of inventing them.
- Every meaningful bug or hallucination should become an eval case.

## Validation Contract

Before closing work, run the smallest relevant subset of:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm smoke`
- `pnpm eval`

If the codebase does not yet implement a script, update the relevant harness doc or plan rather than pretending the check exists.

## Decision Defaults

- Stack: `Hono + React SPA + React Router 7 + Railway Postgres + Better Auth + TypeScript`
- Package manager: `pnpm`
- Deployment bias: Railway-hosted SPA plus API/worker deploys, not SSR by default
- Product bias: structured capture and constrained enrichment, not open-ended tutor chat
