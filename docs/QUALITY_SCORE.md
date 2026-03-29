# Quality Score

This document is the living rubric for MVP readiness. It is intentionally opinionated and should be updated as the codebase grows.

## Scoring Model

Each dimension is scored from `0` to `3`.

- `0`: missing
- `1`: partial or manual only
- `2`: solid for MVP
- `3`: strong and repeatable

## Dimensions

### Product Alignment

Does the implementation preserve the core product thesis: context-first capture, constrained depth, and adult tone?

### Architectural Clarity

Are boundaries between web, API, shared contracts, and DB still clear?

### Type And Schema Safety

Are request, response, DB, and AI output contracts typed and validated?

### Test Coverage

Do touched features have unit or integration coverage?

### Smoke Coverage

Is there at least one user-journey check proving the feature still works end-to-end?

### Observability

Do logs, traces, and error codes make failures diagnosable?

### Security

Are permissions, secrets, and untrusted-input rules respected?

### AI Discipline

Are prompts narrow, outputs schema-checked, and hallucination paths controlled?

### Documentation Freshness

Do the docs still describe the current system accurately?

## Current Baseline

Status as of `2026-03-29`:

| Dimension | Score | Notes |
| --- | --- | --- |
| Product Alignment | 2 | The current app preserves the context-first, constrained-enrichment thesis. |
| Architectural Clarity | 2 | Web, API, shared contracts, and DB boundaries are documented and now have lightweight boundary checks. |
| Type And Schema Safety | 3 | Request, response, env, DB, and AI payload contracts are typed and schema-validated. |
| Test Coverage | 2 | Unit, integration, and route-level web coverage exist for the shipped MVP flows. |
| Smoke Coverage | 2 | Playwright smoke checks cover sign-in, capture, and seed-detail readback. |
| Observability | 2 | Structured request logs, enrichment traces, stable error codes, and guardrail metadata are implemented. |
| Security | 2 | Server-side auth, user ownership checks, schema validation, and untrusted-input rules are implemented for the MVP paths. |
| AI Discipline | 2 | Enrichment is schema-first, evidence-gated, trace-backed, and eval-covered. |
| Documentation Freshness | 2 | Core docs are current and now checked by `bun run harness:check`, though ongoing freshness still depends on discipline. |

## MVP Merge Gate

Before calling the MVP implementation stable, target:

- no dimension below `2` for shipped user flows
- `AI Discipline` at `2` before trusting enrichment broadly
- `Smoke Coverage` at `2` before external testing
