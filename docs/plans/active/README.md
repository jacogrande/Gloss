# Active Plans

Use this folder only for work that is genuinely still in flight.

Create or update a plan here when the task:

- spans more than one subsystem
- changes schemas or data flow
- touches AI behavior
- introduces a background job
- is likely to take more than 30 minutes
- still has unresolved implementation or operational work

When a plan is complete:

1. add a closeout note in its `Status Log`
2. resolve or explicitly answer any open questions
3. move it to `docs/plans/completed/`
4. leave only the still-real follow-up work in `active/`

## Plan Template

```md
# <plan name>

## Goal

## Context

## Constraints

## Steps

1. ...
2. ...
3. ...

## Validation

- ...

## Risks

- ...

## Status Log

- 2026-03-26: created
```

Plans should be self-contained. Do not assume the next agent has hidden context.
