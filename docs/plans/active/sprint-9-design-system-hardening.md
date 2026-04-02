# Sprint 9 Design System Hardening

## Goal

Turn the current ad hoc web styling into a small, explicit design system with:

- shared spacing tokens
- shared width and page-format primitives
- shared surface primitives
- shared action primitives
- cleaner hierarchy across capture, library, seed detail, and review

The outcome should be a calmer, more readable, more maintainable UI that follows the existing product tone while reducing CSS drift.

## Context

The current UI is functionally solid, but recent design review found systemic issues:

- spacing is mostly hard-coded rather than tokenized
- `panel` is used as if it were a surface primitive without a real modifier contract
- route widths and page formats are hand-tuned per screen
- typography is conceptually good but hierarchy is too flat
- semantic state color is weak
- shared actions are still coupled to feature-owned classes like `capture-form__submit`

This sprint is a frontend-system cleanup, not a product-flow rewrite.

## Constraints

- Keep the UI adult, calm, literary, and content-first per [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md).
- Do not introduce a heavy design-system framework or component library.
- Prefer a small set of reusable primitives over many special cases.
- Keep route files thin and product copy in feature presenters where possible.
- Preserve current product behavior and browser flows.
- Avoid novelty styling. This is a simplification and systematization pass.

## Steps

1. Define core tokens in `styles.css`.
   - Add spacing tokens.
   - Add width/container tokens.
   - Add semantic state tokens for info, success, warning, and danger.
   - Normalize font family tokens and supported weight tokens.

2. Define layout and surface primitives.
   - Add shared page-format classes for form, list, detail, and review layouts.
   - Add real surface primitives for primary, inset, and notice/status surfaces.
   - Add shared action-row and button primitives.

3. Refactor shell and route scaffolds.
   - Align shell content and transient banners to the same content columns.
   - Constrain capture to a real form page width.
   - Keep library as a list page, seed detail as a reading page, and review as a task page.

4. Refactor component surfaces and hierarchy.
   - Reduce phantom `panel--*` usage.
   - Rebalance headings so page titles, section titles, and annotation labels are distinct.
   - Demote metadata and status chrome where it interrupts the core reading/task flow.

5. Normalize action styling and responsive behavior.
   - Replace cross-feature reuse of `capture-form__submit` and `capture-form__secondary-link` with neutral primitives.
   - Ensure review headers and queue states collapse cleanly on smaller screens.
   - Keep interactive controls at a consistent target size.

6. Revalidate and document the remaining debt.
   - Run web, smoke, and browser validation.
   - Note any intentional leftovers that should become a follow-up rather than further churn in this sprint.

## Validation

- `bun run lint`
- `bun run harness:check`
- `bun run typecheck`
- `bun run test:web`
- `bun run smoke`
- `bun run test:e2e:fuzzy`

## Risks

- A large CSS refactor can create subtle route regressions.
- Replacing feature-owned action classes can break tests and browser flows if done partially.
- Over-correcting surfaces may make the app too flat or too sparse.

## Status Log

- 2026-04-02: created from the parallel spacing/surfaces/layout/color/hierarchy/typography review.
