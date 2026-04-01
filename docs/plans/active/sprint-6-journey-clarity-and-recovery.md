# Sprint 6 Journey Clarity And Recovery

## Goal

Turn the front-to-back audit into a focused hardening sprint that makes Gloss easier to understand, easier to recover in, and more obviously aligned with its core product promise: depth-first vocabulary for advanced readers grounded in real reading context.

At the end of Sprint 6:

1. first-run users should know what to do next immediately after auth
2. capture should feel faster and lighter
3. seed detail should foreground evidence before interpretation
4. review should teach, not just advance state
5. auth loss, empty states, and weak-evidence cases should recover cleanly
6. the new behaviors should be protected by browser tests, smoke coverage, and at least one new eval or trace case where relevant

## Context

This plan is derived directly from:

- [docs/reviews/front-to-back-review-2026-03-31.md](/Users/jackson/Code/projects/gloss/docs/reviews/front-to-back-review-2026-03-31.md)
- the Playwright MCP browser pass on `2026-03-31`
- the parallel UX and functionality reviewer findings from the same audit

Current product baseline:

- capture, enrichment, library, and review are implemented end to end
- `bun run smoke` passes
- `bun run eval` passes
- the app is functionally usable, but several key journeys still leak implementation shape instead of product clarity

Most important review findings to address in this sprint:

- review discards correctness feedback after submission
- seed detail overstates AI output and understates captured evidence
- capture is heavier than the product’s low-friction promise
- first-run and empty-state journeys end in dead ends
- thin-context capture has no recovery path
- auth expiry and deep-link recovery remain brittle
- queue and review progress language are more system-shaped than learner-shaped

Primary source documents for implementation:

- [AGENTS.md](/Users/jackson/Code/projects/gloss/AGENTS.md)
- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)

## Product Outcome

Sprint 6 should make the private-alpha product feel materially more self-explanatory without expanding scope into a new product tier.

Concrete user-facing outcomes:

- after auth, users immediately see a meaningful next step
- empty library and empty review states become actionable, not passive
- capture feels like one primary action with optional extra structure
- seed detail reads as:
  - reading evidence first
  - generated scaffolding second
  - next action third
- review becomes a real learning loop with answer feedback and a clearer sense of progress
- weak evidence does not trap users in a dead end

## Constraints

- Keep the current Railway-oriented deployment model:
  - `apps/web` remains a Railway-hosted SPA
  - `apps/api` remains the privileged Hono API
  - Railway Postgres remains the system of record
- Do not introduce SSR, React Router framework mode, or browser-side vendor calls.
- Do not add new AI product surface area. This sprint is about clarity, recovery, and product legibility.
- Preserve the minimal, content-first visual direction. Fix hierarchy and grouping without regressing into noisy UI.
- Keep all privileged mutation paths in `apps/api`.
- Keep live-provider `smoke` and `eval` as the default merge gates. Use fixture mode only as an explicit fallback.
- Any new escaped failure discovered during implementation must become a test, smoke case, or eval artifact before the sprint closes.

## Railway-Oriented Implementation Rules

Sprint 6 is mostly a product and UX sprint, but it still needs to stay aligned with the deployed architecture.

Required rules:

- Any new recovery or edit path must go through the Hono API, not direct browser-side DB access.
- Any auth recovery behavior must remain compatible with Railway-hosted split origins and Better Auth cookie behavior.
- Any new empty-state or deep-link behavior must work the same in local, preview, staging, and production-like Railway environments.
- Any new browser-path assumptions should be validated in:
  - local Playwright smoke
  - at least one hosted verification pass later if the implementation changes redirect or cookie behavior

Likely API additions:

- a typed seed-update path for sentence/source recovery if thin-context capture is made editable
- clearer auth failure mapping where the UI currently receives raw backend or contract errors

## Functional Programming Rules

Sprint 6 should improve UX without creating a more entangled UI state model.

Required FP rules:

- Treat each major route as a small state machine with explicit, typed states instead of ad hoc boolean combinations.
- Keep view-model shaping pure:
  - empty-state variants
  - review progress labels
  - learner-facing copy from internal enums
  - definition/context normalization
  - seed-detail evidence ordering
