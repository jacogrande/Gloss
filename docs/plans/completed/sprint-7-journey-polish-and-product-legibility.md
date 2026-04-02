# Sprint 7 Journey Polish And Product Legibility

## Goal

Turn the latest full-journey screenshot review into a focused polish sprint that makes Gloss feel production-ready for advanced readers, not merely functionally complete.

At the end of Sprint 7:

1. first-run users should understand the full product loop immediately
2. capture should feel lighter and more directional
3. the post-save handoff should feel automatic and trustworthy
4. seed detail should read as a coherent editorial page with stronger hierarchy
5. review should communicate what is happening now, what changed, and what happens next
6. auth recovery and completion states should feel restored and intentional
7. every updated journey should be revalidated with live Playwright screenshots, smoke, and evals

## Context

This sprint is derived directly from the current visual and journey review pass:

- full live `bun run eval` run completed successfully on `2026-04-01`
- full live browser-fuzz run completed successfully on `2026-04-01`
- journey screenshots captured in:
  - [docs/reviews/assets/journeys-2026-04-01](/Users/jackson/Code/projects/gloss/docs/reviews/assets/journeys-2026-04-01)
- three UX review passes were synthesized from:
  - onboarding and capture flow screenshots
  - seed-detail and reading-layout screenshots
  - review, completion, and re-auth screenshots

Primary findings from the review set:

- the product loop is still too implicit across auth, capture, and empty states
- post-save enrichment feels manual because the `Refresh` button dominates the state
- empty states still show management chrome before there is anything to manage
- capture remains slightly heavier than the product promise
- seed-detail action placement interrupts the reading sequence
- compare/nuance content is valuable but under-emphasized
- review queue and progress indicators still require interpretation
- review feedback is clearer than before, but still not explanatory enough
- completion and re-auth states still feel mechanically correct more than emotionally resolved
- top-level utility chrome still competes with the content

This sprint should resolve the highest-value polish issues without expanding the product surface.

Primary implementation references:

- [AGENTS.md](/Users/jackson/Code/projects/gloss/AGENTS.md)
- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)
- [docs/reviews/front-to-back-review-2026-03-31.md](/Users/jackson/Code/projects/gloss/docs/reviews/front-to-back-review-2026-03-31.md)
- [docs/reviews/assets/journeys-2026-04-01](/Users/jackson/Code/projects/gloss/docs/reviews/assets/journeys-2026-04-01)

## Product Outcome

Sprint 7 should make the app feel clearer, calmer, and more intentional without making it busier.

Concrete user-facing outcomes:

- the app explains its capture -> build -> review loop in one sentence where users need it
- zero states and recovery states do not expose irrelevant controls
- capture feels like one primary action with optional depth
- seed detail reads in one clear sequence:
  - evidence
  - definition
  - nuance
  - action
- review states explain:
  - what is being practiced
  - what changed after submission
  - what the next step is
- session completion and re-auth recovery feel like deliberate product states, not raw routing outcomes

## Constraints

- Keep the current architecture:
  - `apps/web` remains a Railway-hosted SPA
  - `apps/api` remains the privileged Hono API
  - Railway Postgres remains the system of record
- Do not introduce SSR, React Router framework mode, or browser-side vendor calls.
- Do not add new AI features, new review dimensions, or new enrichment fields.
- Preserve the current minimal visual direction:
  - typography-first
  - quiet surfaces
  - content-first hierarchy
- Do not regress into decorative UI, dense chrome, or management-heavy dashboards.
- Keep live-provider `smoke`, `test:e2e:fuzzy`, and `eval` as the default validation path.
- Any screenshot-driven polish change should be backed by at least one updated browser assertion or route-level test where practical.

## Railway-Oriented Implementation Rules

Although this is a polish sprint, the behavior still needs to hold across the deployed split-origin model.

Required rules:

- any updated auth, recovery, or post-submit handoff must still behave correctly with split web/API origins
- browser paths must remain compatible with Better Auth cookie-based sessions
- any new recovery copy must map cleanly from typed API states rather than raw backend strings
- no screenshot-only polish should depend on local-only development assumptions
- hosted verification should be performed later on preview/staging if nav, auth recovery, or session restoration semantics change materially

## Functional Programming Rules

Sprint 7 should improve clarity while reducing accidental state complexity.

Required FP rules:

