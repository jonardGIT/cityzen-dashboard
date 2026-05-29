# Xypes LGU Incident Response Dashboard

Production-style Next.js App Router dashboard built with TypeScript, Ant Design, TanStack Query, and Axios.

This repository includes GitHub Actions workflows for source validation on `jonardGIT/cityzen-dashboard` and a deployment-focused source copy in `Xypes13/xypes-cityzen-dashboard`.

## Deploy To Vercel

Vercel can deploy either the source repository or the deployment repository.

For a full production readiness and rollout checklist, see `docs/production-deployment.md`.

The deployment repository at `Xypes13/xypes-cityzen-dashboard` is a reduced source copy intended for deployment. It includes the buildable Next.js source tree and Vercel config, but omits local-only and non-deployment files. Production JavaScript is still minified during `next build` on Vercel.

Recommended Vercel project settings for this source repo:

- Framework Preset: `Next.js`
- Root Directory: repository root
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave empty
- Node.js Version: `20.x`

Set these environment variables in Vercel for Preview and Production as needed:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-host.example/api/v1
API_KEY=your-server-side-api-key-if-required
CIRS_API_BASE_URL=https://your-api-host.example
CIRS_API_BASE_PATH=/api/v1
CIRS_API_KEY=your-server-side-api-key-if-required
NEXT_PUBLIC_OPENAPI_SOURCE=config
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` is the browser-facing API base URL.
- `API_KEY` is used by server-side proxy routes and may reuse the same backend API key when your API requires `x-api-key`.
- Do not expose backend API keys through `NEXT_PUBLIC_*` variables. The dashboard proxies browser traffic through server routes instead.
- Production builds now fail closed when `NEXT_PUBLIC_API_BASE_URL`, `API_KEY`, `CIRS_API_BASE_URL`, or `CIRS_API_KEY` are missing.
- `NEXT_PUBLIC_OPENAPI_SOURCE=config` keeps runtime CRUD behavior on the checked-in contract instead of requiring live OpenAPI on Vercel. `checked-in` is also accepted as a backward-compatible alias.

Environment variable behavior summary:

- `NEXT_PUBLIC_API_BASE_URL`: required in production, optional in local dev. Falls back to `http://localhost:3000/api/v1` outside production.
- `API_KEY`: required for production dashboard proxy requests. Falls back to `local-dev-key` only in local dev when the dashboard API base is the localhost default.
- `CIRS_API_BASE_URL`: required in production, optional in local dev. Falls back to `http://localhost:3000` outside production.
- `CIRS_API_BASE_PATH`: optional in all environments. Falls back to `/api/v1` when unset.
- `CIRS_API_KEY`: optional only when `API_KEY` is already set, because direct server-side CIRS requests fall back from `CIRS_API_KEY` to `API_KEY`.
- `NEXT_PUBLIC_OPENAPI_SOURCE`: optional. `config` and `checked-in` force the checked-in contract, while an unset value prefers live `/openapi.json` and falls back to the checked-in contract if the request fails.

Production mapping example for a backend hosted at `https://x1.dev.xypes.com/api/v1`:

```env
NEXT_PUBLIC_API_BASE_URL=https://x1.dev.xypes.com/api/v1
API_KEY=your-server-side-api-key
CIRS_API_BASE_URL=https://x1.dev.xypes.com
CIRS_API_BASE_PATH=/api/v1
CIRS_API_KEY=your-server-side-api-key
NEXT_PUBLIC_OPENAPI_SOURCE=config
```

Minimal production set when one shared backend key is used:

```env
NEXT_PUBLIC_API_BASE_URL=https://x1.dev.xypes.com/api/v1
API_KEY=your-server-side-api-key
CIRS_API_BASE_URL=https://x1.dev.xypes.com
NEXT_PUBLIC_OPENAPI_SOURCE=config
```

In that minimal setup, `CIRS_API_BASE_PATH` falls back to `/api/v1` and `CIRS_API_KEY` falls back to `API_KEY`.

## Stack

- Next.js App Router + TypeScript (strict)
- Ant Design UI (no Tailwind)
- TanStack Query for server state
- Axios API clients with interceptors

## Run Locally

```bash
npm install
npm run dev
```

When `npm run dev` starts locally, the dashboard now checks `http://localhost:3000/api/v1/health` first. If the local API is not running and the sibling repo exists at `/home/nhad/xypes/xypes-cirs-api`, it starts that API in the background and then continues launching the dashboard on port `3001`.

After the API is reachable, the wrapper also probes the auth login endpoint with a harmless invalid credential request. That catches cases where the API process is up but auth is still unusable because local schema or auth dependencies are out of date.

