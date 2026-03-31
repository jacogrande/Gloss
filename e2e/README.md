# E2E And Smoke Scope

The Playwright suite should start with a tiny but high-value surface.

## Smoke First

Implement these first:

1. sign in
2. manual capture
3. enrichment on seed detail
4. library browse
5. seed detail readback

Current `bun run smoke` is the Playwright entrypoint for these flows. It should always exercise:

- the real browser
- split local web and API origins
- cookie-based auth
- the actual Vite + Hono boundary
- the detail-page enrichment trigger

Use `bun run smoke:hosted -- --web-origin <url> --api-origin <url>` when you need the fastest hosted auth/cookie check against preview or staging without starting local services.
Use `bun run test:e2e:hosted -- --web-origin <url> --api-origin <url>` for the broader hosted verification slice.

`bun run smoke:live` is the opt-in browser validation path for the same flow shape with live enrichment providers. It should only be used when `OPENAI_API_KEY`, `MERRIAM_WEBSTER_DICTIONARY_API_KEY`, and `MERRIAM_WEBSTER_THESAURUS_API_KEY` are configured.

## Test Data Principles

- use stable fixtures
- prefer explicit seed data over UI setup when it shortens the test substantially
- keep one true happy path per journey before adding edge cases

## What Not To Test In E2E

- every lexical nuance
- every layout variant
- provider-specific internals

Use unit, integration, and eval layers for those.

## Regression Coverage

`bun run test:e2e` should stay broader than smoke, but still small enough to be reliable with one shared local database.

Current regression focus:

1. sign-in and sign-up error or recovery states
2. session persistence and forced re-auth after cookie loss
3. capture validation and cross-user isolation
4. review stale-tab conflict recovery and completed-session behavior
5. hosted preview or staging verification through `bun run test:e2e:hosted -- --web-origin <url> --api-origin <url>`