- keep route files thin; move wording, grouping, and state-shaping into pure presenter helpers
- derive user-facing copy from typed state, not inline JSX branches
- keep async effects isolated at route boundaries
- avoid adding more boolean drift to already-complex routes
- if a screen now has more product-state nuance, represent that with explicit unions or named view-model helpers
- prefer pure formatting helpers for:
  - first-run guidance
  - queue/session summaries
  - recovery state messages
  - button labels
  - detail-page section ordering
- avoid UI state that depends on hidden timing assumptions
- if auto-refresh or polling changes, keep the timing control isolated in one hook/helper rather than scattered across components

Practical implications:

- no new raw string literals sprinkled through multiple components for the same concept
- do not let header/account chrome logic leak into feature components
- do not inline queue math or progress text formatting in JSX
- if the weak-evidence screen needs distinct placeholder behavior, derive that from a pure recovery presenter

## Non-Goals

Sprint 7 should not spend time on:

- new model behavior
- new review exercise families
- OCR/import work
- marketing-site work
- visual rebranding
- backend topology changes
- broad state-management rewrites unless they are necessary to support the polish work cleanly

## Deliverables

By the end of Sprint 7, the repo should include:

- clearer loop copy across auth, capture, and empty states
- a lighter capture screen with lower visual weight on optional fields
- a calmer post-save pending state with auto-refresh-first behavior
- a more editorial seed-detail reading order
- a stronger compare/nuance section
- a reduced and quieter header utility treatment
- a clearer review queue summary
- richer review feedback copy or structure
- a more informative completion state
- a more explicit re-auth recovery confirmation state, if the state is user-visible
- regenerated live browser journey screenshots
- updated journey assertions or browser specs protecting the changed states

## Workstreams

### 1. Product Loop Clarity

Purpose:

- remove ambiguity about what Gloss does after a word is saved

Scope:

- add one short repeated explanation of the product loop where it is most useful:
  - sign-in / sign-up
  - capture
  - empty library
- remove or replace internal or underspecified labels like:
  - `Stage`
  - `Details`
  - `Enrichment` when a plainer phrase would be better

Implementation notes:

- keep the loop explanation in one pure copy helper shared across relevant routes
- avoid duplicating semantically similar sentences with small wording drift

### 2. Capture Simplification And Post-Save Trust

Purpose:

- make saving a word feel quick, obvious, and reliable

Scope:

- reduce the visual weight of optional fields on `/capture`
- keep the primary CTA close to the primary input
- tighten helper text so it explains outcome, not implementation
- replace the current post-save pending state from:
  - large manual refresh control
  to:
  - automatic progression / polling
  - passive loading treatment
  - quiet fallback manual refresh if needed

Implementation notes:

- preserve the current API behavior; this is mostly presentation and route-state shaping
- if pending-state logic changes, keep it isolated in one route/helper and protect it with browser assertions

### 3. Zero-State And Recovery-State Cleanup

Purpose:

- remove chrome and jargon from low-information screens

Scope:

- hide library filters and counts when the user has zero saved words
- strengthen the empty-library CTA and preview what comes next
- make weak-evidence recovery read as a guided next step, not a failed system state
- ensure placeholder text on recovery forms cannot be mistaken for stale user content

Implementation notes:

- if the sentence field on weak-evidence recovery currently uses ambiguous placeholder content, replace it with neutral placeholder text tied to the current seed state
- zero-state variants should be derived from pure helpers rather than inline branch explosions

### 4. Seed Detail Editorial Polish

Purpose:

- make the word page feel like a coherent reading artifact

Scope:

- keep evidence, definition, and nuance in one uninterrupted semantic flow
- move primary actions below the interpretive content, not between definition and compare
- improve the compare section hierarchy:
  - stronger heading
  - more breathing room
  - clearer emphasis on compared words
- strengthen metadata legibility without making the page noisy
- re-evaluate the `New` badge so it either earns its place or becomes quieter

Implementation notes:

- preserve the existing product principle:
  - evidence before interpretation
- keep any section ordering or label decisions in pure presenter helpers
- do not introduce heavy card chrome; use spacing, tone, and typographic hierarchy first

### 5. Review Queue, Feedback, And Completion Polish

Purpose:

- make review feel instructional and state-aware

Scope:

- replace raw dimension counts as the first thing users interpret with a clearer session summary
- explain what `Start review` will produce
- improve post-submit feedback:
  - clearer correctness framing
  - better “why” explanation
  - clearer state transition language
