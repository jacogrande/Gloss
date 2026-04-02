# Sprint 4 Art Direction Implementation

## Goal

Apply the art direction from [docs/GLOSS_ART_DIRECTION.md](/Users/jackson/Code/projects/gloss/docs/GLOSS_ART_DIRECTION.md) to the main Gloss product UI so the app reads as a scholarly, diagrammatic reading tool instead of a soft SaaS shell.

At the end of this sprint:

1. the SPA uses a coherent paper-and-ink design kit
2. shared surfaces, type roles, labels, and controls reflect the Gloss art direction
3. the login, shell, library, capture, and seed detail routes feel like one product system
4. Playwright checkpoints provide visual proof that the implementation matches the art direction at multiple stages instead of only at the end

## Context

This sprint translates the design documents into production UI work:

- [docs/GLOSS_ART_DIRECTION.md](/Users/jackson/Code/projects/gloss/docs/GLOSS_ART_DIRECTION.md)
- [docs/STAGEHAND_AESTHETIC_REPORT.md](/Users/jackson/Code/projects/gloss/docs/STAGEHAND_AESTHETIC_REPORT.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)

The product stack and scope remain unchanged:

- `apps/web`: Vite + React + React Router 7 SPA
- `apps/api`: Hono API
- `database`: Railway Postgres
- `auth`: Better Auth
- `package manager`: `bun`

This is a presentation sprint, not a product-flow rewrite. Existing user journeys, API contracts, and test coverage should remain intact while the visual system changes.

## Constraints

- Do not introduce Tailwind, CSS-in-JS, or a new component library.
- Keep the implementation inside the existing SPA and CSS system.
- Prefer typed markup changes and shared CSS primitives over route-local styling hacks.
- Preserve current product behavior, auth flow, routing, and data contracts.
- Follow the functional style already used in the codebase: presentation changes should not leak new side effects or implicit state.
- Ignore `apps/coming-soon` for this sprint.

## Design Kit Scope

The design kit for this sprint should include:

- paper/ink/token foundation
- texture utilities and section framing
- dossier-style headings and annotation labels
- a consistent panel taxonomy
- button, field, tab, and metadata tile treatments
- stage and status markers that feel like editorial annotations instead of app pills

The design kit does not need to become a large standalone design system. It only needs the primitives the current MVP routes actually use.

## Steps

1. Establish the design foundation.
   - Replace the current glass-and-blur token set with paper, ink, graphite, ochre, oxide, folio-blue, and sage tokens.
   - Define shared type roles for editorial serif headings, UI sans copy, and annotation mono labels.
   - Add reusable texture and framing patterns:
     - ruled paper background
     - border/keyline rules
     - annotation label treatment
     - split header rows
   - Keep the CSS readable and grouped by primitives first, routes second.

2. Rebuild the shell and auth framing around the new kit.
   - Turn the shell into a dossier/workbench layout rather than a hero card.
   - Reduce marketing tone inside the authenticated app.
   - Make nav, account state, and sign-out controls feel like integrated tool chrome.
   - Update the login screen so it shares the same visual language as the authenticated app.

3. Apply the kit to library and capture.
   - Library should feel like a lexical index:
     - stronger section heading
     - clearer filter rail
     - more structured seed cards
   - Capture should feel like a worksheet or field note:
     - clearer distinction between primary capture and optional source metadata
     - stronger action area
     - better scanning on desktop and mobile

4. Apply the kit to seed detail and enrichment.
   - Seed detail should feel like a word dossier:
     - lexical head block
     - context/source evidence blocks
     - clearer metadata tiles
   - Enrichment should feel like constrained scholarly scaffolding:
     - pending, failed, and ready states share one visual language
     - ready state uses sectioned study notes, not generic cards

5. Run visual checkpoints and tighten gaps.
   - Use Playwright MCP checkpoints after the foundation/auth pass, after library/capture, and after seed detail/enrichment.
   - Compare the rendered UI to the art-direction rules:
     - paper-like surfaces
     - stronger keylines
     - literary/diagrammatic tone
     - minimal glass or blur
     - clearer hierarchy
   - Use the checkpoint results to make one final polish pass.

## Playwright Checkpoints

### Checkpoint 1: Foundation + Auth

Routes:

- `/login`
- authenticated shell frame on `/library`

Questions:

- Does the UI read as paper, ink, and annotation rather than glass and blur?
- Does the shell feel like a serious reading tool rather than a landing page?
- Do the typography roles match the art-direction doc?

### Checkpoint 2: Library + Capture

Routes:

- `/library`
- `/capture`

Questions:

- Does the library feel like an index of lexical objects?
- Does the capture form feel like a reading worksheet rather than a generic form?
- Are hierarchy and spacing tighter without becoming cramped?

### Checkpoint 3: Seed Detail + Enrichment

Routes:

- `/seeds/:seedId`
- ready, pending, and failed enrichment states as available

Questions:

- Does the page feel like a word dossier with preserved evidence?
- Do the enrichment states feel constrained and scholarly, not app-generic?
- Does the design remain calm and readable under denser content?

## Validation

- `bun run typecheck`
- `bun run build`
- `bun run test:web`
- `bun run smoke`
- Playwright MCP screenshots and visual review at each checkpoint

## Risks

- A pure CSS rewrite can become noisy if primitives and route overrides are mixed together.
- The art direction can drift into overdesigned editorial styling if texture and accents are overused.
- Stronger visual treatments can accidentally hurt responsive behavior if layout changes are not tested on narrow widths.

## Mitigations

- Keep the token system disciplined and low in count.
- Reuse a small set of panel and label primitives across routes.
- Run Playwright screenshots at desktop and mobile widths before closeout.
- Prefer structural contrast and keylines over decorative clutter.

## Status Log

- 2026-03-27: created for implementation of the new Gloss art direction on the main SPA
- 2026-03-27: implemented the paper-and-ink design kit across auth, shell, library, capture, and seed detail; reviewed with Playwright on mobile and desktop checkpoints
- 2026-03-27: pivoted away from the denser Stagehand-inspired treatment toward a quieter, content-first interface with a minimal shell and definition-led word pages
- 2026-04-01: archived as completed after later UI sprints simplified and refined the design direction further.
