# Harness Hardening

## Goal

Convert the existing Gloss harness from a mostly documented discipline into a more mechanically enforced system.

## Context

Gloss already has strong repo-local guidance:

- short `AGENTS.md`
- structured `docs/`
- active plan files
- smoke and eval scripts
- typed schemas and AI guardrails

The main remaining gap is enforcement. We want the repository to catch stale docs, missing cross-links, architectural drift, missing eval follow-up, and observability gaps automatically.

## Constraints

- Keep the current stack: `bun`, `Hono`, `React SPA`, `Railway Postgres`, `Better Auth`.
- Preserve deterministic local smoke and eval behavior.
- Prefer small scripts over large framework additions.
- Add enforcement through code, scripts, and CI, not just more prose.
- Keep docs readable; automated checks should point at the docs instead of duplicating them.

## Scope

This plan covers:

1. docs and harness validation
2. lightweight structural boundary checks
3. CI workflow automation
4. failure-to-eval tooling
5. runtime observability improvements
6. doc freshness updates where current docs are stale

It does not attempt:

- full production telemetry infrastructure
- flaky-test retry orchestration
- a full doc-gardening bot
- deep multi-agent trace infrastructure

## Deliverables

- `bun run harness:check`
  Runs repo harness validation checks.
- `bun run lint:boundaries`
  Runs lightweight structural boundary checks.
- `bun run eval:add-case`
  Scaffolds a new eval case from a documented failure.
- GitHub Actions workflow for core validation.
- Improved request/job log structure for AI-sensitive flows.
- Updated docs reflecting the new automation.

## Steps

1. Add `scripts/check-harness.ts`
   - verify required docs exist
   - verify active plans exist for long-running system work
   - verify `docs/HARNESS.md` links point to real files
   - verify `docs/QUALITY_SCORE.md` freshness is recent
   - verify eval dataset files referenced in docs exist

2. Add `scripts/check-boundaries.ts`
   - enforce `apps/web` does not import from `apps/api`
   - enforce `apps/api` does not import from `apps/web`
   - enforce shared contracts/types come from `@gloss/shared`
   - enforce route files do not import repository files directly
   - enforce services do not import route modules

3. Add `scripts/add-eval-case.ts`
   - scaffold a JSONL row into the correct dataset
   - require case id, journey, failure category, expected outcome, and rationale
   - keep it narrow and append-only

4. Improve observability
   - add richer request completion context where missing
   - include schema/provider/model metadata consistently on AI paths
   - include guardrail and validation outcome where relevant
   - ensure request ids remain exposed and stable

5. Add CI
   - run `lint`
   - run `typecheck`
   - run `test`
   - run `harness:check`
   - run `lint:boundaries`
   - run `smoke`
   - run `eval`

6. Update docs
   - `docs/HARNESS.md`
   - `docs/RELIABILITY.md`
   - `docs/QA.md`
   - `docs/QUALITY_SCORE.md`

## Validation

- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run eval`
- `bun run harness:check`
- `bun run lint:boundaries`

## Risks

- Overly strict boundary checks may create false positives.
- CI runtime may be slow because `eval` and `smoke` both reset the DB.
- Observability additions can drift into redundant logging if not kept compact.

## Status Log

- 2026-03-29: created to close the main gaps identified in the harness review against OpenAI’s harness-engineering guidance.
