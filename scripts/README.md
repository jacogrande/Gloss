# Scripts Contract

This folder should hold executable helpers once the repo is scaffolded.

Suggested entries:

- `dev.ts` or workspace task wiring
- `smoke.ts`
- `eval.ts`
- `fixtures-seed.ts`
- `trace-export.ts`

## Rules

- scripts must be deterministic
- scripts must return non-zero on failure
- scripts must print concise, machine-readable summaries where practical
- scripts should prefer shared schemas over ad hoc parsing

## Near-Term Goal

When the actual app scaffold is added, wire the package scripts in `package.json` to these responsibilities rather than letting script names drift.
