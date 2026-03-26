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

Status as of `2026-03-26`:

| Dimension | Score | Notes |
| --- | --- | --- |
| Product Alignment | 2 | Strong product spec exists in `docs/core.md` and `docs/PRODUCT.md`. |
| Architectural Clarity | 2 | Railway, Better Auth, API, and DB boundaries are now documented. |
| Type And Schema Safety | 0 | No code or schemas yet. |
| Test Coverage | 0 | No runnable tests yet. |
| Smoke Coverage | 0 | Smoke journeys are specified but not implemented. |
| Observability | 1 | Logging and trace contract defined, implementation absent. |
| Security | 1 | Security rules documented, implementation absent. |
| AI Discipline | 1 | Prompt and schema rules defined, no runtime enforcement yet. |
| Documentation Freshness | 2 | Docs are current for the chosen MVP direction. |

## MVP Merge Gate

Before calling the MVP implementation stable, target:

- no dimension below `2` for shipped user flows
- `AI Discipline` at `2` before trusting enrichment broadly
- `Smoke Coverage` at `2` before external testing
