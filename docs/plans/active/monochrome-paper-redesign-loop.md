# Monochrome Paper Redesign Loop

## Goal

Shift the main Gloss app away from stacked product cards and toward a quieter black-and-white, paper-like interface with gentle hand-drawn warmth.

The target outcome is:

- flatter page scaffolds
- fewer elevated surfaces
- one focal paper surface per route where appropriate
- more whitespace and calmer rhythm
- subtle SVG or line-art accents for warmth, not decoration overload
- a visual system that feels editorial, tactile, and minimal rather than boxed-in

## Context

The current app has improved substantially, but it still over-relies on card-like surfaces:

- `panel`, `seed-card`, and several route states still share the same elevated surface styles
- library, review queue, and detail secondary sections blend together because too many regions are boxed
- the palette is still slightly too cool and UI-ish for the desired “piece of paper” feel
- the user wants a more cutesy-minimal, black-and-white, lightly hand-drawn direction

This redesign loop is intentionally iterative and screenshot-driven.

## Constraints

- Keep the product calm, adult, literary, and content-first per [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md).
- Do not turn the app into a playful toy UI or children’s product.
- Keep interactions accessible and clear.
- Preserve all existing product behavior and browser flows.
- Prefer SVG/line-art accents over decorative gradients or ornamental chrome.
- Keep side effects out of the redesign work; this is primarily a web presentation pass.

## Steps

1. Flatten the surface model.
   - Make `panel` a layout primitive, not a card.
   - Remove elevated paper surfaces from library rows, notices, and secondary detail sections.
   - Keep one intentional focal surface where it helps the reading/task flow.

2. Shift the visual tokens toward paper and ink.
   - Warm the background and borders.
   - Reduce accent usage.
   - Increase whitespace and column clarity.

3. Introduce gentle hand-drawn warmth.
   - Add sparse monochrome SVG accents or divider motifs where they support the page.
   - Keep illustrations tiny and structural, not decorative clutter.

4. Review with screenshots and critique.
   - Run Playwright screenshot capture on core journeys.
   - Use at least one creative subagent per iteration to push the direction beyond “slightly flatter SaaS.”
   - Refine hierarchy, spacing, and surfaces based on the critique.

5. Validate and document.
   - Run the relevant web, smoke, and browser checks.
   - Leave a status log entry with what changed and any remaining polish debt.

## Validation

- `bun run typecheck`
- `bun run test:web`
- `bun run smoke`
- `bun run test:e2e:fuzzy`

## Risks

- Over-flattening can make the app feel unfinished instead of calm.
- Hand-drawn motifs can become noisy if they are not sparse.
- Route states may lose hierarchy if the focal paper surface is not clearly chosen.

## Status Log

- 2026-04-02: created for the monochrome paper / hand-drawn redesign loop.
- 2026-04-02: iteration 1 flattened the surface model, warmed the palette, introduced monochrome SVG doodles, and removed most dashboard-style card treatment from library, review queue, and seed-detail secondary sections.
- 2026-04-02: screenshot review drove iteration 2: quieter shell chrome, tighter page composition, structured comparison content, and a paper-corner motif for focal surfaces.
- 2026-04-02: live browser fuzz screenshots passed from `docs/reviews/assets/monochrome-paper-2026-04-02-v2/` after fixing a cloze-recall fallback bug that could leak the answer in review generation.
