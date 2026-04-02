# Live Validation Hardening

## Goal

Fix the live enrichment path so real OpenAI and Merriam validation can run
successfully, and make the smoke/eval harness distinguish live-provider
expectations from deterministic fixture expectations.

## Context

Live validation exposed two issues:

1. The OpenAI Structured Outputs schema is invalid because optional fields are
   exported directly into strict JSON Schema.
2. The browser smoke and eval harness still assume fixture-specific enrichment
   outputs such as exact related and contrastive words.

## Constraints

- Keep the app-facing enrichment payload omission-based.
- Keep fixture mode deterministic for everyday regression checks.
- Improve live diagnostics without leaking secrets into logs.

## Steps

1. Add an OpenAI-only structured-output schema with required nullable fields and
   normalize that shape back into the app payload.
2. Improve live provider diagnostics so raw upstream failure details are visible
   in logs and traces.
3. Split fixture and live smoke/eval expectations so live validation checks
   stable invariants instead of exact fixture strings.
4. Run fixture validation plus live smoke/eval verification.

## Validation

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run eval`
- `bun run smoke:live`
- `ENRICHMENT_PROVIDER_MODE=live bun run eval`

## Risks

- Live vendor outputs may still differ enough that exact lexical-value checks
  remain brittle.
- Structured-output schema changes must stay aligned with the app-facing Zod
  payload contract.

## Status Log

- 2026-03-27: created
