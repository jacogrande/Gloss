# Sprint 4 Review Engine And Scheduling

## Goal

Turn enriched seeds into a real review system that feels more meaningful than flashcards, while keeping the implementation simple enough for the current `Railway + Hono + React SPA + Railway Postgres` stack.

At the end of Sprint 4, Gloss should support this end-to-end product loop:

1. a user captures and enriches a seed
2. the system determines which review dimension is weakest or due
3. the user starts a short review session
4. the API serves a small set of typed review cards
5. the user submits answers one card at a time
6. the system records review events, updates multi-skill review state, and advances seed stage appropriately

Sprint 4 is successful when Gloss proves that review feels like depth-building practice instead of definition repetition.

## Context

This plan implements Sprint 4 from [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md). It builds on the current repo state after:

- Sprint 1 foundation
- Sprint 2 capture and library
- Sprint 3 constrained enrichment
- harness hardening and CI enforcement

The main source documents for this sprint are:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/Users/jackson/Code/projects/gloss/docs/ARCHITECTURE.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md)
- [docs/evals/README.md](/Users/jackson/Code/projects/gloss/docs/evals/README.md)
- [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md)

Important product constraints from the source material:

- review must emphasize distinction and usage, not just recognition
- review should target weak dimensions instead of repeating already-strong recognition
- similar words should be introduced gradually
- AI should produce constrained, teachable cards rather than verbose knowledge dumps
- the MVP should support 4-6 exercise types, but the first implementation can stay intentionally narrow

There is already a separate design execution note in [sprint-4-art-direction-implementation.md](/Users/jackson/Code/projects/gloss/docs/plans/active/sprint-4-art-direction-implementation.md). That file is a UI polish track, not the roadmap Sprint 4. This plan is the actual roadmap Sprint 4 execution document.

## Product Outcome

Sprint 4 should prove the third MVP promise from [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md): review feels more meaningful than a standard flashcard loop.

Concrete product behaviors for this sprint:

- the user can open `/review` and see a calm, concise queue state
- the user can start a short server-authored session with `3-5` cards
- the first review implementation supports four high-value exercise families:
  - meaning in context
  - recognition in a fresh sentence
  - contrastive choice
  - register judgment
- every card can be answered quickly with keyboard-first interaction
- answer submission updates durable review state immediately
- seed stage can move from `new` toward `stabilizing`, `deepening`, and `mature` based on review evidence
- the system prefers weaker dimensions over already-strong basic recognition

## Constraints

- Keep the current deployment topology:
  - `apps/web` remains a Railway-hosted SPA
  - `apps/api` remains the privileged Hono API
  - Railway Postgres remains the system of record
- Do not add SSR, React Router framework mode, or browser-side privileged scheduling logic.
- Do not make Railway cron a dependency for immediate review generation.
- All review state must remain server-authoritative.
- Use explicit migrations for every new table or state shape.
- Review card generation must be schema-driven and versioned.
- Review generation and submission must expose stable error codes and structured logs.
- Keep sessions short. The first review flow should optimize for clarity and completion, not endless queues.
- Preserve the current product tone:
  - adult
  - calm
  - content-first
  - visually quiet

## Railway-Oriented Runtime Strategy

Sprint 4 should stay Railway-oriented and operationally conservative.

Recommended runtime model:

1. the SPA requests queue state from the API
2. the user explicitly starts a review session
3. the API selects seeds, builds cards, persists the session, and returns the first card set inline
4. the SPA submits card answers one by one
5. the API records events and updates review state transactionally
6. the SPA advances immediately without waiting on cron or a separate worker

Why this is the right Railway fit:

- user-triggered review needs immediate responses, not delayed cron execution
- the current topology already supports privileged orchestration inside the API
- the scheduler is lightweight enough to keep inline for MVP
- this preserves a clean seam for a dedicated worker later if latency becomes unacceptable

Railway cron should remain optional and coarse in this sprint. Valid future cron uses:

- stale review session cleanup
- summary materialization
- nightly maintenance or analytics backfills

Invalid Sprint 4 cron uses:

- starting user sessions
- grading answers
- selecting the next card during an active session

## Functional Programming Rules

Sprint 4 must preserve the repo’s current functional direction.

Required coding rules:

- keep scheduler heuristics pure
- keep exercise-selection logic pure
- keep card payload normalization pure
- keep submission grading pure
- keep state-transition math pure
- isolate side effects in narrow modules:
  - repositories for DB access
  - provider adapters for AI or lexical lookups
  - services for orchestration
  - route handlers for HTTP concerns only
