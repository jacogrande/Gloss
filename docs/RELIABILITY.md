# Reliability

This document defines how Gloss verifies behavior and turns failures into repeatable checks.

## Principle

The harness should make it hard to ship invisible breakage. Validation should be layered:

- unit tests for pure logic
- integration tests for contracts and boundaries
- e2e tests for user journeys
- evals for AI-sensitive workflows
- structured logs and traces for debugging

## Test Pyramid

### Unit

Use for:

- scheduler heuristics
- normalization functions
- prompt input assembly
- lexical filtering logic
- schema transforms

### Integration

Use for:

- Hono handlers
- Railway Postgres-backed repository logic
- Better Auth session integration
- AI service wrappers with mocked providers
- OCR and lexical provider adapters
- background-job state transitions

### End-To-End

Use Playwright for:

- sign in
- manual capture
- library browsing
- review session completion

### Smoke

Smoke tests should be short and deterministic. They should run quickly enough to use before merge and after deploy.

## Core Smoke Journeys

The smoke suite should prove these journeys:

1. User signs in and lands in the app.
2. User manually captures a word with a sentence.
3. Enrichment completes and the seed detail shows the expected sections.
4. User completes a short review session.
5. Library filters by stage or source without errors.
6. One user cannot access another user's seed.

## Logging Contract

Every API request and job should emit structured logs with:

- `timestamp`
- `request_id`
- `job_id`
- `user_id`
- `session_id`
- `journey`
- `route`
- `status`
- `latency_ms`
- `error_code`
- `seed_id` when relevant
- `model` and `provider` for AI requests
- `guardrail_flags`

Avoid logging raw private text when a summary, record id, or hash would suffice.

## Trace Policy

Persist compact traces for AI-dependent flows:

- manual capture enrichment
- OCR extraction
- review generation

Trace records should include:

- prompt template version
- schema version
- lexical source ids
- model name
- tool or provider calls
- validation outcome
- redacted final output

## Failure Loop

Every important production failure should follow this path:

1. classify the failure
2. patch the code or prompt
3. add or update an eval case
4. rerun the relevant smoke, test, or eval set

If a bug cannot be reproduced, the harness is missing visibility.

## Release Readiness

A feature is not reliable enough for merge unless:

- its contracts are typed
- its critical path has at least one automated check
- its errors are surfaced with specific codes
- its AI path is schema-validated
- its user-scoped data paths are covered by at least one authorization test

## Provisional Targets

- capture create request succeeds or fails clearly within 3 seconds
- enrichment job completes within 30 seconds in normal conditions
- review submission round trip stays under 1 second in local and staging environments
