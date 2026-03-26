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

- `docs/evals/datasets/mvp_seed_journeys.jsonl`

Add a new dataset row whenever:

- a production bug escapes
- an AI hallucination is observed
- a regression slips past tests
- a new prompt template is introduced

## MVP Eval Set

The initial eval set focuses on six risks:

1. capture preserves context
2. enrichment stays constrained
3. review generation targets nuance
4. scheduler chooses the weak dimension
5. source metadata survives ingestion
6. unsupported claims are omitted

## Pass Rules

For MVP workflows:

- no critical failures in output grading
- no critical failures in trace grading
- at least `90%` pass rate on non-critical checks before broad rollout

## Cadence

- run targeted evals before merge for any AI-sensitive change
- run the full MVP eval set in CI
- review failures by category, not as a flat list
