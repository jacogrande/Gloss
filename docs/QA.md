# Manual QA

This document describes how to run and validate the current Sprint 1 foundation locally.

## Scope

Sprint 1 covers:

- Bun workspace setup
- native local PostgreSQL bootstrap
- Hono API
- Better Auth email/password sessions
- React SPA login and authenticated shell
- the first smoke and test scripts

This is a local-development guide. Railway deploys are covered in [docs/DEPLOYMENT.md](/Users/jackson/Code/projects/gloss/docs/DEPLOYMENT.md).

## Prerequisites

Install these first:

- Bun `1.1.42+`
- Node `20.19+` or `22.12+`
- PostgreSQL binaries available on `PATH`

Required PostgreSQL binaries:

- `initdb`
- `pg_ctl`
- `psql`
- `createdb`

If PostgreSQL binaries are installed but not on `PATH`, set `POSTGRES_BIN_DIR` to their directory.

## Local Setup

From the repo root:

```bash
bun install
cp .env.example .env
bun run db:reset
```

What `bun run db:reset` does:

- starts the repo-local PostgreSQL cluster under `.local/postgres`
- creates the `gloss` database if needed
- applies migrations from `db/migrations`
- seeds the demo account

Seeded demo credentials:

- email: `demo@gloss.local`
- password: `password1234`

## Running The App

Start both services:

```bash
bun run dev
```

Local URLs:

- `bun run dev` prints the chosen `webOrigin` and `apiOrigin`
- if `5173` or `8787` is already occupied, the runner picks the next free local port
- use the printed origins for browser and curl checks
- default targets remain:
  - web: `http://127.0.0.1:5173`
  - api: `http://127.0.0.1:8787`
  - health: `http://127.0.0.1:8787/health`

If you only want one service:

```bash
bun run dev:web
bun run dev:api
```

To stop the local PostgreSQL cluster when finished:

```bash
bun run db:stop
```

## Fast Validation

Run the full Sprint 1 validation set:

```bash
bun run lint
bun run typecheck
bun run test
bun run smoke
```

Expected result:

- all commands exit `0`
- `bun run smoke` prints JSON with `"status":"passed"`

Useful narrower checks:

```bash
bun run test:integration
bun run test:web
bun run build
```

## Manual Browser QA

### 1. Boot Smoke Check

1. Run `bun run db:reset`.
2. Run `bun run dev`.
3. Open `http://127.0.0.1:5173`.

Expected result:

- the app redirects unauthenticated users to `/login`

### 2. Sign Up A New User

1. Open `http://127.0.0.1:5173/login`.
2. Switch the form to sign-up mode.
3. Enter:
   - a fresh email like `reader+1@example.com`
   - a name
   - a password of at least 8 characters
4. Submit the form.

Expected result:

- you are redirected to `/app`
- the authenticated shell loads
- the shell shows the signed-in user email
- the shell confirms the backend profile/session bootstrap worked

### 3. Sign Out

1. From `/app`, click sign out.

Expected result:

- you return to `/login`
- revisiting `/app` redirects back to `/login`

### 4. Sign In With The Seeded Demo Account

1. Sign in with:
   - email: `demo@gloss.local`
   - password: `password1234`

Expected result:

- login succeeds
- you land on `/app`
- the shell renders without errors

### 5. Reload Stability

1. While signed in on `/app`, refresh the page.

Expected result:

- session recovery succeeds
- the page remains authenticated
- the `/api/me` data reloads and the page does not bounce to `/login`

## Manual API QA

### Health Endpoint

Run:

```bash
curl http://127.0.0.1:8787/health
```

Expected result:

- HTTP `200`
- JSON response with `ok: true`

### Unauthorized Session Endpoint

Run:

```bash
curl -i http://127.0.0.1:8787/api/me
```

Expected result:

- HTTP `401`
- JSON error response
- error code `AUTH_UNAUTHORIZED`

### Authorized Session Endpoint

Use a cookie jar to sign in and then call `/api/me`:

```bash
curl -i -c /tmp/gloss.cookies \
  -H 'content-type: application/json' \
  -H 'origin: http://127.0.0.1:5173' \
  -X POST http://127.0.0.1:8787/api/auth/sign-in/email \
  --data '{"email":"demo@gloss.local","password":"password1234"}'

curl -i -b /tmp/gloss.cookies \
  -H 'origin: http://127.0.0.1:5173' \
  http://127.0.0.1:8787/api/me
```

Expected result:

- sign-in returns HTTP `200`
- the second request returns HTTP `200`
- the `/api/me` payload includes:
  - `user`
  - `session`
  - `profile`

## Expected Sprint 1 Behaviors

These are the behaviors that should hold every time:

- unauthenticated users cannot read `/api/me`
- the browser never stores bearer tokens in `localStorage`
- auth is cookie-based
- sign-up creates a real session immediately
- sign-out clears access to the protected shell
- the authenticated shell reads profile data from the API, not from hardcoded client state
- `bun run db:reset` is deterministic
- `bun run smoke` passes after a reset

## Troubleshooting

### PostgreSQL binaries not found

Symptom:

- scripts fail with messages about `initdb`, `pg_ctl`, `psql`, or `createdb`

Fix:

- add PostgreSQL to `PATH`, or set `POSTGRES_BIN_DIR`

Example:

```bash
export POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@15/bin
```

### Database ports already in use

Default local ports:

- Postgres: `54329`
- API: `8787`
- Web: `5173`

If the repo-local cluster is stuck or already running:

```bash
bun run db:stop
bun run db:start
```

### Node toolchain warning from Vite

Symptom:

- `bun run build` warns that Node is older than Vite's preferred version

Fix:

- use Node `20.19+` or `22.12+`

### Reset the environment

If local state gets confusing:

```bash
bun run db:reset
```

That is the fastest way to return to a known-good Sprint 1 state.
