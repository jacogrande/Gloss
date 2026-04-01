# Front-To-Back Review

Date: 2026-03-31

Scope:

- main product app only
- desktop-width browser review using Playwright MCP
- corroborating code review from parallel UX and functionality reviewer agents
- harness checks run after the browser pass

Evidence:

- manual browser screenshots in `docs/reviews/assets/`
- `bun run smoke`
- `bun run eval`

Validation:

- `bun run smoke` passed
- `bun run eval` passed

Notes:

- The Playwright MCP browser was unstable during longer sessions and had to be reopened multiple times.
- Because of that, the sign-out and forced re-auth paths were corroborated by code review and existing harness coverage, not by a clean uninterrupted screenshot series.

## Journey Inventory

### 1. Unauthenticated entry

Route: `/login`

Status: pass, with copy/hierarchy issues

Observed:

- login renders cleanly
- create-account tab is discoverable
- pre-auth `401 /api/me` requests are expected during boot

Screenshot:

- `docs/reviews/assets/review-login.png`

### 2. Sign up

Route: `/login` -> create account

Status: pass, with onboarding-copy issues

Observed:

- new account creation succeeded
- successful sign-up redirected into an empty library state

Screenshot:

- `docs/reviews/assets/review-signup.png`

### 3. Empty library

Route: `/library`

Status: pass, but underpowered

Observed:

- newly created user lands in a true empty state
- there is no direct CTA back to capture from the empty state

Screenshot:

- `docs/reviews/assets/review-library-empty.png`

### 4. Capture

Route: `/capture`

Status: pass, with friction and recovery issues

Observed:

- form submission works
- source metadata is always expanded
- wording says context is optional, but weak-context seeds can become low-value or unrecoverable without an edit flow

Screenshot:

- `docs/reviews/assets/review-capture-empty.png`

### 5. Populated library

Route: `/library`

Status: pass, but next actions are under-communicated

Observed:

- seeded and newly captured words render correctly
- stage filter is present
- only the word text is clickable; the card itself does not read as a full interaction target
- cards do not communicate enrichment/readiness/review status

Screenshot:

- `docs/reviews/assets/review-library-populated.png`

### 6. Seed detail, pending enrichment

Route: `/seeds/:seedId`

Status: pass, but handoff is opaque

Observed:

- after capture, the app redirects directly into seed detail and auto-starts enrichment
- pending state shows `Loading definition...`
- the transition from `Save seed` to background enrichment is mechanically fine, but silent

Manual note:

- this state was observed during the browser pass, but the MCP browser crashed before a clean screenshot could be preserved

### 7. Seed detail, ready enrichment

Route: `/seeds/:seedId`

Status: pass, with evidence/hierarchy issues

Observed:

- ready seed detail renders reliably
- compare, roots, and source detail sections are readable
- source and context are visually secondary even though they are the evidence base
- the dominant gloss still reads as contextual AI wording in some cases instead of a straight definition

Screenshots:

- `docs/reviews/assets/review-seed-ready.png`
- `docs/reviews/assets/review-seed-ready-expanded.png`

### 8. Review queue

Route: `/review`

Status: pass, with expectation-setting issues

Observed:

- due counts and dimension breakdown render
- the queue is understandable
- the button state is currently tied to `availableCount`, not `dueCount`
- the queue does not explain that one due seed may produce multiple cards

Screenshot:

- `docs/reviews/assets/review-queue.png`

### 9. Active review session

Route: `/review`

Status: pass, with major feedback gap

Observed:

- session start worked
- card progression worked
- wrong submission advanced immediately without any correctness feedback, explanation, or reveal of the correct answer
- the UI feels like a state machine, not a teaching loop

Screenshots:

- `docs/reviews/assets/review-session-card-1.png`
- `docs/reviews/assets/review-session-card-2.png`

### 10. Review completion

Route: `/review`

Status: pass

Observed:

- completed session lands on a clean summary state
- the completion screen is simple and understandable

Screenshot:

- `docs/reviews/assets/review-session-complete.png`

### 11. Sign out and re-auth

Routes: protected routes -> `/login`

Status: partially documented

Observed:

- existing smoke coverage already verifies unauthenticated access redirect
- code review indicates session-expiry and deep-link recovery are still inconsistent

Harness evidence:

- `bun run smoke` includes unauthenticated redirect and demo sign-in

## Highest-Priority Findings

### 1. Review discards the learning moment

Severity: high

The app computes the review result, but the UI never presents it. A wrong answer immediately advances to the next card, so the user loses the correction, the rationale, and the pedagogical payoff.

Refs:

- `apps/web/src/routes/review-route.tsx:192`
- `apps/web/src/routes/review-route.tsx:242`
- `apps/web/src/routes/review-route.tsx:324`

Recommendation:

- add an explicit post-submit state with correctness, correct answer, brief rationale, and `Continue`

### 2. Seed detail still centers generated interpretation over captured evidence

Severity: high

The main block on the word page is the generated gloss, while the sentence and source are lower-emphasis or collapsed. This is backwards for a product whose value proposition depends on context-grounded vocabulary learning.

Refs:

- `apps/web/src/features/seeds/SeedEnrichmentPanel.tsx:111`
- `apps/web/src/features/seeds/SeedDetailPanel.tsx:52`
- `apps/web/src/features/seeds/SeedDetailPanel.tsx:112`

Recommendation:

- lead with captured sentence and source
- explicitly label generated text as scaffolding
- make weak-evidence states visibly weaker, not equally authoritative

### 3. The “dictionary definition” cleanup still leaks contextual phrasing

Severity: medium

The word page still shows copy like `In this kind of context, it describes...` as the main meaning block, which defeats the intended split between straight definition and contextualized meaning.

Refs:

- `apps/web/src/features/seeds/SeedEnrichmentPanel.tsx:103`
- `apps/web/src/features/seeds/seed-presenters.ts:31`

Recommendation:

- broaden normalization beyond `means` patterns, or store separate dictionary/contextual gloss fields

### 4. Capture is more effortful than the product promise suggests

Severity: high

The form says `Add context only if you need it`, but all optional metadata is expanded at full weight. On submit, the user is dropped into a pending enrichment state with little explanation of what is happening next.

Refs:

- `apps/web/src/features/seeds/CaptureForm.tsx:55`
- `apps/web/src/routes/seed-detail-route.tsx:104`
- `apps/web/src/features/seeds/SeedEnrichmentPanel.tsx:56`

Recommendation:

- collapse source fields behind an optional expander
- mark optionality explicitly
- show `Saved` plus background enrichment progress after submit

### 5. Thin-context capture lacks a recovery path

Severity: high

The product allows low-context capture, but failed or weak enrichments do not appear to offer an edit path to add the missing evidence. Retrying alone is not enough when the underlying evidence is weak.

Refs:

- `apps/web/src/features/seeds/CaptureForm.tsx:58`
- `apps/web/src/features/seeds/SeedEnrichmentPanel.tsx:17`
- `apps/api/src/routes/capture.ts`
- `apps/api/src/routes/seeds.ts`

Recommendation:

- add seed editing for sentence/source metadata
- or add a clear `Add context` recovery CTA from failed enrichment

### 6. Auth/session behavior is still brittle around expiry and deep links

Severity: high

Session caching keeps the user in the protected shell on some failures, but routes do not consistently recover to login when the real auth state is gone. Deep links also lose intent and fall back to `/library`.

Refs:

- `apps/web/src/features/auth/session-provider.tsx:92`
- `apps/web/src/features/auth/session-provider.tsx:118`
- `apps/web/src/routes/protected-layout.tsx:21`
- `apps/web/src/routes/login-route.tsx:25`
- `apps/web/src/routes/login-route.tsx:52`