- improve completion:
  - say what changed
  - say what is due next or whether the queue is clear
  - keep one obvious next action

Implementation notes:

- queue summaries and progress labels should come from pure formatter helpers
- feedback state should stay explicit rather than derived indirectly from scattered card/session fields

### 6. Auth Recovery And Header Utility Cleanup

Purpose:

- make recovery feel deliberate while reducing non-content chrome

Scope:

- reduce the prominence of account/email text in the shell
- ensure forced re-auth return states communicate successful restoration when appropriate
- keep current sign-out/session behavior, but make recovery feel less invisible

Implementation notes:

- do not add heavy account UI
- prefer subtle confirmation and better hierarchy over banners everywhere

### 7. Harness And Review Workflow Upgrades

Purpose:

- make the polish measurable and reproducible

Scope:

- keep the journey screenshot hook in the browser fuzz harness
- regenerate screenshots after implementation
- write a new review artifact summarizing before/after polish if the delta is significant
- update browser assertions where the copy or state ordering changes
- ensure every modified journey still passes:
  - `bun run smoke`
  - `bun run test:e2e:fuzzy`
  - `bun run eval`

Implementation notes:

- screenshot capture should stay opt-in via env var
- browser assertions should stay invariant-based where live provider variability exists

## Steps

1. Implement Product Loop Clarity
   - centralize the loop explanation copy
   - simplify auth/capture/empty-library messaging
   - review with one screenshot pass before continuing

2. Implement Capture Simplification And Post-Save Trust
   - reduce capture complexity
   - replace dominant manual refresh treatment
   - update route/browser coverage

3. Implement Zero-State And Recovery-State Cleanup
   - hide empty-state chrome
   - clean up weak-evidence recovery messaging and placeholders
   - re-run the affected browser journeys

4. Implement Seed Detail Editorial Polish
   - reorder and restyle detail sections
   - improve compare hierarchy
   - validate with new ready and weak-evidence screenshots

5. Implement Review Queue, Feedback, And Completion Polish
   - improve queue framing
   - deepen feedback clarity
   - improve completion summary
   - validate with review screenshots and browser assertions

6. Implement Auth Recovery And Header Utility Cleanup
   - reduce header distraction
   - improve visible restoration cues where appropriate
   - validate re-auth journey

7. Regenerate Artifacts And Close The Loop
   - rerun live `smoke`, `test:e2e:fuzzy`, and `eval`
   - regenerate the journey screenshots
   - run screenshot-based review again if necessary
   - update docs if the user-facing product loop wording changes materially

## Validation

Required closeout validation:

- `bun run lint`
- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run test:e2e:fuzzy`
- `bun run eval`

Required visual validation:

- rerun browser journey screenshots using:
  - `PLAYWRIGHT_JOURNEY_SCREENSHOT_DIR=docs/reviews/assets/<new-folder> bun run test:e2e:fuzzy`
- compare the new image set against:
  - [docs/reviews/assets/journeys-2026-04-01](/Users/jackson/Code/projects/gloss/docs/reviews/assets/journeys-2026-04-01)
- perform at least one additional UX review pass from screenshots before declaring the sprint complete

## Risks

- live provider latency can make visual validation slower and may obscure purely UX-driven regressions
  - mitigation:
    - keep assertions invariant-based
    - use screenshot review in addition to browser assertions
- copy simplification can drift away from the product’s advanced-reader positioning
  - mitigation:
    - keep copy grounded in [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- too much polish work in one sprint can create hidden route-state complexity
  - mitigation:
    - force presenter/helper extraction as state nuance increases
- header or recovery changes may look good locally but feel different in hosted environments
  - mitigation:
    - schedule a hosted verification pass if routing or auth-recovery semantics change materially

## Exit Criteria

Sprint 7 is done when:

1. all targeted journeys feel clearer in screenshots than the `2026-04-01` baseline
2. no screenshot reviewer calls out the product loop as implicit or confusing
3. the post-save pending state no longer feels manual-first
4. the weak-evidence screen no longer risks looking like stale or cross-contaminated content
5. review queue, feedback, and completion all explain the next step clearly
6. live `smoke`, `test:e2e:fuzzy`, and `eval` all pass

## Status Log

- 2026-04-01: created from the full live screenshot review and three parallel UX review passes
- 2026-04-01: completed in code, validated with live screenshots and browser fuzz coverage, and archived after the polish work landed.
