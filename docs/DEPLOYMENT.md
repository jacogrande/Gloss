# Deployment

This document captures the deployment and environment rules for the current Gloss MVP stack.

## Targets

Gloss uses:

- `Railway Postgres` for hosted databases
- `Railway service` for the Hono API
- `Railway static hosting` for the React SPA
- native local PostgreSQL binaries for local development and automated tests

Docker is not required for the current workflow.

## Local Development Database

Local development uses the scripts below:

- `bun run db:start`
  Initializes a repo-local cluster under `.local/postgres` if needed and starts it.
- `bun run db:migrate`
  Applies checked-in migrations from `db/migrations`.
- `bun run db:seed`
  Loads deterministic fixture data into the local database.
- `bun run db:reset`
  Recreates the local database schema, reapplies migrations, and reseeds.

Requirements:

- PostgreSQL binaries must be installed locally.
- Node `20.19+` or `22.12+` is required for the Vite and Vitest toolchain.
- Bun `1.1.42+` is the package manager and task runner.
- `initdb`, `pg_ctl`, `psql`, and `createdb` must be on `PATH`, or `POSTGRES_BIN_DIR` must point to their directory.
- The default local connection string is `postgresql://gloss:gloss@127.0.0.1:54329/gloss`.

The native helper exists only for local development and test automation. Hosted environments should use Railway-managed Postgres.

## Railway Service Layout

Recommended Railway project layout:

1. `postgres`
   Use Railway Postgres.
2. `api`
   Root directory: repository root
3. `web`
   Root directory: repository root

The API and web services should each deploy from GitHub auto-deploys on the main branch. Preview environments can use Railway preview deploys with environment-specific public URLs.

## Environment Matrix

| Environment | Web origin | API origin | Auth URL | Cookie domain | Provider mode | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `local` | `http://127.0.0.1:<web-port>` | `http://127.0.0.1:<api-port>` | same as API origin | unset | `fixture` by default, `live` only when keys are present | local `bun run dev` can auto-select free web/API ports |
| `preview` | Railway preview web URL | Railway preview API URL | same as preview API origin | unset unless using preview subdomains on one shared parent domain | `fixture` unless doing explicit live validation | use for fast browser verification, not final promotion |
| `staging` | stable staging web URL | stable staging API URL | same as staging API origin | set only when the staging domain strategy requires it | `fixture` for deterministic checks, `live` only when staged provider validation is deliberate | required promotion gate before private alpha |
| `private-alpha` | stable invite-only web URL | stable invite-only API URL | same as invite-only API origin | set only when the deployed domain strategy requires it | `live` only if real providers are enabled for invited users | production-like environment for real cohort usage |

Use `bun run deploy:check-env -- --environment preview --target combined --pretty` from the environment you are validating to confirm the shell wiring matches the documented split-origin contract.

## API Service

Recommended Railway settings for the API service:

- Install command: `bun install --frozen-lockfile`
- Build command: `bun run build:api`
- Start command: `bun run --cwd apps/api start`
- Pre-deploy command: `bun run db:migrate`

Runtime notes:

- `PORT` is provided by Railway and must remain configurable.
- `DATABASE_URL` should come from the Railway Postgres attachment.
- `BETTER_AUTH_URL` must match the public API origin for that environment.
- `WEB_ORIGIN` must match the public SPA origin for that environment.
- `API_ORIGIN` should match `BETTER_AUTH_URL`.
- `ENRICHMENT_PROVIDER_MODE` should be `fixture` for local smoke/eval and explicit `live` only when provider keys are configured.
- `bun run dev` will auto-select `live` for local interactive development when `ENRICHMENT_PROVIDER_MODE` is unset and all required live provider keys are present. Test and browser-validation scripts keep their own deterministic mode settings.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `MERRIAM_WEBSTER_DICTIONARY_API_KEY`, and `MERRIAM_WEBSTER_THESAURUS_API_KEY` are only required when `ENRICHMENT_PROVIDER_MODE=live`.
- `bun run smoke:live` and `bun run test:e2e:live` are the dedicated local browser entrypoints for that live-provider path.

## Web Service

Recommended Railway settings for the web service:

- Install command: `bun install --frozen-lockfile`
- Build command: `bun run build:web`
- Output directory: `apps/web/dist`

Runtime notes:

- `VITE_API_BASE_URL` must point at the environment-specific API origin.
- The SPA should be served as static assets; no SSR runtime is required for the MVP.
- React Router remains in SPA mode. If Railway static hosting needs an SPA fallback rule, route unmatched requests to `index.html`.

## Environment Matrix

Required API environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `API_ORIGIN`
- `WEB_ORIGIN`
- `ENRICHMENT_PROVIDER_MODE`
- `OPENAI_MODEL`
- `PORT`
- `LOG_LEVEL`

Optional API environment variables:

- `COOKIE_DOMAIN`
- `OPENAI_API_KEY`
- `MERRIAM_WEBSTER_DICTIONARY_API_KEY`
- `MERRIAM_WEBSTER_THESAURUS_API_KEY`
- `POSTGRES_BIN_DIR` for local development only

Required web environment variables:

- `VITE_API_BASE_URL`

Guidelines:

- Use a different `BETTER_AUTH_SECRET` per hosted environment.
- Keep `WEB_ORIGIN`, `API_ORIGIN`, and `BETTER_AUTH_URL` aligned exactly per environment.
- Only set `COOKIE_DOMAIN` when using a custom domain strategy that requires it.
- `COOKIE_DOMAIN` must be a bare domain or subdomain such as `gloss.test` or `preview.gloss.test`, never a full URL or host with a port.
- Keep fixture mode as the default for local harness work so smoke and eval stay deterministic.

## Preview Verification

Run the preview checklist in [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md) after every meaningful deploy that changes auth, routing, capture, enrichment, or review behavior.

Minimum preview checks:

1. direct-link SPA routing works for `/library`, `/capture`, `/review`, and `/seeds/:id`
2. sign-in, refresh, and sign-out work under the preview origins
3. one split-origin API path succeeds from the browser
4. the deployed API can read the migrated schema
5. `bun run deploy:check-env -- --environment preview --target combined --pretty` passes from the preview-connected shell

Preview is not the final promotion gate.

## Staging Verification

Staging is required before private alpha.

Minimum staging checks:

1. repeat the full preview verification checklist
2. confirm cookies are secure, HTTP-only, and `SameSite=Lax`
3. confirm one capture, one enrichment, and one review session complete successfully
4. confirm the deployed env values line up:
   - `WEB_ORIGIN`
   - `API_ORIGIN`
   - `BETTER_AUTH_URL`
   - `VITE_API_BASE_URL`
5. capture the screenshot set and notes described in [docs/PRIVATE_ALPHA.md](/Users/jackson/Code/projects/gloss/docs/PRIVATE_ALPHA.md)
6. `bun run deploy:check-env -- --environment staging --target combined --pretty` passes from the staging-connected shell

## Release Checklist

Before promoting a deploy:

1. `bun run lint`
2. `bun run typecheck`
3. `bun run test`
4. `bun run smoke`
5. `bun run report:alpha --pretty`
6. `bun run deploy:check-env -- --environment <preview|staging|private-alpha> --target combined --pretty`
7. confirm the target Railway environment variables are aligned
8. confirm the API service ran `bun run db:migrate`
9. confirm preview or staging verification notes are current for the commit being promoted
