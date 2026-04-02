# Post Sprint 2 Hardening

## Goal

Harden the Sprint 1 and Sprint 2 implementation so the documented Railway deployment model works, the validation harness exercises the real web/API boundary, and the current codebase is easier to evolve into Sprint 3 without accumulating avoidable complexity.

## Context

Three independent reviews surfaced the same broad themes:

- the split-origin Railway deployment is not currently validated end to end
- the current CORS policy is too narrow for the product routes
- deployment docs describe a service layout that does not match the Bun workspace shape
- smoke validation is too in-process and misses browser/network issues
- several small correctness and maintainability issues will become more expensive in Sprint 3

This hardening pass touches:

- `apps/api`
- `apps/web`
- `scripts`
- `e2e`
- `docs`

It should preserve the current MVP scope while improving robustness and keeping the harness honest.

## Constraints

- keep the current stack:
  - `Railway`
  - `Railway Postgres`
  - `Hono`
  - `React SPA`
  - `Better Auth`
  - `bun`
- do not introduce SSR
- prefer explicit, typed boundaries over framework magic
- keep smoke coverage small but real
- add evals that match current product maturity rather than pretending AI workflows already exist

## Steps

1. Fix the real production/runtime defects:
   - expand CORS coverage to product routes
   - harden client error handling for malformed non-JSON responses
   - handle sign-out failures explicitly
2. Reduce drift and duplication:
   - add a reusable API runtime composition helper
   - use it from server startup, tests, and scripts
   - remove stale Sprint 1-only UI paths that are no longer part of the routed app
3. Make smoke test the real boundary:
   - add Playwright config and a real browser smoke journey
   - reset local DB before smoke/e2e runs
   - run web and API as separate local processes with fixed cross-origin URLs
4. Add eval coverage that matches current scope:
   - implement `eval:journeys` for capture/library persistence behavior
   - implement `eval:traces` for HTTP boundary invariants like CORS, request IDs, and stable error codes
   - keep outputs machine-readable and category-based
5. Align docs and deployment guidance:
   - fix Railway service instructions to match the Bun workspace
   - update QA/eval docs to reflect the new smoke/eval flow

## Validation

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun run eval`
- `bun run smoke`
- `bun run test:e2e` if smoke and config are stable enough to justify the longer pass

## Risks

- Playwright smoke adds more moving parts and may require browser installation on the local machine
- deployment doc fixes must stay pragmatic and avoid overfitting to one Railway workflow
- eval scripts should not become a second test suite with different expectations

## Status Log

- 2026-03-26: created
