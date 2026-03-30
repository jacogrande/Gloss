# Private Alpha

This document defines how Gloss moves from local confidence to a small invited cohort without relying on memory or ad hoc triage.

## Core Contract

Private alpha is allowed only when:

- `bun run harness:check` is green
- `bun run lint:boundaries` is green
- `bun run lint` is green
- `bun run typecheck` is green
- `bun run test` is green
- `bun run test:integration` is green
- `bun run smoke` is green
- `bun run test:e2e` is green
- `bun run eval` is green
- preview and staging browser checks have been completed from the current deploy

Use `bun run report:alpha --pretty` after seeding or after real alpha usage to inspect the current typed product-event snapshot.

## Promotion Path

Gloss promotes in this order:

1. local
2. preview
3. staging
4. private alpha

Rules:

- preview is for fast verification only
- staging is the real promotion gate
- production-like alpha rollout does not happen directly from preview
- the API deploy must run `bun run db:migrate` before staging or private-alpha promotion

## Preview Checklist

Run this against the current Railway preview deploy.

1. Open `/login`, `/library`, `/capture`, `/review`, and one direct `/seeds/:id` URL in a new tab.
2. Confirm the SPA handles direct-link routing instead of returning a static-hosting 404.
3. Sign in and refresh on `/library`.
4. Sign out and confirm protected routes return to `/login`.
5. Capture one seed and confirm the resulting detail page loads under the split web/API origins.
6. Confirm one CORS-backed API path succeeds from the browser:
   `library`, `capture`, or `review`.
7. Confirm the deployed API version can read the migrated schema without startup or route failures.

Record:

- preview web URL
- preview API URL
- commit SHA
- timestamp
- pass/fail notes

## Staging Checklist

Run this against the stable staging environment before any new alpha rollout.

1. Repeat the full preview checklist.
2. Confirm cookies are secure, HTTP-only, and survive a browser refresh.
3. Confirm `WEB_ORIGIN`, `API_ORIGIN`, `BETTER_AUTH_URL`, and `VITE_API_BASE_URL` all match the staging environment.
4. Confirm one capture, one enrichment, and one review session complete successfully.
5. Run the browser checklist in [docs/QA.md](/Users/jackson/Code/projects/gloss/docs/QA.md) against staging.
6. Capture screenshots for `/login`, `/library`, `/capture`, `/seeds/:id`, and `/review`.
7. Review the latest `bun run report:alpha --pretty` output if staging contains real alpha traffic.

Staging is only green when auth, capture, enrichment, and review all behave correctly under the deployed origins and cookies.

## Issue Intake

Every invited-user issue should be captured in this format:

```md
Title:
Environment: preview | staging | private-alpha
Timestamp:
Route or URL:
User-visible impact:
Expected:
Actual:
Steps to reproduce:
Visible error code or message:
Seed ID / review session ID / request ID:
Screenshot or screen recording:
Notes:
```

Rules:

- never ask users for passwords or raw cookies
- prefer request IDs, seed IDs, review session IDs, and timestamps over pasted private content
- trim screenshots before sharing if they include private reading material

## Bug-To-Eval Loop

No escaped bug is considered closed until it lands in the harness.

Required triage order:

1. reproduce the issue locally or from a deployed environment
2. capture the request ID, route, and user-visible error
3. patch the code or configuration
4. add the smallest durable automated check:
   - unit test for pure logic bugs
   - integration test for auth, DB, provider, or route-contract bugs
   - Playwright spec for browser-only failures
   - eval row through `bun run eval:add-case` for AI or workflow regressions
5. rerun the narrowest relevant gates
6. update docs if the operator workflow changed

Use:

- `bun run eval:add-case --print-template --dataset enrichment`
- `bun run eval:add-case --print-template --dataset review`
- `bun run report:alpha --pretty`

## Operator Notes

- keep fixture-mode smoke and evals as the default merge gate
- use live-provider browser checks only when a provider-path change justifies them
- if alpha onboarding does not require password reset or email verification, keep email infrastructure deferred