- pass dependencies explicitly into review services instead of importing mutable singletons
- use typed discriminated unions for review card types and review submission payloads
- persist only schema-validated card payloads and schema-validated event payloads
- prefer immutable derived state over in-place mutation

Practical implication:

- `selectDueReviewTargets(...)` should be pure
- `buildReviewCardDrafts(...)` should be pure once its inputs are already loaded
- `gradeReviewSubmission(...)` should be pure and deterministic for each card type
- `applyReviewOutcomeToState(...)` should be pure and return the next persisted state snapshot
- the orchestration service should mostly do:
  - load
  - select
  - validate
  - persist

## Non-Goals

Sprint 4 should not spend time on:

- long-form production scoring
- collaborative review
- social features
- broad gamification
- adaptive difficulty beyond a simple multi-skill heuristic
- giant semantic neighborhoods
- advanced schedule optimization or ML-driven sequencing
- background queue infrastructure unless inline session creation proves unworkable
- morphology or collocation as first-class review families if the first four card types are not yet solid

## Deliverables

By the end of Sprint 4, the repo should include:

- new review-oriented database tables and migrations:
  - `review_states`
  - `review_sessions`
  - `review_cards`
  - `review_events`
- shared contracts and types for:
  - queue summary
  - review session summary
  - review card payloads
  - review submission inputs
  - review submission results
  - review dimension state
- API routes for:
  - reading queue state
  - starting a review session
  - reading an active session
  - submitting an answer for a review card
- a first review session UI under `/review`
- at least one AI-backed review generation path using structured outputs
- deterministic fallback or template paths where AI is unnecessary
- review-specific smoke coverage
- review-specific output and trace evals
- updated QA and deployment notes only where Sprint 4 changes require them

## Review Model

### Supported Exercise Families

Sprint 4 should implement exactly these four exercise families first:

1. `meaning_in_context`
   - prompt asks what the target word means in the original or lightly adapted sentence
   - primary learning dimension: `recognition`

2. `recognition_in_fresh_sentence`
   - prompt presents a fresh sentence using the target word
   - user confirms or selects the right meaning
   - primary learning dimension: `recognition`

3. `contrastive_choice`
   - prompt asks the user to choose between the target word and a nearby contrastive or related word
   - primary learning dimension: `distinction`

4. `register_judgment`
   - prompt asks which usage feels off-register or more appropriate
   - primary learning dimension: `usage`

These are the right first four because they match the roadmap, align with [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md), and cover the MVP thesis without overextending into production scoring.

### Multi-Skill State

The first scheduler should track three dimensions per seed:

- `recognition`
- `distinction`
- `usage`

Why only three:

- it is enough to prove the multi-skill thesis
- it maps cleanly to the first four card families
- it avoids over-modeling before real session data exists

Morphology and collocation can be layered in later once the first review loop is stable.

### Stage Progression

Seed stage should become partly review-driven in Sprint 4.

Recommended transition logic:

- `new`
  - seed exists but has little or no successful review evidence
- `stabilizing`
  - user has passed at least one recognition-oriented review
- `deepening`
  - user shows successful distinction or usage evidence, not just recognition
- `mature`
  - user maintains stable performance across multiple sessions and dimensions

The exact thresholds should remain simple and versioned. Do not hide this behind opaque scoring formulas.

## Review Generation Strategy

Sprint 4 should use a hybrid card-generation model.

### Deterministic Cards First

Use template or deterministic generation for:

- meaning-in-context cards based on captured sentence plus enrichment gloss
- simple register-judgment cards when enrichment already contains a supported register note

### AI-Backed Cards Where It Adds Value

Use `OpenAI Responses API + Structured Outputs` for:

- recognition in a fresh sentence
- contrastive choice cards that require careful distractor framing
- register-judgment variants when deterministic evidence is too rigid

AI rules:

- cards must be generated from lexical evidence and existing enrichment, not from freeform invention
- if evidence is too weak, the API should omit unsupported card types and fall back to safer ones
- every AI-generated card payload must be validated against a shared schema before persistence
- prompt template version and schema version must be stored with generated cards or traces

## Domain Model Direction

### `review_states`

Purpose:

- store the current authoritative review status for one `seed + user`
- drive scheduler decisions and seed stage updates

Recommended fields:

- `id`
- `seed_id`
- `user_id`
- `recognition_score`
- `distinction_score`
- `usage_score`
- `recognition_due_at`
- `distinction_due_at`
- `usage_due_at`
- `last_reviewed_at`
- `last_session_id`
- `scheduler_version`
- `created_at`
- `updated_at`

