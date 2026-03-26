# Security

This document defines the minimum security posture for the Gloss MVP.

## Threat Model

Main risks for this product:

- exposing user reading history or saved text
- prompt injection through imported or OCR'd text
- hallucinated or unsafe AI output presented as fact
- over-broad access to user-owned data
- leaked secrets in logs or client code

## Core Rules

- All secrets stay server-side.
- The browser never calls model providers directly.
- The browser never talks to Postgres directly.
- Imported text, OCR text, article text, and user notes are untrusted input.
- Untrusted input must never be placed into developer instructions.
- All AI responses must conform to a schema before persistence.
- If required evidence is missing, omit the field rather than guessing.

## Better Auth Rules

- Use Better Auth session cookies, not browser-stored bearer tokens, for the default web flow.
- Keep auth handlers mounted under `/api/auth/*`.
- Use secure, HTTP-only cookies in production.
- Keep `SameSite=Lax` unless a real cross-site requirement appears.
- Persist users, sessions, and linked accounts in Postgres through reviewed migrations.

## Authorization Rules

- Every user-scoped read and write must filter by authenticated user ownership in the API layer.
- Cross-user access checks should have explicit integration coverage.
- Do not rely on route-level assumptions alone; repositories and services must enforce ownership too.

## Database And Storage Rules

- Application code must connect with least-privilege credentials in each environment.
- Migrations must be versioned and repeatable.
- If file storage is added later, bucket paths must encode ownership explicitly.

## API Rules

- Authenticate every user-facing mutation.
- Rate-limit capture, enrichment, and review endpoints.
- Use explicit allowlists for external tools and providers.
- Return stable error codes that the web app can present safely.

## AI Safety Rules

- Keep prompts task-specific and narrow.
- Use structured outputs only.
- Record prompt template versions.
- Do not ask the model to infer unsupported etymology, register, or relation claims.
- Treat lexical source data as evidence and model output as a proposal until validated.

## Logging And Privacy

- Log record ids, counts, and hashes before raw private text.
- Redact or truncate captured sentences in traces where full text is not required.
- Keep provider request payload logging disabled by default in production.

## File And OCR Handling

- Validate file types and size limits before upload.
- Virus scanning can wait until later, but file type validation cannot.
- OCR outputs should be treated as untrusted text and stored separately from normalized product data.

## Dependencies And Tooling

- Pin critical package versions where reproducibility matters.
- Run dependency updates deliberately, not opportunistically.
- Do not add libraries that duplicate existing capability without a clear operational reason.
