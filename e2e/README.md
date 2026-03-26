# E2E And Smoke Scope

The Playwright suite should start with a tiny but high-value surface.

## Smoke First

Implement these first:

1. sign in
2. manual capture
3. library browse
4. seed detail readback

Current `bun run smoke` is the Playwright entrypoint for these flows. It should always exercise:

- the real browser
- split local web and API origins
- cookie-based auth
- the actual Vite + Hono boundary

## Test Data Principles

- use stable fixtures
- prefer explicit seed data over UI setup when it shortens the test substantially
- keep one true happy path per journey before adding edge cases

## What Not To Test In E2E

- every lexical nuance
- every layout variant
- provider-specific internals

Use unit, integration, and eval layers for those.
