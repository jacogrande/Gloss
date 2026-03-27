# Gloss Coming Soon

Small standalone marketing site for Gloss.

## Purpose

This app is a one-page placeholder site for the product while the main
application is still under development. It should stay simple:

- one page
- no auth
- no signup form
- no backend dependency

The messaging should match the product docs:

- depth-first vocabulary
- advanced readers
- reading-linked learning
- nuance, context, contrast, and durable knowledge

## Stack

- `React`
- `Vite`
- `TypeScript`
- `bun`

## Local Development

From the repo root:

```bash
bun run --cwd apps/coming-soon dev
```

Default local URL:

```text
http://127.0.0.1:4175
```

## Build

```bash
bun run --cwd apps/coming-soon build
```

## Preview

```bash
bun run --cwd apps/coming-soon preview
```

## Typecheck

```bash
bun run --cwd apps/coming-soon typecheck
```

## Notes

- Keep the visual style minimal, polished, and restrained.
- Avoid adding product flows here. This is marketing surface, not app surface.
- If positioning changes, update this app to match `docs/core.md` and
  `docs/PRODUCT.md`.
