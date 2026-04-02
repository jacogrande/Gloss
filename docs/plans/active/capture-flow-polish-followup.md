# Capture Flow Polish Follow-Up

## Goal

Polish the Merriam-first capture flow after the screenshot review so the product feels faster, warmer, and more self-explanatory without changing the core architecture.

## Context

The latest browser screenshot review surfaced five recurring issues:

1. capture still undersells context and makes weak-evidence recovery feel avoidable only in hindsight
2. the seed-detail handoff is trustworthy but still reads as a blocking workflow
3. the loading wizard explains work, but does not feel progressive enough
4. weak-evidence recovery needs a clearer diagnosis and stronger recovery CTA
5. review queue, feedback, and completion language are still slightly too system-shaped

The underlying Merriam preview architecture is already correct. This pass should stay on the presentation side: pure copy/presenter helpers, thin route changes, and minimal UI composition changes.

## Constraints

- Keep Merriam-Webster as the first visible definition source.
- Preserve the current side-effect boundaries; do not move API behavior into the web app.
- Favor pure presenter helpers over scattered inline string changes.
- Do not reintroduce busy UI chrome; keep the app minimal and content-led.

## Steps

1. Tighten capture framing.
   - Make sentence/source clearly recommended for best results.
   - Keep the base save action lightweight, but remove “only if it helps” language.
   - Make recovery copy consistent with the capture promise.
2. Warm up the seed-detail handoff.
   - Bring the saved sentence/source closer to the word header.
   - Refine the loading wizard into a clearer progress story.
   - Add explicit reassurance that users can leave the page while Gloss continues.
3. Clarify weak-evidence recovery.
   - Replace vague failure wording with a specific diagnosis.
   - Make the corrective action dominant and obvious.
4. Humanize review language.
   - Make queue effort and outcome clearer before starting.
   - Make feedback teach more and sound less mechanical.
   - Make completion feel like progress, not a system summary.
5. Refresh tests and browser coverage.
   - Update web tests for the new copy and hierarchy.
   - Re-run smoke and browser journey coverage.

## Validation

- `bun run lint`
- `bun run harness:check`
- `bun run typecheck`
- `bun run test`
- `bun run smoke`
- `bun run test:e2e:fuzzy`

## Risks

- Copy drift across tests:
  keep string changes centralized in presenter helpers when possible.
- Handoff hierarchy regression:
  preserve the Merriam-first definition while moving context closer to the top.
- Overwriting the minimal visual style:
  keep changes typographic and structural, not decorative.

## Status Log

- 2026-04-02: created from the capture-flow screenshot review.
