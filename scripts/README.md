# Scripts Contract

This folder should hold executable helpers once the repo is scaffolded.

Suggested entries:

- `dev.ts` or workspace task wiring
- `eval-journeys.ts`
- `eval-traces.ts`
- `db-seed.ts`
- `trace-export.ts`

## Rules

- scripts must be deterministic
- scripts must return non-zero on failure
- scripts must print concise, machine-readable summaries where practical
- scripts should prefer shared schemas over ad hoc parsing

## Near-Term Goal

The current harness uses Playwright for `bun run smoke` and keeps deterministic API-level checks in the eval scripts. Do not collapse those two layers back together.