Rules:

- one row per `seed_id + user_id`
- scores stay intentionally small and interpretable
- due times are explicit, not hidden in opaque blobs
- scheduler version is stored so heuristics can evolve safely

### `review_sessions`

Purpose:

- group a short run of cards into a user-visible review session
- provide completion and interruption boundaries

Recommended fields:

- `id`
- `user_id`
- `status`
  - `active`
  - `completed`
  - `abandoned`
- `card_count`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Rules:

- sessions are short and explicit
- only one active session per user in MVP
- abandoned sessions should be resumable or safely replaceable, not duplicated invisibly

### `review_cards`

Purpose:

- persist the concrete cards served in a session
- make review reproducible, traceable, and testable

Recommended fields:

- `id`
- `review_session_id`
- `seed_id`
- `user_id`
- `position`
- `exercise_type`
- `dimension`
- `status`
  - `pending`
  - `answered`
  - `skipped`
- `prompt_payload`
  - JSONB validated by shared schema
- `answer_key`
  - JSONB validated by shared schema
- `generation_source`
  - `template`
  - `model`
- `prompt_template_version`
- `schema_version`
- `model`
- `provider`
- `created_at`
- `updated_at`

Rules:

- cards are immutable once served, except for answer status fields
- prompt and answer payloads remain compact and typed
- do not persist raw unvalidated model output here

### `review_events`

Purpose:

- record each answer or skip as an audit event
- provide durable inputs for reliability checks and later metrics

Recommended fields:

- `id`
- `review_session_id`
- `review_card_id`
- `seed_id`
- `user_id`
- `exercise_type`
- `dimension`
- `outcome`
  - `correct`
  - `incorrect`
  - `partial`
  - `skipped`
- `response_payload`
  - JSONB validated by shared schema
- `response_latency_ms`
- `state_delta`
  - compact JSON summary of score or due-date changes
- `created_at`

Rules:

- each submission creates an event
- event payloads must be typed and compact
- event history is append-only

## API Surface

Sprint 4 should introduce a dedicated `/review/*` route group.

Recommended routes:

- `GET /review/queue`
  - returns queue summary and whether an active session exists
- `POST /review/sessions`
  - starts or resumes a session
  - selects seeds
  - builds cards
  - persists the session
- `GET /review/sessions/:sessionId`
  - returns current session state and remaining cards
- `POST /review/sessions/:sessionId/cards/:cardId/submit`
  - validates answer payload
  - records event
  - updates review state transactionally
  - returns next-card pointer and updated session summary

Potential helper route:

- `POST /review/sessions/:sessionId/abandon`
  - optional if the UI needs explicit session exit semantics

Route rules:

- route handlers stay thin
- ownership and active-session checks stay server-side
- submissions must be idempotent enough to survive client retries safely
- every route emits stable `journey` names and request metadata

## Service Decomposition

Recommended API modules:

- `repositories/review-state-repository.ts`
- `repositories/review-session-repository.ts`
- `repositories/review-card-repository.ts`
- `repositories/review-event-repository.ts`
- `services/review-scheduler.ts`
  - pure target selection and prioritization
- `services/review-card-service.ts`
  - pure card draft construction plus constrained provider orchestration
- `services/review-session-service.ts`
  - orchestration for start/resume/submit
- `lib/review-contracts.ts`
  - pure schema-adjacent transforms and guardrail logic

Recommended pure functions:

- `selectDueTargets(...)`
- `rankTargetsByWeakness(...)`
- `chooseExerciseType(...)`
- `buildMeaningCard(...)`
- `buildContrastiveCardPrompt(...)`
- `gradeCardSubmission(...)`
- `applyOutcomeToReviewState(...)`
- `deriveSeedStageFromReviewState(...)`

## Web UX Direction

Sprint 4 should keep the review UI sparse and fast.

Recommended route shape:

- `/review`
  - queue summary
  - start or resume CTA
- `/review/:sessionId`
  - active session view

If route proliferation feels unnecessary, the first implementation can keep the session flow under `/review` with internal state, but the API model should still be session-oriented.

UI rules:

- one card at a time
- very little chrome
- keyboard-first input where possible
- immediate transition after submit
- strong hierarchy:
  - target word or sentence
  - question
  - answer choices or response input
  - brief result state
- no giant metadata panels during active review
- keep explanatory copy short and calm

## Session Construction Rules

The first session builder should stay simple:

