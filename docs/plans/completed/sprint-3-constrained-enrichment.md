# Sprint 3 Constrained Enrichment

## Goal

Turn a saved `Word Seed` into a useful, structured learning object without breaking the product's calm capture flow or the harness rules around evidence, schemas, and validation.

At the end of this sprint, Gloss should support this end-to-end product journey:

1. a user captures a seed quickly
2. the seed detail page triggers or resumes enrichment
3. the API gathers lexical evidence before any model call
4. the model returns a tightly constrained enrichment payload
5. the payload is schema-validated, persisted, traced, and rendered on the seed detail page

Sprint 3 is successful when enrichment makes the seed more teachable without turning Gloss into a noisy dictionary dump or a chat product.

## Context

This plan implements Sprint 3 from [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md). The working assumptions and constraints come from:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/Users/jackson/Code/projects/gloss/docs/ARCHITECTURE.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md)
- [docs/evals/README.md](/Users/jackson/Code/projects/gloss/docs/evals/README.md)
- [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md)

Sprint 1 and Sprint 2 already established:

- Bun workspace, typed shared contracts, and Railway-oriented deployment docs
- Better Auth session flow and ownership-checked API routes
- manual capture, library browsing, and seed detail pages
- real Playwright smoke coverage across split local web and API origins
- initial eval infrastructure for capture and HTTP boundary checks

Sprint 3 should build directly on that baseline. It should not revisit the hosting model, auth model, or SPA mode unless an enrichment-specific blocker appears.

The working stack for this sprint remains:

- `apps/web`: Vite + React + React Router 7 SPA
- `apps/api`: Hono API with Better Auth and privileged provider access
- `database`: Railway Postgres, mirrored locally by the native Postgres helper
- `data layer`: Drizzle + `node-postgres`
- `model provider`: OpenAI Responses API with structured outputs
- `lexical providers`: Merriam-Webster as the primary authority, Datamuse as a secondary candidate source
- `package manager`: `bun`

## Product Outcome

Sprint 3 should prove the third core MVP promise from [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md): saved words become constrained lexical scaffolding rather than inert notes.

Concrete Sprint 3 behaviors:

- capture remains fast and calm
- enrichment happens after capture, not inside the capture mutation
- the seed detail page clearly distinguishes:
  - captured context
  - enrichment loading state
  - enrichment failure state
  - accepted enrichment output
- enrichment output remains intentionally small:
  - one gloss in context
  - one register note only when supported
  - one related word
  - one contrastive word
  - one morphology note
- when evidence is weak, fields are omitted rather than filled with speculation

## Constraints

- Keep the current Railway deployment topology simple:
  - `apps/web` remains a static Railway-hosted SPA
  - `apps/api` remains the privileged API service
  - Railway Postgres remains the system of record
- Do not move product data reads or writes into the browser.
- All model and lexical-provider calls must stay inside `apps/api`.
- Do not add SSR, React Router framework mode, or direct browser provider access.
- Keep capture synchronous and fast. Enrichment must not slow down `POST /capture/seeds`.
- Use explicit migrations for every schema change.
- Persist prompt template versions and schema versions with every enrichment attempt.
- Validate every model output against shared schemas before persistence.
- Treat user-captured context and lexical-provider text as untrusted input.
- Keep logs and traces compact and privacy-aware. Prefer record ids, hashes, and redacted summaries over raw text where practical.
- Add eval cases for new enrichment failure modes before calling the sprint complete.

## Functional Programming Rules

Sprint 3 must preserve the current functional style instead of drifting into opaque provider wrappers or mutable orchestration objects.

Required coding rules:

- keep prompt-input assembly pure
- keep lexical evidence normalization pure
- keep output validation and DTO mapping pure
- isolate side effects in narrow modules:
  - repositories for DB access
  - provider adapters for external HTTP calls
  - route handlers for HTTP concerns
  - service functions for orchestration only
- pass dependencies explicitly into enrichment services instead of importing mutable singletons where avoidable
- represent enrichment state with typed values and stable status enums
- use shared Zod schemas as the contract boundary between repository output, service output, and API responses
- prefer immutable derived values over in-place mutation

Practical implication:

- `createEnrichmentService` should compose repositories, providers, and pure transforms
- prompt-building code should accept plain seed and evidence inputs and return a plain typed payload
- route handlers should remain thin and should not assemble prompts directly
- React components should only handle route-driven fetch state and presentation, not enrichment business logic

