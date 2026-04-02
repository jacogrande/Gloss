# Capture Definition Preview And Loading Wizard

## Goal

Make the word-capture flow feel immediate and emotionally coherent by:

- surfacing a Merriam-Webster-backed definition as soon as lexical evidence is available
- removing the current dependency on full GPT enrichment before the first useful definition appears
- replacing the flat pending state with a staged loading experience that explains what Gloss is doing and why it matters

## Context

Today the seed detail page shows a derived "dictionary definition" from the GPT contextual gloss. That means the user waits for the entire enrichment job before seeing the first useful definition, even though Merriam evidence is fetched first.

This creates two product problems:

1. the definition feels slow and opaque
2. the current loading state is text-only and emotionally flat

The product direction for this change is:

- Merriam should provide the first authoritative definition
- GPT should deepen the word in context after that
- the UI should tell a small story while loading:
  - finding the word
  - grounding it in a dictionary
  - shaping it to the captured context

## Constraints

- Keep LLM and vendor access in the Hono API only
- Preserve schema validation and grounded-output rules
- Keep the first visible definition grounded in Merriam lexical evidence
- Keep route components thin and push shaping logic into pure presenter helpers
- Avoid decorative motion without informational value
- Keep the new loading state accessible and respect `prefers-reduced-motion`

## Steps

1. Extend the enrichment contract and persistence model with a fast Merriam-backed lexical definition preview.
2. Persist that preview as soon as lexical evidence is available and expose it in seed detail responses while enrichment is still pending.
3. Refactor the seed-detail presentation so the primary definition comes from Merriam and the GPT gloss is explicitly contextual.
4. Replace the pending enrichment placeholder with a staged animated loading wizard that reflects enrichment progress.
5. Add and update unit, integration, and browser coverage for lexical preview persistence, ready/pending rendering, and loading-state behavior.
6. Validate with lint, typecheck, tests, smoke, eval, and a Playwright browser pass.

## Validation

- `bun run lint`
- `bun run harness:check`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run test:e2e:fuzzy`
- `bun run eval`

## Risks

- Schema changes can drift across shared contracts, repository persistence, and web parsing.
- A new pending-state UI can become noisy if motion is too decorative or not tied to real state.
- Preview persistence must not erase ready payloads or weaken existing failure semantics.

## Status Log

- 2026-04-02: created for Merriam-backed definition preview and staged loading UX.