- Keep route components thin:
  - fetch/load
  - submit mutations
  - map typed results into presentation states
  - render
- Keep side effects isolated in:
  - repositories for DB access
  - services for orchestration
  - provider adapters for vendors
  - route components for user-triggered load/submit boundaries
- Avoid hidden temporal coupling in the web layer.
  - Prefer discriminated unions or narrow route state objects over multiple independent booleans and refs.
- Centralize user-facing error mapping in pure helpers so the UI never renders raw schema or contract failures.
- If a review submission now shows feedback before advancing, separate:
  - server result data
  - current card state
  - post-submit feedback state
  rather than mutating one broad route object in place.

Practical implications:

- replace raw string-based review or auth failures with typed display states
- move filter-label formatting and route copy derivation into pure presenter helpers
- if seed editing is added, keep validation and normalization in pure shared or feature-level helpers
- if first-run routing depends on seed counts or session metadata, compute the decision from a pure route-decision helper

## Non-Goals

Sprint 6 should not spend time on:

- new enrichment capabilities
- new exercise families
- OCR or extension work
- public marketing work
- a broader visual redesign unrelated to clarity and hierarchy
- changing the hosting topology

## Deliverables

By the end of Sprint 6, the repo should include:

- a first-run onboarding path that does not strand new users in a passive library
- improved empty states for:
  - library
  - review queue
  - thin-context or failed enrichment
- a simplified capture flow with secondary source metadata treatment
- a seed-detail page that foregrounds reading context and clearly labels generated scaffolding
- a clear next action on seed detail once enrichment is ready
- review answer feedback before the session advances
- clearer review progress language
- safer auth-expiry and deep-link behavior
- stronger error-copy mapping so raw backend/schema strings never reach the user
- new browser and/or integration coverage for the recovered journeys

## Workstreams

### 1. First-Run And Empty-State Recovery

Purpose:

- remove the biggest dead ends in the product

Scope:

- decide the post-auth first-run destination:
  - route first-time users to `/capture`
  - or keep `/library` and add a strong primary CTA
- split library zero-state into:
  - truly empty library
  - filtered-to-zero results
- add clear next actions in empty review states
- rewrite passive copy so every empty state answers:
  - what happened
  - why
  - what to do next

Implementation notes:

- derive empty-state variants from pure helpers instead of branching inline inside route JSX
- if first-run routing is conditional, keep the route decision pure and test it separately

### 2. Capture Simplification And Recovery

Purpose:

- make capture feel fast and forgiving

Scope:

- demote source metadata behind a disclosure, secondary step, or lower-emphasis block
- mark optional fields explicitly
- improve the post-submit handoff so users understand:
  - seed saved
  - enrichment is running
  - what to do next
- add a recovery path for thin-context seeds:
  - likely `edit seed context/source`
  - or a stronger `add context` CTA from failed enrichment

Likely implementation path:

- add a typed `PATCH /seeds/:seedId` or equivalent API mutation
- keep update validation in a pure transform/helper
- add integration coverage for ownership and partial update behavior

### 3. Seed Detail Evidence-First Refactor

Purpose:

- align the word page with the product philosophy in [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)

Scope:

- move sentence and source evidence higher in the reading order
- demote or relabel generated content as scaffolding
- fix the dictionary-definition cleanup so contextual phrasing does not leak into the main definition
- make weak-evidence enrichments visibly weaker
- add a direct next action:
  - review this word
  - capture another word
  - add context

Implementation notes:

- keep definition/context formatting in pure presenter helpers
- avoid embedding text-rewrite heuristics inline in JSX
- if the data model needs a cleaner separation of `dictionaryDefinition` vs `contextualGloss`, keep the mapping versioned and typed

### 4. Review Feedback And Progress Clarity

Purpose:

- turn review into a learning loop rather than a silent state transition

Scope:

- preserve the submission result in the client instead of discarding it
- introduce a post-submit feedback state with:
  - correctness
  - correct answer
  - brief rationale or explanation if available
  - `Continue`
- resolve the queue/progress mismatch:
  - `3 due` vs `Card 1 of 4`
- translate learner-facing labels from internal enums or taxonomy
- improve completion so it suggests a next action, not just `Review again`

Implementation notes:

