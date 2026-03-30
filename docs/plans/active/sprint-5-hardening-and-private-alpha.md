# Sprint 5 Hardening And Private Alpha

## Goal

Make the current MVP trustworthy enough to hand to a small set of real users without losing visibility, corrupting state, or relying on ad hoc local knowledge.

At the end of Sprint 5, Gloss should support a disciplined private-alpha loop:

1. deploy reliably to Railway preview and production-like environments
2. validate the app through deterministic smoke, broader Playwright coverage, and eval gates
3. observe capture, enrichment, and review behavior through structured logs, compact traces, and basic product metrics
4. handle known failure cases cleanly in the UI and API
5. turn every escaped bug or hallucination into a tracked harness artifact

Sprint 5 is successful when a small invited cohort can sign in, capture, enrich, review, and report issues while the team can reproduce and classify failures quickly.

## Context

This plan implements Sprint 5 from [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md). It builds on the repo state after:

- Sprint 1 foundation
- Sprint 2 capture and library
- Sprint 3 constrained enrichment
- Sprint 4 review engine and scheduling
- harness hardening and CI enforcement

Primary source documents for this sprint:

- [docs/HARNESS.md](/Users/jackson/Code/projects/gloss/docs/HARNESS.md)
- [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- [docs/ROADMAP.md](/Users/jackson/Code/projects/gloss/docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](/Users/jackson/Code/projects/gloss/docs/ARCHITECTURE.md)
- [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md)
- [docs/FRONTEND.md](/Users/jackson/Code/projects/gloss/docs/FRONTEND.md)
- [docs/RELIABILITY.md](/Users/jackson/Code/projects/gloss/docs/RELIABILITY.md)
- [docs/SECURITY.md](/Users/jackson/Code/projects/gloss/docs/SECURITY.md)
- [docs/QA.md](/Users/jackson/Code/projects/gloss/docs/QA.md)
- [docs/evals/README.md](/Users/jackson/Code/projects/gloss/docs/evals/README.md)
- [docs/core.md](/Users/jackson/Code/projects/gloss/docs/core.md)

Important product and harness constraints that carry into this sprint:

- the MVP remains a structured capture, enrichment, and review product, not a chat product
- all privileged logic stays in `apps/api`
- Railway remains the default hosting model
- fixture-mode smoke and evals remain the default merge gates
- live-provider validation remains opt-in and separate
- every meaningful escaped failure should become a smoke, test, or eval artifact

## Current Baseline

The current repo already has:

- typed capture, enrichment, and review flows
- fixture-mode journey evals and trace evals
- Playwright smoke coverage for sign-in, capture, enrichment, library, and review
- CI gates for harness checks, linting, typecheck, tests, smoke, and evals

Current baseline observed on `2026-03-29`:

- `bun run harness:check`: passing
- `bun run eval`: passing
- `bun run smoke`: failing in one repeat-run scenario because `bun run db:reset` is not yet fully idempotent for seeded auth users and can hit Better Auth duplicate-email writes

This is a good Sprint 5 starting point: the harness exists, but the app is not yet private-alpha-safe because parts of the local and deploy story still rely on lucky state.

## Product Outcome

Sprint 5 should prove the fourth MVP promise from [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md): the product feels adult, calm, and operationally trustworthy enough for real invited use.

Concrete product outcomes:

- invited users can sign in and complete the full core loop without manual operator intervention
- auth, capture, enrichment, review, and library states fail clearly and recover cleanly
- staging and preview deployments are easy to verify through browser-based checklists
- the team can answer basic questions about usage and failures with logs and metrics instead of guesswork
- the release process is constrained by the harness rather than memory

## Constraints

- Keep the current deployment topology:
  - `apps/web` remains a Railway-hosted SPA
  - `apps/api` remains the privileged Hono API
  - Railway Postgres remains the source of truth
- Do not introduce SSR, React Router framework mode, or browser-side privileged data access.
- Do not add third-party analytics or observability products unless the hosted primitive is clearly insufficient.
- Do not add new end-user-facing product surface area unless it directly closes a hardening or private-alpha gap.
- Keep fixture-mode smoke and evals deterministic enough to run in CI.
- Any live-provider checks must remain explicitly opt-in.
- Preserve the current UI direction:
  - minimal
  - content-first
  - low-noise
- Preserve the current functional direction:
  - pure transforms and schedulers remain pure
  - side effects stay isolated in routes, services, repositories, and provider adapters

## Railway-Oriented Hardening Strategy

Sprint 5 should stay Railway-oriented and operationally conservative.

Recommended environment model:

1. `local`
   native local Postgres, fixture-mode smoke/evals, optional live-provider validation
2. `preview`
   Railway GitHub preview deploys for both web and API with attached preview database
3. `staging`
   a stable Railway environment that mirrors production env wiring and cookie/origin behavior
4. `production`
   private-alpha environment with invited users only

Operational rules:

- the API remains the only place that knows provider secrets or privileged environment values
- `db:migrate` remains the pre-deploy gate for API deploys
- preview and staging environments must expose predictable `WEB_ORIGIN`, `API_ORIGIN`, and `BETTER_AUTH_URL` values
- preview and staging should both support browser-based validation before promotion
- Railway preview URLs and static-hosting behavior must be verified against SPA routing, auth cookies, and split-origin requests

Valid Railway additions in this sprint:

- preview-environment verification docs
- staging env matrix
- custom domain preparation if private alpha uses one
- a small background or scheduled maintenance task only if it closes a concrete reliability gap

Invalid Sprint 5 Railway additions:

- infra sprawl without a demonstrated reliability win
- introducing a new worker topology unless the current API path is the direct blocker

## Functional Programming Rules

Sprint 5 must preserve and extend the current FP discipline.

Required rules:

- keep new release-readiness checks pure when they compute a verdict from artifacts
- keep any new scheduler or queue-health checks pure
- keep metrics event-shape builders pure
- keep log-shaping and trace-redaction helpers pure
- isolate side effects in:
  - repositories for DB reads and writes
  - provider adapters for vendor access
  - services for orchestration
  - scripts for harness execution
- avoid embedding deployment-specific branching deep inside product logic
- prefer versioned, typed event contracts over ad hoc JSON blobs
- keep retry and fallback policies explicit and testable

Practical implications:

- release-readiness scripts should read files, env, and command outputs, then compute typed pass/fail summaries
- metric event creation should happen through small typed helpers instead of open-ended string payloads
- Playwright helpers should produce stable outputs and artifact paths instead of hidden console-only diagnostics

## Non-Goals

Sprint 5 should not spend time on:

- public launch polish
- browser extension work
- OCR launch
- mobile app work
- social or collaborative features
- major new review exercise families
- new AI surface area unrelated to reliability or private-alpha readiness

## Deliverables

By the end of Sprint 5, the repo should include:

- a private-alpha readiness checklist that is executable from the repo
- a fully idempotent local `db:reset` and seed path
- integration coverage for:
  - Better Auth session churn
  - ownership enforcement in repositories and services
  - job state transitions for enrichment and review generation
  - rate-limit and conflict behavior on capture, enrichment, and review routes
- stronger Playwright coverage beyond smoke for the core app routes
- explicit Playwright MCP/manual-browser checkpoints for visual and UX validation
- clearer API and UI failure states for:
  - auth/session loss
  - capture validation failures
  - enrichment failures
  - review conflicts and stale sessions
- typed product metrics and/or structured counters for:
  - sign-in success and failure
  - seed capture
  - enrichment requested, ready, and failed
  - review session started, completed, and abandoned
  - review-card submission outcomes
- staging and preview environment verification notes in deployment docs
- a private-alpha issue intake and bug-to-eval workflow
- updated QA docs for local, preview, staging, and private-alpha validation

## Delivery Tiers

### Must Ship Before Alpha

- fully idempotent `db:reset` and fixture seeding
- deterministic local gates back to green:
  - `harness:check`
  - `lint:boundaries`
  - `lint`
  - `typecheck`
  - `test`
  - `test:integration`
  - `smoke`
  - `test:e2e`
  - `eval`
- preview and staging verification for:
  - SPA routing
  - split-origin cookies
  - Better Auth session behavior
  - migration execution
- minimum integration hardening for:
  - auth session churn
  - repository/service ownership filters
  - enrichment and review job transitions
  - route rate limits and conflict handling
- minimum product metrics derivations for the private-alpha KPIs in [docs/PRODUCT.md](/Users/jackson/Code/projects/gloss/docs/PRODUCT.md)
- documented issue intake and mandatory bug-to-eval workflow

### Stretch If Time

- release-readiness helper scripts beyond the existing harness gates
- broader Playwright regression expansion after the core private-alpha cases are covered
- custom-domain preparation
- email-provider integration if the chosen alpha onboarding model truly requires verification or password reset

## Implementation Guardrails

Sprint 5 should make the FP and architecture rules executable, not aspirational.

Required placement rules:

- keep shared event contracts, telemetry value lists, and readiness verdict types in `packages/shared`
- keep Hono routes thin:
  - auth, capture, enrichment, review, and metrics routes should only parse, authorize, call services, and map errors
- keep React routes thin:
  - load data
  - submit actions
  - render UI states
- keep readiness computation, metric derivation, event shaping, trace redaction, and retry-policy helpers in pure modules with unit tests
- keep integration tests focused on auth ownership, job-state transitions, and route conflict behavior before relying on Playwright
- keep browser tests focused on real user journeys, rendering, and recovery behavior under real cookies and origins

## Workstreams

### 1. Harness And Release Gates

Purpose:

- make the release contract explicit
- ensure the current gates match real operational needs

Scope:

- audit all current scripts against actual private-alpha needs
- add or tighten any missing scripts:
  - targeted end-to-end suite
  - preview or staging smoke command if needed
  - release-readiness checklist script if justified
- ensure `bun run smoke` and `bun run eval` remain deterministic and fast enough to use before merge
- ensure CI still reflects the real contract rather than aspirational checks
- define the alpha release cut line in measurable terms:
  - no critical eval failures
  - at least `90%` pass rate on non-critical eval checks before rollout
  - capture create succeeds or fails clearly within `3s`
  - enrichment settles to `ready` or `failed` within `30s`
  - review submission round trip stays under `1s` in local and staging

### 2. Local And Runtime Hardening

Purpose:

- remove fragile local and runtime state transitions that make reproducibility unreliable

Scope:

- make `db:reset` and fixture seeding idempotent
- harden Better Auth local, preview, and staging flows around duplicate users, stale sessions, and forced re-auth
- review retry and conflict behavior for capture, enrichment, and review endpoints
- add integration coverage for:
  - Better Auth session churn
  - repository/service ownership filters
  - provider wrappers
  - job-state transitions
- add rate limits for capture, enrichment, and review routes
- close any remaining unstable startup, shutdown, or reset paths

Known baseline issue to fix first:

- `bun run smoke` can currently fail after recent eval/reset work because seeded auth state is not fully idempotent

Job lifecycle hardening required in this workstream:

- define explicit status-transition tables for `capture.enrich` and `review.generate`
- make retries idempotent and version-aware
- define stale-job recovery or cleanup rules
- ensure each failure path has integration coverage and structured logs

### 3. Browser Validation And UX Hardening

Purpose:

- ensure the core journeys are stable and readable under real browser behavior

Scope:

- expand Playwright coverage from smoke into a small broader regression suite
- add focused coverage for:
  - sign-up and sign-in error states
  - session persistence and forced re-auth
  - capture validation and empty-state handling
  - failed enrichment retry flow
  - review conflict and completed-session behavior
  - one-user isolation and unauthorized route behavior
- keep integration-layer ownership, provider, and job-transition checks out of Playwright unless a real browser behavior is the point of failure
- keep the UI minimal while tightening copy, empty states, loading states, and recovery paths

Playwright MCP checkpoints required during this sprint:

1. baseline before changes on `/login`, `/library`, `/capture`, `/seeds/:id`, and `/review`
2. midpoint check after major UX/error-state changes
3. final private-alpha pass on local
4. final preview/staging browser pass with screenshots and notes

For each checkpoint:

- capture screenshots for the main authenticated and unauthenticated states
- record any hierarchy, readability, or recovery issues
- turn product-facing bugs into plan items or eval/test additions

### 4. Observability, Metrics, And Trace Readiness

Purpose:

- make failures and usage visible enough for a real alpha cohort

Scope:

- confirm API request logs carry the intended harness fields consistently
- add any missing structured fields for review, enrichment, auth, and rate-limit flows
- split telemetry into authoritative server events and client UX telemetry
- define the minimal product-metrics event contract and the KPI derivations that consume it
- ensure AI traces remain compact, versioned, and redacted
- confirm logs can answer:
  - who failed to sign in
  - which seed failed enrichment and why
  - which review sessions were started or abandoned
  - which stage transitions happened

Required API log and trace fields for Sprint 5:

- `request_id`
- `route`
- `method`
- `status`
- `latency_ms`
- `actor_tag`
- `session_id`
- `journey`
- `error_code`
- provider, schema, and prompt-template versions where applicable
- redacted trace metadata only; provider request payload logging stays disabled by default in production

Minimum server-side product events:

- `auth.sign_in_failed`
- `auth.sign_in`
- `auth.sign_up`
- `seed.capture`
- `seed.enrichment.requested`
- `seed.enrichment.ready`
- `seed.enrichment.failed`
- `review.session.started`
- `review.session.completed`
- `review.card.submitted`

Client UX telemetry:

- initial-load timing
- route-load timing for `/library`, `/capture`, `/seeds/:id`, and `/review`
- surfaced auth/session recovery errors
- surfaced capture, enrichment, and review recovery errors

Metric derivation table:

| KPI | Source facts | Owner | Query path |
| --- | --- | --- | --- |
| capture-to-review conversion | `seed.capture`, `review.session.started`, `review.card.submitted` | server | SQL or typed report script |
| 7-day and 30-day retention | first and repeat active dates across typed user events | server | SQL or typed report script |
| average reviews per saved word | `review.card.submitted` plus seed count | server | SQL or typed report script |
| percentage reaching `deepening` | review state or seed stage transitions | server | SQL or typed report script |
| repeat capture rate from ongoing reading | repeated `seed.capture` grouped by user and day window | server | SQL or typed report script |

### 5. Deployment, Staging, And Private Alpha Operations

Purpose:

- make the hosted environments real and reviewable

Scope:

- finalize Railway preview and staging environment rules
- document required env vars per environment
- verify cookie, origin, and auth behavior on preview and staging
- document promotion flow from preview to staging to private alpha
- decide whether email delivery is required now

Environment matrix must explicitly cover:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `API_ORIGIN`
- `WEB_ORIGIN`
- `VITE_API_BASE_URL`
- `COOKIE_DOMAIN`
- `ENRICHMENT_PROVIDER_MODE`

Promotion rules:

- preview is fast feedback, not the final promotion gate
- staging is required before private alpha
- `bun run db:migrate` must run successfully before staging or production promotion
- staging cookies must be secure, HTTP-only, and `SameSite=Lax`

Email decision rule:

- if private alpha requires only manual invite onboarding and no password reset, keep email provider deferred
- if password reset or verification is required for alpha users, add a small provider such as `Resend` in this sprint

### 6. Failure Intake And Bug-To-Eval Loop

Purpose:

- ensure alpha feedback becomes durable harness coverage instead of issue drift

Scope:

- define a lightweight issue intake format for invited users
- define the triage path:
  - reproduce
  - classify
  - patch
  - add eval case and the smallest supporting automated check
  - close
- tighten docs so escaped bugs explicitly map to:
  - unit test
  - integration test
  - Playwright spec
  - output eval
  - trace eval
- require every escaped bug, hallucination, or regression to land as a dataset row through `bun run eval:add-case` or a documented equivalent before the issue is considered closed

## Steps

1. Baseline the current app using the existing harness:
   - run `bun run harness:check`
   - run `bun run eval`
   - run `bun run smoke`
   - run Playwright MCP browser checks on the core routes
   - record known blockers and reliability gaps
2. Fix local and deterministic harness blockers first:
   - make `db:reset` idempotent
   - ensure seeded auth state and fixtures are stable
   - remove any flaky startup or reset behavior
3. Verify the hosted model early:
   - run the first serious preview pass as soon as local reset and auth state are stable
   - verify split-origin cookies, SPA routing, Better Auth session behavior, and migration flow
   - treat staging as the required gate before private alpha
4. Harden integration boundaries:
   - add or tighten integration tests for auth churn, ownership filters, provider wrappers, rate limits, and job transitions
   - lock down stale-job, retry, and conflict behavior for enrichment and review generation
5. Expand browser validation:
   - add the smallest useful additional Playwright specs
   - cover failure and recovery states, not just happy paths
   - record midpoint MCP screenshots and notes
6. Harden observability and product metrics:
   - close logging gaps
   - add typed event emission where needed
   - implement the KPI derivations for private alpha
   - verify trace quality for enrichment and review
7. Finalize deployment and private-alpha operations:
   - preview verification flow
   - staging verification flow
   - promotion checklist
   - optional email integration only if alpha flow truly needs it
8. Update the runbooks:
   - QA
   - deployment
   - eval docs
   - any release-readiness checklist docs
9. Finish with a full private-alpha validation pass:
   - deterministic local gates
   - staging browser validation
   - MCP screenshot review
   - final known-risk summary

## Validation

The sprint is not complete unless all relevant hardening gates are real and green.

Minimum deterministic validation:

- `bun run harness:check`
- `bun run lint:boundaries`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run test:integration`
- `bun run smoke`
- `bun run test:e2e`
- `bun run eval`

Required browser validation:

- Playwright smoke on local
- expanded Playwright regression on local
- Playwright MCP screenshot review at the planned checkpoints
- one preview browser pass before expanding local browser coverage
- one staging browser pass before alpha

Optional live validation:

- `bun run smoke:live`
- `bun run test:e2e:live` when Sprint 5 changes provider-path behavior or hosted live auth/enrichment wiring
- live enrichment evals only when provider keys are configured and a vendor-path change justifies it

Exit criteria:

- no critical eval failures remain open
- non-critical eval checks pass at or above `90%`
- capture create succeeds or fails clearly within `3s`
- enrichment reaches `ready` or `failed` within `30s`
- review submission round trip stays under `1s` in local and staging
- no critical auth, capture, enrichment, review, job-transition, or cross-user isolation issue remains open

Private-alpha release gate:

- preview/staging environment variables are documented and verified
- staging has been verified as the promotion gate
- the current QA runbook matches the real deployed product
- issue intake and bug-to-eval workflow are documented

## Risks

- local hardening work can sprawl if it becomes a generic cleanup sprint
  - mitigation: prioritize only issues that block reproducibility, deployability, or alpha trust
- Playwright suite expansion can become slow and brittle
  - mitigation: keep smoke short, keep broader e2e focused, and use MCP/manual review for visual issues that do not need codified automation yet
- staging and preview environments may reveal cookie/origin issues not visible locally
  - mitigation: treat hosted browser validation as a first-class Sprint 5 step, not a last-minute check
- metrics work can turn into analytics-platform work
  - mitigation: keep metrics typed and minimal, backed by current logs and database where possible
- adding email infrastructure too early can dilute the sprint
  - mitigation: only add `Resend` if the private-alpha onboarding model truly requires verification or password reset

## Status Log

- 2026-03-29: created Sprint 5 plan after baselining the current harness
- 2026-03-29: confirmed `bun run harness:check` passes
- 2026-03-29: confirmed `bun run eval` passes
- 2026-03-29: observed `bun run smoke` failure caused by non-idempotent seeded auth state during repeated `db:reset` execution; treat this as the first Sprint 5 blocker
- 2026-03-30: landed broader Playwright regression coverage for auth errors, forced re-auth, capture validation, isolation, and stale review-session recovery
- 2026-03-30: upgraded the private-alpha report and documented preview, staging, and issue-intake workflows
- 2026-03-30: added a typed deploy-environment checker for preview, staging, and private-alpha env alignment