## Non-Goals

Do not spend Sprint 3 on:

- review session generation
- scheduler logic
- article import
- OCR flows
- browser extension capture
- giant semantic neighborhoods
- etymology generation
- multi-agent orchestration
- open-ended tutor chat
- production-grade async queue infrastructure unless synchronous trigger flow proves unworkable

## Deliverables

By the end of Sprint 3, the repo should include:

- new enrichment-oriented database tables and migrations:
  - `seed_enrichments`
  - `seed_enrichment_traces`
- shared schemas and types for:
  - enrichment status
  - enrichment payload
  - lexical evidence snapshot
  - enrichment request/response contracts
- API support for:
  - requesting enrichment for a seed
  - reading enrichment state as part of seed detail
- provider adapters for:
  - Merriam-Webster dictionary data
  - Merriam-Webster thesaurus data
  - Datamuse candidate lookup
  - OpenAI Responses structured generation
- fixture provider implementations for tests and evals
- seed detail UI showing:
  - pending enrichment
  - failed enrichment with retry affordance
  - accepted enrichment block
- structured trace persistence for enrichment attempts
- enrichment-focused smoke coverage
- enrichment-focused journey and trace evals
- updated QA and deployment notes only where Sprint 3 changes require them

## Enrichment Execution Model

Sprint 3 should keep the system Railway-friendly and operationally simple.

Recommended execution model:

1. `POST /capture/seeds` remains unchanged and returns quickly.
2. The web app navigates to `/seeds/:seedId` immediately after capture.
3. Seed detail loads the current seed plus current enrichment state.
4. If enrichment is absent or failed and the user is allowed to retry, the web app calls `POST /seeds/:seedId/enrich`.
5. The API performs enrichment in that dedicated request, not inside the capture mutation.
6. The enrichment route persists status transitions and a compact trace, then returns the current enrichment record.
7. The seed detail page refreshes or reuses the response to render the accepted enrichment block.

Why this shape is the best MVP fit:

- it preserves the "save now, enrich later" product rule
- it avoids slowing down capture
- it keeps Railway topology simple by avoiding a mandatory separate worker service in Sprint 3
- it still gives the codebase a clean seam to move to a dedicated worker later if runtime or retry pressure demands it

Fallback if this proves operationally weak:

- keep the public contract the same
- move the same service logic behind a third Railway worker service in a later sprint
- let `POST /seeds/:seedId/enrich` enqueue work instead of executing inline

## Domain Model Direction

Sprint 3 should add the minimum durable schema that supports one accepted enrichment per seed today while leaving room for future reruns and trace inspection.

### `seed_enrichments`

Purpose:

- store the current authoritative enrichment state for a seed
- expose a stable product-facing record for the seed detail page

Recommended fields:

- `id`
- `seed_id`
- `user_id`
- `status`
  - `pending`
  - `ready`
  - `failed`
- `payload`
  - JSONB typed to the shared enrichment payload schema
- `schema_version`
- `prompt_template_version`
- `model`
- `provider`
- `error_code`
- `requested_at`
- `started_at`
- `completed_at`
- `failed_at`
- `created_at`
- `updated_at`

Rules:

- keep at most one current enrichment row per seed in Sprint 3
- allow `payload` to be null unless `status = ready`
- do not store unvalidated model output here
- keep version fields required even for fixture/test runs
- keep the payload intentionally small and versioned rather than flattening dozens of columns now

### `seed_enrichment_traces`

Purpose:

- store compact debugging and eval evidence for each enrichment attempt
- preserve the facts needed to understand why an enrichment succeeded, omitted a field, or failed

Recommended fields:

- `id`
- `seed_enrichment_id`
- `seed_id`
- `user_id`
- `status`
- `schema_version`
- `prompt_template_version`
- `model`
- `provider`
- `lexical_evidence`
  - JSONB summary, not raw provider dumps
- `validation_result`
  - JSONB summary of pass/fail and issues
- `output_redacted`
  - JSONB redacted final output or refusal summary
- `guardrail_flags`
  - JSONB array or similar compact representation
- `error_code`
- `created_at`

Rules:

- traces are for debugging and evals, not for direct UI rendering
- keep traces compact enough for routine local and hosted inspection
- redact or truncate user sentence text when full text is not required
- do not log provider secrets or raw provider request bodies

## Shared Contract Direction