- use an explicit review route state model:
  - queue
  - active card awaiting answer
  - feedback
  - complete
- do not manage feedback through loosely related booleans
- prefer pure label and progress helpers for all learner-facing copy

### 5. Auth And Deep-Link Recovery

Purpose:

- make protected-route behavior robust enough for private alpha

Scope:

- preserve intended destination across login
- handle real auth loss consistently across:
  - library
  - seed detail
  - review
- distinguish transient refresh failures from real unauthorized state
- ensure session expiry cannot leave the user stranded in a protected shell with raw errors

Implementation notes:

- centralize re-auth routing and message mapping
- keep session parsing and session display-state derivation in one place
- add explicit browser tests for:
  - direct deep-link to protected route while anonymous
  - cookie loss or forced sign-out while inside the app

### 6. Harness And Coverage Upgrades

Purpose:

- convert the audit into durable protections

Required additions:

- Playwright or browser-level coverage for:
  - new-user post-auth flow
  - empty library CTA
  - filtered library zero-state
  - thin-context recovery
  - wrong-answer review feedback
  - deep-link through login
  - forced re-auth after session loss
- smoke updates if any of the above become core-path behavior
- at least one new eval or trace check if the sprint changes:
  - weak-evidence enrichment recovery
  - review result/feedback semantics
- if raw contract errors were observed in review, add a regression check that ensures the mapped user-facing error stays calm and generic

## Steps

1. Stabilize the journey model.
   - inventory every route state affected by the audit
   - define explicit target states and copy decisions before touching JSX

2. Fix onboarding and empty-state recovery.
   - implement first-run path
   - split empty-library variants
   - improve empty review queue copy and CTA behavior

3. Simplify capture and add thin-context recovery.
   - demote optional source fields
   - add or wire the recovery/edit path
   - ensure ownership and validation remain typed and isolated

4. Refactor seed detail to be evidence-first.
   - lift sentence/source
   - relabel generated content
   - fix dictionary-definition normalization
   - add a clear next action

5. Refactor review into explicit queue/card/feedback/complete states.
   - keep server result data
   - show correctness feedback
   - clarify progress and completion

6. Harden auth and deep-link behavior.
   - preserve return targets
   - unify unauthorized handling
   - remove raw error leakage

7. Convert the audit into coverage.
   - add targeted tests
   - update smoke if core flows changed
   - add at least one new eval or trace artifact where appropriate

8. Run the full relevant gate set and update docs.
   - QA doc if the user journey changed materially
   - review docs if new artifacts or screenshots are useful

## Validation

Minimum required before closing the sprint:

- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run test:web`
- `bun run test:integration`
- `bun run smoke`
- `bun run test:e2e`
- `bun run eval`

Required manual or MCP browser checkpoints:

- new-user auth -> meaningful next step
- empty library -> clear CTA
- filtered library zero-state -> clear filter recovery
- capture -> save -> understandable pending state
- weak-context or failed enrichment -> meaningful recovery path
- seed detail -> evidence first, scaffolding second
- review queue -> clearer effort framing
- wrong review answer -> correctness feedback before continue
- deep-link to protected page -> login -> return to intended route

## Risks

- adding seed editing or recovery could sprawl into a larger CRUD refactor if not kept tight
- improving review feedback could entangle state unless the route model is made explicit first
- auth/deep-link work can regress hosted split-origin behavior if not validated carefully
- changing copy and hierarchy without updating smoke/e2e can make the harness noisy

Mitigations:

- keep each workstream behind small, typed helpers and thin route components
- add browser coverage as soon as each recovered journey lands
- avoid mixing visual refactor and behavioral refactor in one unbounded diff
- preserve Railway-compatible auth/origin assumptions and validate redirect behavior early

## Exit Criteria

Sprint 6 is complete when:

- a brand-new user is never dropped into a dead end without a next step
- capture has a clearly primary path and a viable weak-context recovery path
- seed detail visibly grounds itself in user evidence before generated scaffolding
- review submissions produce user-visible learning feedback
- protected deep links survive login and auth recovery correctly
- no raw schema/contract error text reaches the user in core flows
- the new journey expectations are protected by smoke, tests, or evals

## Status Log

- 2026-03-31: created from the front-to-back review and parallel UX/functionality reviewer findings
