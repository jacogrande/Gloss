# Post-Sprint 8 Full System Review

## Goal

Run a broad system review after Sprint 8, fix the concrete defects or weak code that fall out of that review, and leave the repo in a clean, validated state.

## Scope

- architecture and boundary review
- functional-programming and coupling review
- harness, browser, and product-quality review
- UX resilience review for loading, retry, outage, and recovery states
- targeted fixes only where findings are concrete and reproducible

## Constraints

- keep changes small and local
- prefer pure helper extraction over widening mutable route/service state
- do not reopen completed sprint scope unless a review finding proves it necessary
- keep the validation contract green before closing the work

## Workstreams

### 1. Architecture Review

- inspect service/repository boundaries
- inspect provider-mode and runtime wiring
- inspect persistence invariants and migration safety

### 2. FP And Code Smell Review

- inspect state shaping and discriminated unions
- inspect hidden temporal coupling and duplicated logic
- inspect parsing and normalization boundaries

### 3. Harness And Journey Review

- inspect smoke/eval/browser coverage for missed edge cases
- inspect trace visibility and failure surfacing
- inspect user-journey regressions that are likely to escape code-only review

### 4. UX Resilience Hardening

- add an app-level unavailable or reconnecting state when bootstrap session reads fail
- preserve stale route data on recoverable fetch failures and expose explicit retry actions
- strengthen seed-detail pending and weak-evidence recovery states
- tighten loading copy and mutation feedback so users always know what is happening next

## Steps

1. Spawn three focused review subagents.
2. Consolidate findings and discard weak or duplicate complaints.
3. Fix the strongest validated issues first.
4. Fix route-level loading, retry, and outage UX where the review proves it weak.
5. Re-run lint, typecheck, tests, smoke, browser journeys, and evals.
6. Commit only if the worktree is clean and green.

## Validation

- `bun run lint`
- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run test:e2e:fuzzy`
- `bun run eval`

## Status Log

- `2026-04-01`: Plan created for the post-Sprint-8 review/fix pass.
- `2026-04-02`: Expanded to include full loading/error-state UX resilience hardening after browser audit.