Sprint 3 should expand `packages/shared` first so every later layer builds against typed contracts.

New or updated schema areas should include:

- `seedEnrichmentStatusSchema`
- `seedEnrichmentPayloadSchema`
- `seedEnrichmentRelationSchema`
- `seedEnrichmentMorphologySchema`
- `lexicalEvidenceSnapshotSchema`
- `requestSeedEnrichmentInputSchema`
- `requestSeedEnrichmentResponseSchema`
- `seedDetailSchema`
  - extended with nullable enrichment state

Recommended payload shape:

- `gloss`
  - concise plain-English meaning in the captured context
- `registerNote`
  - nullable or omitted when evidence is weak
- `relatedWord`
  - one related word plus one short why-this-is-related note
- `contrastiveWord`
  - one contrastive word plus one short distinction note
- `morphologyNote`
  - one concise structural or family clue

Rules:

- every field should be independently omittable when evidence is insufficient
- do not encode support for giant synonym arrays or semantic graphs
- keep field names product-facing and stable
- parse and validate at the shared contract boundary before persistence

## Error Contract Direction

Sprint 3 should extend the stable error-code surface rather than using ad hoc provider-specific failures.

Likely new API error codes:

- `ENRICHMENT_CONFLICT`
  - enrichment already running or locked
- `ENRICHMENT_PROVIDER_ERROR`
  - provider or network failure
- `ENRICHMENT_SCHEMA_INVALID`
  - model output failed schema validation
- `ENRICHMENT_EVIDENCE_UNAVAILABLE`
  - not enough lexical evidence to produce a safe result

Rules:

- return stable user-safe codes from routes
- keep provider implementation details out of browser-visible error messages
- use the same codes in traces and eval summaries

## Provider And Adapter Strategy

Sprint 3 should use a provider-adapter layout that preserves strict typing and deterministic tests.

### Lexical Evidence Adapters

Use Merriam-Webster as the main evidence source:

- dictionary adapter for lemma, gloss candidates, usage notes, and examples
- thesaurus adapter for candidate related and contrastive words

Use Datamuse only as a secondary candidate source:

- candidate expansion
- lightweight relation hints
- never as the authority for truth claims

Rules:

- adapters return typed internal evidence objects, not raw provider JSON
- normalize provider responses immediately
- prefer empty evidence over fuzzy guesswork
- keep provider-specific parsing isolated from the rest of the service layer

### Model Adapter

Use the OpenAI Responses API with structured outputs:

- strict schema target
- one deterministic template version constant
- no freeform chat state
- no browser-visible provider access

Rules:

- prompt input should be assembled from:
  - seed word
  - captured sentence and source metadata
  - normalized lexical evidence
  - schema and allowed fields
- style and brevity instructions come last
- user sentence text stays in model input content, not in developer instructions
- fixture mode must exist for tests, smoke, and evals

### Environment Variables

Expected Sprint 3 additions:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `MERRIAM_WEBSTER_DICTIONARY_API_KEY`
- `MERRIAM_WEBSTER_THESAURUS_API_KEY`
- `ENRICHMENT_PROVIDER_MODE`
  - recommended values: `fixture` or `live`
- optional timeout tuning variables only if the first pass shows real need

Rules:

- local and CI-like validation should default to live mode when provider credentials are configured
- fixture mode should remain an explicit override for deterministic fallback coverage
- no secret should be required by the web app

## Prompt Assembly Rules

Prompt assembly should follow the architecture and security docs exactly.

Required order:

1. lexical evidence summary
2. seed capture context
3. allowed output schema
4. omission rules for unsupported fields
5. tone and brevity constraints

Required omission behavior:

- if register evidence is weak, omit `registerNote`
- if no safe contrastive candidate exists, omit `contrastiveWord`
- if morphology evidence is weak, omit `morphologyNote`

Prompt-template discipline:

- version the template explicitly, for example `seed-enrichment.v1`
- keep it deterministic and task-specific
- avoid chain-of-thought requests
- prefer one narrow task over a multi-step agent loop

## API Shape

Sprint 3 should keep the API surface compact.

Required routes:

- `POST /seeds/:seedId/enrich`
  - request enrichment for the current user's seed
  - run or resume enrichment for that seed
  - return the current enrichment state
- `GET /seeds/:seedId`
  - continue to return seed detail, now with nullable enrichment state

Optional only if implementation pressure makes it clearly worthwhile:

