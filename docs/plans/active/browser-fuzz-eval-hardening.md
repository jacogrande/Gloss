# Browser Fuzz Eval Hardening

## Goal

Extend the Gloss harness so every documented user journey has deterministic browser-level fuzz coverage in the default eval path.

## Context

Gloss already has:

- local Playwright smoke coverage
- a broader private-alpha regression spec
- output and trace eval scripts
- a committed front-to-back journey review in `docs/reviews/`

The gap is that the browser layer is still example-driven instead of inventory-driven. We want one typed journey manifest that:

- names every user journey we care about
- runs browser checks against each journey
- uses slightly varied but deterministic inputs
- plugs into `bun run eval`

## Constraints

- keep the current stack and Railway-oriented split-origin assumptions
- keep default browser fuzz runs deterministic and fixture-backed
- avoid cross-test state leakage by using per-journey users instead of mutating the shared demo account where possible
- keep the suite serial and stable

## Deliverables

- a typed browser-journey manifest in `e2e/support/`
- a Playwright `@journey-fuzz` spec that covers every documented journey
- a new `bun run eval:browser` script
- `bun run eval` updated to include browser fuzz coverage
- harness and eval docs updated so the browser fuzz layer is part of the contract

## Journey Inventory

The browser fuzz layer should cover:

1. unauthenticated protected entry
2. sign-up onboarding handoff
3. empty library recovery
4. capture submission
5. populated library browse
6. seed-detail handoff after capture
7. ready seed detail readback
8. weak-evidence recovery
9. review queue
10. active review plus feedback
11. review completion
12. forced re-auth deep-link recovery

## Validation

- `bun run test:e2e -- --grep @journey-fuzz`
- `bun run eval`
- `bun run harness:check`

## Status Log

- 2026-04-01: created to close the gap between documented journey inventory and automated browser-level harness coverage.
- 2026-04-01: implemented typed browser journey inventory, manifest-driven `@journey-fuzz` Playwright coverage, and wired `bun run eval` to include `bun run eval:browser`.