- target `3-5` cards per session
- prefer due or weak seeds first
- avoid serving multiple highly confusable contrastive cards back to back unless the session is intentionally distinction-heavy
- avoid overrepresenting one seed in a single short session
- if card generation for one seed fails, continue with a safe fallback card or skip that seed cleanly

Recommended first-pass scheduler heuristics:

1. filter to seeds with ready enrichment
2. prefer seeds with overdue weakest dimensions
3. prefer `new` or `stabilizing` seeds for basic recognition
4. prefer `deepening` seeds for distinction and usage tasks
5. cap repeated exercise families within one short session

## AI And Trace Policy

Review generation is AI-sensitive and must follow the same discipline as enrichment.

Required Sprint 4 trace behavior:

- persist compact traces for AI-generated review cards
- include:
  - `prompt_template_version`
  - `schema_version`
  - `seed_id`
  - `review_session_id`
  - `exercise_type`
  - `model`
  - `provider`
  - `validation_outcome`
  - `guardrail_flags`
- avoid storing raw private user text when a redacted or summarized form is enough

If a card cannot be generated safely:

- log a stable error code
- persist a compact trace
- either fall back to a deterministic card type or omit the unsafe card entirely

## Evaluation Strategy

Sprint 4 should add both output and trace coverage.

### Unit Tests

Use for:

- scheduler ranking
- exercise-family selection
- grading functions
- state-transition math
- stage derivation

### Integration Tests

Use for:

- session start and resume flows
- ownership enforcement
- transactional answer submission
- repository persistence for `review_states`, `review_sessions`, `review_cards`, and `review_events`
- provider-backed card generation with fixture adapters

### Web Tests

Use for:

- queue state rendering
- session step-through
- keyboard interaction
- recoverable error states

### Smoke

Add at least one smoke journey:

1. sign in
2. ensure a seed with ready enrichment exists
3. open `/review`
4. complete a short session
5. verify session completion and updated queue or stage state

### Evals

Add at least:

- `review_journeys.jsonl`
  - output invariants for each supported card family
- `review_trace_checks`
  - trace coverage for AI-generated review cards

Every escaped review-generation or scheduler bug should become an eval row using `bun run eval:add-case`.

## Steps

1. Extend shared contracts and types
   - add review enums, payload schemas, request/response contracts, and typed parser support

2. Add database schema and migrations
   - create `review_states`
   - create `review_sessions`
   - create `review_cards`
   - create `review_events`
   - add any required indexes and uniqueness constraints

3. Implement pure scheduler and grading modules
   - target selection
   - exercise selection
   - score updates
   - seed stage derivation

4. Implement repositories and orchestration service
   - session start/resume
   - card persistence
   - answer submission transaction

5. Implement review card generation
   - deterministic card builders
   - constrained model-backed card builders where needed
   - compact trace persistence for AI-generated cards

6. Implement API routes
   - queue
   - session start/resume
   - session read
   - answer submission

7. Implement the `/review` UI flow
   - queue state
   - active card state
   - session completion state
   - keyboard-first interaction

8. Add validation and harness coverage
   - unit tests
   - integration tests
   - web tests
   - smoke
   - output evals
   - trace evals
   - QA doc updates

## Validation

- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run test:e2e`
- `bun run eval`

Sprint 4 is not complete unless:

- a short review session works end to end
- review submission updates durable state correctly
- smoke covers a real review journey
- at least one review-generation eval and one trace check exist
- queue and session flows remain functional under split local web/API origins

## Risks

- Review-state design can become overengineered if too many dimensions or exercise families are introduced at once.
- AI-generated card payloads can drift into verbosity or unsafe distractors if schemas are too loose.
- Session start latency may grow if too much card generation happens inline.
- Review stage logic can become confusing if thresholds are hidden or unstable.
- Active-session edge cases can create duplicate cards or duplicate submissions if idempotency is weak.

## Mitigations

- keep only three review dimensions in MVP
- start with four exercise families, not six
- prefer deterministic card builders unless AI adds clear value
- use explicit transactions for answer submission
- store scheduler version and card schema version
- keep session size intentionally small
- if inline generation becomes too slow, preserve the public contract and move generation behind a worker later

## Open Questions

- Should the first session UI support explicit resume of an unfinished session, or should starting a new session implicitly replace stale active work?
- Should `review_states` use explicit per-dimension columns or a typed JSONB subdocument if a fourth dimension is likely soon after Sprint 4?
- Should the first review cards show correctness immediately after each answer, or only at session end for some exercise families?

## Status Log

- 2026-03-29: created as the roadmap Sprint 4 execution plan for the review engine and basic multi-skill scheduling.
