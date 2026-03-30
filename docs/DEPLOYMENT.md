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

## Release Checklist

Before promoting a deploy:

1. `bun run lint`
2. `bun run typecheck`
3. `bun run test`
4. `bun run smoke`
5. confirm the target Railway environment variables are aligned
6. confirm the API service ran `bun run db:migrate`