- `GET /seeds/:seedId/enrichment`
  - separate enrichment fetch route if polling or client ergonomics becomes simpler

Rules:

- all routes remain user-scoped through Better Auth session checks
- route handlers stay thin
- enrichment orchestration belongs in a service module
- repository ownership checks must remain explicit

## Web Route And UX Direction

Sprint 3 should preserve the current SPA route map while enriching the seed detail experience.

Required web behavior:

- `/capture`
  - still saves quickly and navigates immediately
- `/seeds/:seedId`
  - shows captured context first
  - shows an enrichment section below the captured context
  - renders one of:
    - pending enrichment
    - failed enrichment with retry
    - accepted enrichment block

Recommended detail-page UX:

- start by loading seed detail as usual
- if the seed has no ready enrichment, trigger enrichment in a route-level effect
- keep the loading UI calm and specific
- do not block the whole page behind a global loading screen once the captured seed is already available
- keep the enrichment block compact and legible

Do not do this in Sprint 3:

- dump all lexical evidence into the UI
- add a chat box
- add giant accordion sections for every possible relation

## Observability And Trace Rules

Sprint 3 should satisfy the runtime-visibility contract from [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md) and [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md).

Minimum structured log fields for enrichment routes and provider calls:

- `request_id`
- `user_id`
- `session_id`
- `journey`
  - `seeds.enrich`
- `route`
- `seed_id`
- `status`
- `latency_ms`
- `model`
- `provider`
- `schema_name`
- `guardrail_flags`
- `error_code`

Minimum trace content:

- prompt template version
- schema version
- lexical evidence summary or source ids
- provider name and model name
- validation outcome
- redacted accepted output or failure summary

## Workstreams

### 1. Shared Contracts And Error Surface

Expected outputs:

- enrichment payload schemas
- enrichment status schemas
- lexical evidence schemas
- updated seed detail contract
- new enrichment error codes

### 2. Database And Repository Layer

Expected outputs:

- migration for `seed_enrichments`
- migration for `seed_enrichment_traces`
- repository module for enrichment reads and writes
- idempotent "get or create current enrichment" behavior

### 3. Provider Adapters

Expected outputs:

- Merriam-Webster adapters
- Datamuse adapter
- OpenAI Responses adapter
- fixture adapters and deterministic fixture payloads

### 4. Enrichment Service

Expected outputs:

- pure prompt-input assembly functions
- pure output parsing and omission logic
- service orchestration for:
  - evidence gathering
  - model execution
  - schema validation
  - persistence
  - trace creation

### 5. API And Route Wiring

Expected outputs:

- `POST /seeds/:seedId/enrich`
- seed detail route response extended with enrichment state
- stable enrichment-specific error handling

### 6. Web Detail Experience

Expected outputs:

- seed detail panel enriched with pending, failed, and ready states
- route-level trigger for enrichment
- retry affordance for failed states
- no regression to capture or library flows

### 7. Validation, Smoke, And Evals

Expected outputs:

- unit tests for pure enrichment helpers
- integration tests for enrichment route and ownership
- smoke path that proves capture to enrichment to detail rendering
- journey evals for enrichment payload quality
- trace evals for evidence assembly and schema-validation invariants

## Sequence

Recommended execution order:

1. Extend shared contracts, types, and error codes.
2. Add DB migrations and enrichment repositories.
3. Add provider adapter interfaces and fixture implementations.
4. Build pure prompt/evidence assembly and output-validation functions.
5. Build the enrichment service and trace persistence path.
6. Add `POST /seeds/:seedId/enrich` and extend seed detail responses.
7. Update the seed detail UI to trigger and render enrichment.
8. Add or expand unit, integration, smoke, and eval coverage.
9. Update QA and deployment docs only where the new flow changes expectations.

This order matters because the web detail experience should be built against real contracts and stable service behavior, not guessed provider payloads.

## Steps

1. Define the enrichment contract surface in `packages/shared`.
   Deliverables:
   shared schemas for payload, status, evidence snapshot, route input/output, and new error codes.

2. Add the enrichment persistence model.
   Deliverables:
   Drizzle schema updates, SQL migrations, repository helpers, and typed DTO mappers for current enrichment plus traces.

3. Build typed provider adapters with fixture parity.
   Deliverables:
   Merriam-Webster, Datamuse, and OpenAI adapter interfaces plus fixture implementations for tests and evals.