- This behavior is local-only and is skipped in CI.
- If you want the dashboard without auto-starting the API, run `DASHBOARD_SKIP_LOCAL_API_AUTOSTART=1 npm run dev`.
- If you only want the raw dashboard server, run `npm run dev:dashboard`.
- Background API logs are written to the local temp directory under `xypes-cirs-dashboard-dev/local-api-dev.log`.
- If auth readiness fails, the wrapper logs the backend response message but still starts the dashboard so your workflow is not blocked.

Optional deployed smoke check:

```bash
DASHBOARD_BASE_URL=https://dashboard.example.gov \
DASHBOARD_SMOKE_ADMIN_EMAIL=admin@example.gov \
DASHBOARD_SMOKE_ADMIN_PASSWORD='your-password' \
npm run smoke:dashboard
```

Containerized local smoke stack:

```bash
npm run test:local:docker
```

That compose flow starts a seeded Postgres test database, boots the sibling API in local app-JWT mode, starts the dashboard against that API, and then runs both the API local smoke and dashboard smoke from inside containers.

- The stack lives in [docker-compose.local-testing.yml](docker-compose.local-testing.yml).
- It uses the seeded local admin account `admin@xypes.local` / `Password123!` inside the isolated test stack.
- Tear the stack down with `npm run test:local:docker:down`.

The dashboard runtime derives a checked-in contract from `dashboard-crud-config.flat.json` by default so production deployments do not depend on `/api/v1/openapi.json` existing.

To compare the dashboard CRUD config against a live backend OpenAPI document, use a non-production API instance:

```bash
npm run check:openapi-drift
```

By default this uses `NEXT_PUBLIC_API_BASE_URL` from `.env.local` and requests `/openapi.json`. If that fetch fails, or if the target only exposes the local-only placeholder document, the script falls back to a checked-in OpenAPI document derived from `dashboard-crud-config.flat.json`. You can override the live URL with `OPENAPI_URL`. Do not point this at production-like environments where full OpenAPI is intentionally disabled.

When you want drift checking against a specific saved backend artifact instead of the checked-in fallback, validate against a saved spec file:

```bash
npm run check:openapi-drift -- --spec-file /tmp/xypes-openapi.json
```

Feature-gated config operations are reported separately. They do not fail the check when the live OpenAPI omits them, which is expected for disabled backend feature profiles.

If you need the app to fetch a live OpenAPI document at runtime for local verification, set `NEXT_PUBLIC_OPENAPI_SOURCE=live` against a local or non-production API that exposes `/api/v1/openapi.json`.

App URL: `http://localhost:3001`

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
API_KEY=local-dev-key
```

You can also copy from `.env.example` and adjust values per environment.

## API Client Architecture

- `publicClient`: API-key only, used for login and token refresh
- `authClient`: API-key + Bearer token with one refresh retry on `401`
- Both clients are in `src/lib/api/clients.ts`
- Unauthorized sessions are cleared only after refresh is unavailable or rejected
- Browser auth now flows through same-origin `src/app/api/auth/` proxy routes, which store bearer tokens in `HttpOnly` cookies instead of `localStorage`.

## Auth and Session Behavior

See `docs/auth-operation-endpoint-flow.md` (gitignored) for detailed auth flow documentation.

For production setup prerequisites, rollout sequencing, smoke checks, and go-live controls, see `docs/production-deployment.md`.

## Roles

Nine roles are defined. See internal docs for the full permission matrix and capabilities.

Legacy cached frontend role labels (e.g. `SUPER_ADMIN`, `ADMIN`, `VIEWER`) are normalized automatically.

Current canonical labels used in the dashboard:

- National Admin
- Regional Director
- Provincial Admin
- City Admin
- City Content Editor
- Dispatcher
- Responder
- Citizen Reporter
- Auditor

## Required Routes Implemented

- `/login`
- `/dashboard`
- `/incidents`
- `/assignments`
- `/citizens`
- `/citizens/[id]`
- `/responders`
- `/statuses`
- `/categories`
- `/severities`
- `/users`
- `/profile`
- `/forbidden`
- `not-found`

## Folder Structure

- `src/app`: App Router pages/layouts
- `src/components/auth`: `AuthGate`, `RoleGuard`
- `src/components/layout`: dashboard shell
- `src/components/common`: shared page/table states
- `src/context`: `AuthContext`
- `src/providers`: root providers (Query + AntD + Auth)
- `src/features/incidents`
- `src/features/assignments`
- `src/features/users`
- `src/features/reference-data`
- `src/lib/api`, `src/lib/auth`, `src/lib/forms`, `src/lib/query`
- `src/types`

## URL Synced Tables

Data views use `useTableQueryParams` to sync:

- `page`
- `pageSize`
- `search`

with URL query parameters.

## Seeded QA Accounts

See `docs/developer-testing-setup.md` (gitignored) for QA account credentials and role mappings.

## CORS Reminder

Set backend `CORS_ORIGIN` to include dashboard origins, for example:

- `http://localhost:3001`
- your LAN/dev origin when testing from another device

- your deployed dashboards domain
