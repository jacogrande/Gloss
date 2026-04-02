# Private Alpha Hosted Verification

## Goal

Close the last meaningful gap between the repo-local harness and an actual private-alpha release by verifying the deployed Railway preview and staging environments end to end.

At the end of this plan:

1. preview and staging will have recorded browser verification from the current deploy
2. hosted auth, routing, cookies, capture, enrichment, and review behavior will be proven under real origins
3. promotion to private alpha will be gated by explicit hosted evidence instead of local confidence alone

## Context

Local product and harness work from Sprint 1 through Sprint 7 is complete. The codebase, local evals, browser fuzz coverage, and docs are in a good state, but the hosted Railway environments still need explicit verification from the current deploy.

Primary references:

- [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)
- [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md)
- [docs/QA.md](/Users/jackson/Code/projects/gloss/docs/QA.md)
- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md)

## Constraints

- keep the current Railway split-origin deployment model
- do not weaken the existing local harness gates
- use live providers in hosted verification unless a concrete outage requires explicit fixture fallback
- treat staging as the real promotion gate, not preview
- keep verification evidence in-repo so future operators can see what was checked

## Deliverables

- recorded preview verification notes for the current commit
- recorded staging verification notes for the current commit
- hosted screenshots for `/login`, `/library`, `/capture`, `/seeds/:id`, and `/review`
- `bun run deploy:check-env` evidence for preview and staging
- `bun run smoke:hosted` evidence for preview and staging
- bug-to-eval follow-up for any hosted-only regressions

## Steps

1. Verify environment wiring.
   - confirm `WEB_ORIGIN`, `API_ORIGIN`, `BETTER_AUTH_URL`, and `VITE_API_BASE_URL`
   - run `bun run deploy:check-env -- --environment preview --target combined --pretty`
   - run `bun run deploy:check-env -- --environment staging --target combined --pretty`

2. Run hosted preview verification.
   - follow the preview checklist in [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)
   - run `bun run smoke:hosted -- --web-origin <preview-web-url> --api-origin <preview-api-url>`
   - capture screenshots and record notes

3. Run hosted staging verification.
   - repeat the full preview pass
   - run the staging checklist in [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)
   - run `bun run smoke:hosted -- --web-origin <staging-web-url> --api-origin <staging-api-url>`
   - capture screenshots and record notes

4. Convert any hosted-only failures into harness artifacts.
   - patch the issue
   - add the smallest durable check:
     - integration
     - Playwright
     - eval case
   - rerun the affected hosted and local gates

5. Write the closeout record.
   - record commit SHA, URLs, timestamps, and outcomes
   - mark private alpha promotion as blocked or unblocked

## Validation

- `bun run smoke:hosted -- --web-origin <preview-web-url> --api-origin <preview-api-url>`
- `bun run smoke:hosted -- --web-origin <staging-web-url> --api-origin <staging-api-url>`
- `bun run deploy:check-env -- --environment preview --target combined --pretty`
- `bun run deploy:check-env -- --environment staging --target combined --pretty`
- `bun run report:alpha --pretty` when staging or private-alpha traffic exists

## Risks

- hosted cookie or origin behavior can diverge from local expectations
- Railway preview URLs can mask routing assumptions until directly tested
- live providers can make hosted verification slower and noisier than local runs

## Mitigations

- keep hosted checks invariant-based and browser-first
- record request IDs and screenshots for every hosted failure
- turn every hosted-only regression into a local durable check before closing it

## Status Log

- 2026-04-01: created by extracting the only remaining unresolved work from Sprint 5 after local implementation and harness work were completed
