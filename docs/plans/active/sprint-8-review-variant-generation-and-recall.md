# Sprint 8 Review Variant Generation And Recall

## Goal

Make review feel less repetitive and more effortful by introducing constrained GPT-backed sentence variety and one stronger recall exercise, while keeping grading, scheduling, and persistence deterministic.

At the end of Sprint 8:

1. Gloss should support a true recall-style review card instead of relying only on choice selection
2. model-backed review cards should produce fresh, grounded example sentences with more variety
3. the review loop should stay schema-validated, traceable, and safe under live providers
4. the browser and eval harness should protect both happy paths and failure recovery for the new exercise flow

## Context

The current review loop is functionally solid, but only one exercise family, `recognition_in_fresh_sentence`, uses GPT-backed generation. The rest of the card builders are deterministic templates. That keeps the system stable, but it also makes repetition obvious and weakens the “depth-first” learning promise for advanced readers.

Current state:

- review scheduling and persistence are in place
- review submissions are currently choice-only
- `recognition_in_fresh_sentence` is the only model-backed review card path
- live-provider smoke, browser fuzz evals, and trace checks are already part of the harness

Primary references:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md)
- [docs/plans/completed/sprint-4-review-engine-and-scheduling.md](/Users/jackson/Code/projects/gloss/docs/plans/completed/sprint-4-review-engine-and-scheduling.md)

## Product Outcome

Sprint 8 should improve the quality of practice, not just the quantity of card shapes.

Concrete outcomes:

- review includes at least one effortful recall card that asks the learner to retrieve the target word
- fresh-sentence cards are more varied and less obviously templated
- GPT generation stays grounded in:
  - captured sentence
  - constrained enrichment
  - lexical contrast and register notes when available
- the UI clearly distinguishes:
  - choice-based cards
  - typed-recall cards
- feedback explains the expected answer and why it fit the context

## Constraints

- keep the current Railway-oriented split SPA/API deployment model
- keep all privileged generation and grading logic in `apps/api`
- do not introduce open-ended long-form grading or freeform tutor chat
- do not let model generation become the source of lexical truth
- preserve live-provider validation as the default harness path
- keep the current quiet, content-first UI tone

## Railway-Oriented Implementation Rules

- review card generation remains synchronous from the API for MVP-sized sessions
- no new worker or queue topology in this sprint
- card generation must remain timeout-bounded and recover cleanly under provider failure
- hosted and local browser flows must both work under split web/API origins and Better Auth cookies

## Functional Programming Rules

- keep card grading pure
- keep prompt-shaping pure
- keep typed-recall normalization pure
- isolate side effects in:
  - provider adapters
  - repositories
  - review orchestration services
  - browser route submit/load boundaries
- represent new review card shapes with explicit discriminated unions
- do not leak stringly typed exercise branching across the web layer

Practical implications:

- shared review prompt payloads and answer-key types must be updated first
- typed recall must not be hacked in as optional fields on an existing choice card
- browser presentation should derive labels and feedback from pure presenter helpers
- review trace persistence should keep enough redacted input/output context to explain model-backed sentence generation

## Non-Goals

- long-form free-response grading
- adaptive difficulty beyond the existing multi-dimension scheduler
- OCR or import expansion
- public-launch polish
- collaborative review

## Deliverables

- one new typed-recall exercise family:
  - `cloze_recall`
- stronger GPT-backed `recognition_in_fresh_sentence` generation
- a typed submission contract that supports both:
  - selected choice ids
  - typed recall answers
- review feedback that works for both card families
- trace and eval coverage for:
  - sentence freshness
  - no captured-sentence reuse
  - no answer leakage
  - typed recall grading
  - live-provider failure fallback

## Workstreams

### 1. Shared Review Contract Upgrade

Purpose:

- make typed recall a first-class review card type instead of a UI special case

Scope:

- add `cloze_recall` to `ReviewExerciseType`
- extend review prompt payload schemas with a typed recall payload
- extend answer-key and submission schemas to support:
  - choice-based answers
  - text recall answers
- update shared parser and type exports accordingly

### 2. Review Generation And Card Builders

Purpose:

- produce more varied, grounded prompts without losing determinism where it matters

Scope:

- keep `meaning_in_context`, `contrastive_choice`, and `register_judgment` deterministic
- improve `recognition_in_fresh_sentence` prompt shaping and validation
- add a model-backed `cloze_recall` generator that produces:
  - one fresh sentence with a blank
  - the target word as the expected answer
  - a short cue question
- keep a deterministic fallback for both model-backed exercise families

Rules:

- do not repeat the captured sentence
- keep sentences concise and plausible
- ground against available enrichment
- keep validation strict

### 3. Scheduling And Persistence

Purpose:

- integrate recall without corrupting the current review-state model

Scope:

- update exercise selection so recognition can graduate from:
  - `meaning_in_context`
  - to `recognition_in_fresh_sentence`
  - to `cloze_recall`
- keep distinction and usage scheduling unchanged unless the seed lacks support
- persist the new card and answer-key types cleanly in `review_cards`, `review_events`, and `review_card_traces`
- keep grading deterministic and exact enough for MVP:
  - normalize whitespace
  - normalize case
  - compare against the expected target word

### 4. Review Web UX

Purpose:

- make typed recall feel natural and low-friction

Scope:

- render a text-input card for `cloze_recall`
- keep keyboard-first submission behavior
- show clear feedback for:
  - typed answer
  - correct target word
  - explanation tied to the sentence and meaning
- preserve the existing quiet review layout

### 5. Harness, Evals, And Browser Validation

Purpose:

- make the new generation path durable and inspectable

Scope:

- add unit and integration tests for:
  - typed recall grading
  - scheduler selection
  - deterministic fallback
  - submission persistence
- add or update eval rows for:
  - fresh sentence generation
  - cloze recall generation
  - no source-sentence reuse
  - answer-key validity
- extend Playwright/browser fuzz coverage for:
  - starting a review session that includes typed recall
  - submitting a wrong typed answer
  - submitting a correct typed answer
  - provider failure fallback when model generation is unavailable

## Steps

1. Write the shared contract and schema changes.
2. Implement model-backed and fallback card builders for typed recall.
3. Update review service and repository persistence.
4. Update the web review UI and presenters.
5. Add tests and evals.
6. Run Playwright browser review with screenshots.
7. Run subagent review passes on:
   - contracts and architecture
   - review/service correctness
   - web UX and state complexity
8. Fix findings, rerun validations, and close the sprint.

## Validation

- `bun run lint`
- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run typecheck`
- `bun run test`
- `bun run test:integration`
- `bun run smoke`
- `bun run test:e2e:fuzzy`
- `bun run eval`

Required browser validation:

- start a live review session and capture one fresh-sentence card
- capture one typed-recall card
- submit one wrong typed answer and inspect feedback
- submit one correct typed answer and inspect feedback
- confirm the queue and completion states still read clearly

## Risks

- typed recall can create contract churn across shared schemas, API submission, and web parsing
- live provider generation can produce subtly invalid sentences or answer leakage
- adding a new card type can increase route complexity if it is not presenter-driven

## Mitigations

- update shared contracts first and let the compiler force the rest
- keep the new exercise family explicit and narrow
- add trace evals for model-backed review cards
- review each slice with subagents before moving on

## Status Log

- 2026-04-01: created for model-backed review variety and typed recall implementation
