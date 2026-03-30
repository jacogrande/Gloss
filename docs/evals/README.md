# Eval Plan

Gloss needs both product evals and agentic workflow evals. These evals are part of the harness, not an optional ML sidecar.

## Eval Categories

### Output Evals

These check whether a single workflow result is acceptable.

Use for:

- seed enrichment payloads
- review card generation
- scheduler decisions
- OCR normalization outputs

### Trace Evals

These check whether the workflow behaved correctly, not just whether the final answer looked plausible.

Use for:

- whether lexical sources were assembled before the model call
- whether schema validation ran
- whether unsupported fields were omitted
- whether a failure recorded the right error code

## Dataset Files

- `docs/evals/datasets/capture_journeys.jsonl`
- `docs/evals/datasets/enrichment_journeys.jsonl`
- `docs/evals/datasets/enrichment_journeys_live.jsonl`
- `docs/evals/datasets/review_journeys.jsonl`
- `docs/evals/datasets/mvp_seed_journeys.jsonl`

Add a new dataset row whenever:

- a production bug escapes
- an AI hallucination is observed
- a regression slips past tests
- a new prompt template is introduced

Default path:

- use `bun run eval:add-case --print-template --dataset enrichment` to print a scaffold
- append the new row with `bun run eval:add-case --dataset ... --category ... --id ... --journey ... --input ... --expected ... --note ...`
- supported datasets are `capture`, `enrichment`, `enrichment-live`, `review`, and `mvp`

When you add a case:

- use `category` for the failure family, not the exact symptom
- keep `note` focused on the escaped bug, hallucination, or regression this row protects against
- prefer stable expected invariants over brittle exact phrasing

## Current MVP Eval Set

The current implemented eval set focuses on capture, enrichment, review, and boundary risks:

1. capture preserves context
2. source metadata survives ingestion
3. enrichment returns the expected compact payload for strong evidence
4. weak evidence causes omission instead of fabrication
5. failed enrichment persists a stable failed state
6. review queues exclude failed enrichments
7. review sessions persist typed cards and complete cleanly
8. review submissions append durable events and update scheduler-versioned review state
9. product routes expose split-origin CORS correctly
10. request ids, schema versions, and stable error codes survive boundary and trace checks

The longer `mvp_seed_journeys.jsonl` file remains the forward-looking dataset for later review-generation work. For the current implementation:

- `bun run eval:journeys` should run `capture_journeys.jsonl`, `enrichment_journeys.jsonl`, and `review_journeys.jsonl`
- `bun run eval:traces` should run HTTP boundary checks, persisted enrichment trace checks, and persisted review trace checks

When `ENRICHMENT_PROVIDER_MODE=live` is enabled for targeted vendor checks:

- `bun run eval:journeys` should swap to `enrichment_journeys_live.jsonl`
- live output evals should validate stable invariants, not exact fixture words
- live trace evals should validate guardrails against the lexical evidence snapshot rather than fixture-specific omissions
- review evals remain deterministic around persisted session/card/event/state behavior, even when live enrichment is enabled

## Pass Rules

For MVP workflows:

- no critical failures in output grading
- no critical failures in trace grading
- at least `90%` pass rate on non-critical checks before broad rollout

## Cadence

- run targeted evals before merge for any AI-sensitive change
- run the full MVP eval set in CI
- review failures by category, not as a flat list
- treat every escaped AI bug as incomplete until it exists in a dataset file
