# Product Working Brief

This is the implementation-facing product brief derived from `docs/core.md`.

## Product Shape

Gloss is a depth-first vocabulary app for advanced English readers. The core object is a `Word Seed`: a captured reading moment that grows into richer, more usable vocabulary knowledge over time.

## MVP Promise

The MVP must prove four things:

1. Users will capture words from real reading.
2. The app can turn those captures into constrained, useful lexical scaffolding.
3. Review feels more meaningful than a standard flashcard loop.
4. The product tone feels adult, calm, and intellectually serious.

## MVP Scope

Ship these first:

- manual capture with optional sentence and source metadata
- personal seed library
- constrained seed enrichment
- review queue with a small set of high-value exercise types
- basic multi-skill scheduling

Allowed MVP exercise types:

- meaning in context
- recognition in a fresh sentence
- contrastive choice between close words
- collocation choice
- register judgment
- basic morphology or family clue

## Non-Goals For MVP

Do not center the MVP on:

- giant semantic graphs
- open-ended tutor chat
- social features
- gamification loops
- broad integrations before capture quality is strong
- advanced automated scoring of long-form production

## Product Constraints

- Context is part of the product, not a garnish. Preserve source sentence and source metadata whenever possible.
- Similar words must be introduced gradually.
- AI should make a word teachable, not produce a giant knowledge dump.
- If lexical evidence is weak, the app should present less, not hallucinate more.
- Review should target the learner's weak dimension, not default back to definition recall.

## Primary MVP Journeys

1. Manual capture
   User saves a word and sentence quickly while reading.
2. Seed enrichment
   The system produces a gloss, a register note, one related word, one contrastive word, and one morphology note.
3. Review
   The user completes a short session that tests nuance, not just recognition.
4. Library
   The user browses seeds by stage and source.

## Success Metrics

Product metrics to instrument from day one:

- capture-to-review conversion
- 7-day and 30-day retention
- average reviews per saved word
- percentage of seeds that reach the "deepening" stage
- repeat capture rate from ongoing reading

Learning metrics to instrument as soon as feasible:

- distinction-task improvement
- reduction in repeated confusions
- transfer performance on fresh contexts
- completion rates by exercise type

## Source Of Truth

- `docs/core.md` is the long-form product rationale.
- This file is the shorter build brief used by agents and engineers during implementation.
