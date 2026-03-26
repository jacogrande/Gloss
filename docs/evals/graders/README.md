# Graders

These grader definitions describe what the future eval runner must enforce.

## Output Graders

### Enrichment Payload

Fail if any of the following occur:

- required fields are missing
- schema validation fails
- more than two related terms are produced for MVP
- etymology appears without supporting evidence
- tone is verbose, childish, or generic

### Review Card

Fail if:

- the exercise type does not match the requested skill
- the prompt collapses into plain definition recall when a distinction task was requested
- more than one answer appears correct
- the explanation contradicts lexical evidence

### Scheduler Decision

Fail if:

- the selected focus ignores the weakest dimension
- the scheduler falls back to recognition despite stronger weaknesses elsewhere

## Trace Graders

### Enrichment Trace

Pass only if the trace shows:

- lexical evidence was gathered before model invocation
- a versioned schema was attached to the request
- the response was validated before persistence
- unsupported fields were dropped or omitted

### Job Trace

Pass only if the trace shows:

- the job status changed through valid states
- logs include request or job ids
- failures recorded stable error codes

## Severity

- `critical`: user-facing correctness or privacy failure
- `major`: degraded product behavior or missing guardrail
- `minor`: stylistic or low-risk deviation

Critical failures should block release and merge for affected flows.
