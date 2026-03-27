# Frontend Rules

This document defines the SPA constraints for Gloss.

## Framework Mode Decision

Use:

- `Vite`
- `React`
- `React Router 7`

Do not use React Router framework mode or SSR for MVP. The route system should stay in SPA territory until a real need appears.

## Product Tone

The UI must feel:

- adult
- calm
- literary or academic
- precise
- high-density without being cluttered
- content-first and visually quiet

The UI must not feel:

- childish
- game-like
- novelty-driven
- visually noisy

Current UI direction:

- minimal shell chrome
- near-blank route surfaces
- typography-first hierarchy
- the word detail page should center the word and its definition before supporting metadata

See:

- [docs/GLOSS_ART_DIRECTION.md](/Users/jackson/Code/projects/gloss/docs/GLOSS_ART_DIRECTION.md) for the concrete visual system
- [docs/STAGEHAND_AESTHETIC_REPORT.md](/Users/jackson/Code/projects/gloss/docs/STAGEHAND_AESTHETIC_REPORT.md) for the external reference analysis that informed it

## Route Map

Initial route plan:

- `/`
  Landing or auth redirect
- `/login`
  Sign in
- `/capture`
  Manual capture flow
- `/library`
  Seed library and filters
- `/seeds/:seedId`
  Seed detail view
- `/review`
  Review queue and session flow
- `/settings`
  Account and data controls

## State Boundaries

- Route data should be loaded at route boundaries, not scattered across leaf components.
- UI-only state stays local.
- Cross-route client cache should be minimal and explicit.
- Do not duplicate authoritative review state in the browser if the server already owns it.

## Data Rules

- Use Better Auth client helpers for sign-in, sign-out, and session checks.
- Use Hono endpoints for all product data access, enrichment, review submission, scheduling mutations, and anything privileged.
- All network contracts should come from `packages/shared`.
- Do not put user tokens in `localStorage`. Prefer cookie-based sessions.

## Form Rules

- Capture forms must be fast to complete.
- "Save now, enrich later" is a product rule, not a fallback.
- Forms should degrade gracefully when optional context is missing.
- Error messages should be specific and calm, never vague or theatrical.

## Review UX Rules

- Review should emphasize distinction and usage, not pure definition repetition.
- Cards must stay concise.
- Do not dump all seed metadata onto a single screen.
- Introduce depth gradually over repeated encounters.

## Component Rules

- Keep route files thin.
- Organize by feature first, then by component type.
- Shared UI primitives should stay generic; product language belongs in features.
- Avoid premature design-system sprawl. Build only the primitives the MVP actually uses.

## Performance Targets

Provisional targets:

- initial authenticated route load under 2 seconds on broadband
- review card transitions feel immediate
- manual capture submission returns visible success quickly, even if enrichment continues in the background

## Accessibility Basics

- keyboard-first interaction for capture and review
- clear focus states
- readable density on mobile and desktop
- no meaning communicated by color alone
