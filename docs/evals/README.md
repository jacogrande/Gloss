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
- `docs/evals/datasets/mvp_seed_journeys.jsonl`

Add a new dataset row whenever:

- a production bug escapes
- an AI hallucination is observed
- a regression slips past tests
- a new prompt template is introduced

## MVP Eval Set

The current implemented eval set focuses on capture and boundary risks:

1. capture preserves context
2. source metadata survives ingestion
3. product routes expose split-origin CORS correctly
4. request ids and stable error codes survive unhappy paths

The longer `mvp_seed_journeys.jsonl` file remains the forward-looking dataset for Sprint 3+ AI and review workflows. Until those systems exist, `bun run eval:journeys` should target `capture_journeys.jsonl`, and `bun run eval:traces` should grade HTTP boundary invariants instead of pretending real AI traces already exist.

## Pass Rules

For MVP workflows:

- no critical failures in output grading
- no critical failures in trace grading
- at least `90%` pass rate on non-critical checks before broad rollout

## Cadence

- run targeted evals before merge for any AI-sensitive change
- run the full MVP eval set in CI
- review failures by category, not as a flat list