4. Implement pure enrichment assembly functions.
   Deliverables:
   lexical evidence normalization, candidate selection, prompt input assembly, guardrail flagging, and output-mapping helpers.

5. Implement the enrichment orchestration service.
   Deliverables:
   one service that acquires the seed, gathers evidence, runs the model, validates output, persists the enrichment row, and writes a trace row.

6. Wire enrichment into the API.
   Deliverables:
   new enrichment route, updated seed detail route payload, stable route-level error handling, and structured logging.

7. Update the seed detail route and UI.
   Deliverables:
   loading state, failure state, accepted enrichment block, and retry action without regressing current capture/library behavior.

8. Expand the harness around enrichment.
   Deliverables:
   unit tests, integration tests, smoke path updates, enrichment eval datasets, trace graders, and QA doc updates.

## Detailed Implementation Notes

### Repository Rules

- keep one repository for seed reads and a separate repository for enrichment persistence if that keeps ownership clear
- repository functions should accept explicit `userId` and `seedId` where ownership matters
- do not rely on route handlers alone to prevent cross-user reads or writes

### Idempotency Rules

- multiple enrichment requests for the same seed should not create uncontrolled duplicate current rows
- if an enrichment is already `pending`, return that state instead of starting another run
- if an enrichment is already `ready`, return it unless explicit rerun semantics are added in a later sprint

### Failure Rules

- provider failure should produce a stable enrichment status and error code
- schema-invalid model output must never be persisted as accepted payload
- enrichment failure must not block the user from browsing the seed detail page

### Field-Omission Rules

- every optional field should be omitted or null because evidence is weak, never because parsing was sloppy
- omission behavior should be visible in tests and evals
- trace records should preserve why a field was omitted when practical through compact guardrail flags

## Validation

Minimum expected validation before Sprint 3 is considered done:

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run eval`
- `bun run build`

Sprint 3-specific checks that should exist by the end:

- unit tests for:
  - lexical evidence normalization
  - prompt-input assembly
  - omission logic
  - output mapping and validation summaries
- integration tests for:
  - requesting enrichment for a current-user seed
  - denying enrichment for another user's seed
  - persisting accepted enrichment payloads
  - recording failed enrichment states with stable error codes
  - extending seed detail payloads with enrichment state
- smoke path for:
  - sign in
  - capture seed
  - open seed detail
  - trigger enrichment
  - see accepted enrichment render
- eval journey cases for:
  - full evidence producing the expected compact payload
  - weak evidence causing omission instead of fabrication
  - relation selection staying limited to one related and one contrastive word
- trace eval checks for:
  - lexical evidence assembled before model call
  - schema validation runs before persistence
  - unsupported fields omitted when evidence is weak
  - stable error codes on provider or validation failure

Manual QA should confirm:

- capture still completes quickly before enrichment starts
- seed detail remains usable while enrichment is pending
- enrichment retry works after a simulated failure
- accepted enrichment renders the expected five-part block without excessive text
- library and capture flows remain stable after enrichment lands

## Risks

- provider integration complexity:
  Merriam-Webster and OpenAI parsing may add more edge cases than expected.
- latency pressure:
  inline enrichment requests may feel slow if evidence gathering and model generation are not tightly constrained.
- schema drift:
  the model output and persisted payload can diverge if versioning is not enforced from day one.
- over-generation:
  enrichment may become verbose or speculative unless omission rules are enforced aggressively.
- trace privacy:
  it is easy to log more captured text than needed during debugging.

## Mitigations

- keep provider adapters thin and covered by fixture-based tests
- keep the enrichment payload intentionally small and versioned
- use one deterministic prompt template instead of multiple overlapping prompt paths
- persist compact traces and inspect them during eval failures
- prefer omitted fields over low-confidence content
- delay a dedicated Railway worker until there is concrete evidence the inline trigger flow is insufficient

## Resolved During Execution

- Enrichment settled on an explicit pending-and-polling client experience instead of pretending every request would complete inline.
- Failed enrichment requires an explicit user-visible retry path rather than silently retrying on every revisit.
- Enrichment visibility stayed focused on seed detail during the initial rollout, with broader journey handling added later through review and polish work.

## Status Log

- 2026-03-26: created
- 2026-04-01: archived as completed after Sprint 3 shipped, live-provider hardening landed, and the remaining enrichment polish moved into later sprints.
