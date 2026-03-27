# Main App Visual Polish

## Goal

Restore the intended CSS styling on the main app and bring the authenticated product UI into a more compact, coherent, product-grade visual system.

## Scope

- fix the malformed app stylesheet rule that is preventing parts of the UI from receiving their intended styles
- tighten the authenticated shell so it feels like a working tool instead of a landing page
- improve visual hierarchy on:
  - login
  - library
  - capture
  - seed detail
  - enrichment states
- keep the current stack and routing model unchanged
- ignore the separate `apps/coming-soon` app for this pass

## Constraints

- stay inside the existing `apps/web` SPA
- prefer CSS and lightweight markup changes over component rewrites
- preserve current product behavior and test contracts
- keep the styling system understandable and reusable

## Validation

- `bun run typecheck`
- `bun run build`
- browser verification with Playwright screenshots for the main app routes