Recommendation:

- distinguish transient dev/network failures from real auth loss
- preserve intended destination through login
- add end-to-end coverage for cookie loss and deep-link re-entry

### 7. Library cards under-communicate interaction and readiness

Severity: medium

Cards are visually large but only the word itself is clickable. They also do not show what the user can do next: read, enrich, review, or recover.

Refs:

- `apps/web/src/features/seeds/SeedCard.tsx:16`
- `apps/web/src/routes/library-route.tsx:82`

Recommendation:

- make the full card clickable
- add a compact status/next-action row
- add direct CTAs in empty and error states

### 8. Onboarding currently ends in a dead end

Severity: medium

Newly created users land on an empty library. That is technically correct, but it is the wrong emotional and product moment for the first successful auth transition.

Refs:

- `apps/web/src/app/App.tsx:16`
- `apps/web/src/routes/login-route.tsx:52`
- `apps/web/src/routes/library-route.tsx:87`

Recommendation:

- route first-time users to capture
- or add a prominent `Save your first word` CTA in the empty library state

### 9. Review queue sets the wrong effort expectation

Severity: medium

The queue says `3 due`, but the session can become `Card 1 of 4`. That is mechanically correct, but it is not explained to the user.

Refs:

- `apps/web/src/routes/review-route.tsx:249`
- `apps/web/src/routes/review-route.tsx:360`

Recommendation:

- preview expected card count before start
- or explain that one due seed may yield multiple cards

### 10. Loading and failure states are readable but not actionable

Severity: medium

Several screens stop at status copy instead of telling the user what to do next.

Refs:

- `apps/web/src/routes/login-route.tsx:21`
- `apps/web/src/routes/protected-layout.tsx:17`
- `apps/web/src/routes/library-route.tsx:78`
- `apps/web/src/routes/seed-detail-route.tsx:135`
- `apps/web/src/features/seeds/SeedEnrichmentPanel.tsx:17`
- `apps/web/src/routes/review-route.tsx:234`

Recommendation:

- rewrite state copy as `what happened + why + next action`

### 11. Library filter labels are implementation-shaped

Severity: low

The filter exposes raw enum values like `new` and `deepening` even though other parts of the UI format stage labels more carefully.

Refs:

- `apps/web/src/routes/library-route.tsx:65`
- `apps/web/src/features/seeds/seed-presenters.ts:24`

Recommendation:

- format filter labels the same way stage badges are formatted elsewhere

### 12. Keyboard focus is weak outside the main form fields

Severity: medium

Inputs have clearer focus treatment than nav pills, seed links, review choices, and primary buttons.

Refs:

- `apps/web/src/styles.css:114`
- `apps/web/src/styles.css:348`
- `apps/web/src/styles.css:370`
- `apps/web/src/styles.css:817`

Recommendation:

- add a consistent `:focus-visible` system across all interactive controls

## Harness Gaps To Convert Into Coverage

These should become explicit browser or eval cases.

1. Sign out or clear cookies mid-session, then hit `/library`, `/seeds/:seedId`, and `/review`; expect redirect to `/login`.
2. Deep-link to a protected seed or review route while anonymous; log in and return to the intended destination.
3. Save a thin-context seed; require either an edit path or a meaningful recovery CTA.
4. Start review with `dueCount = 0`; ensure CTA is disabled and copy explains why.
5. Submit a wrong review answer; require correctness feedback before advancing.
6. Verify the whole library card is clickable if that interaction model is adopted.

## Overall Assessment

The site is mechanically in decent shape. The core journeys work, and the harness still catches regressions well.

The product gaps are no longer about missing routes. They are about teaching quality and recovery quality:

- too many screens stop at status instead of guidance
- review currently transitions state without delivering feedback
- capture and seed detail still under-express the role of evidence
- auth and deep-link recovery are not yet robust enough for a polished private alpha

The app is usable today. It is not yet fully self-explanatory.
