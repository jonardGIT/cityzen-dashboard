# Xypes LGU Incident Response Dashboard

Production-style Next.js App Router dashboard built with TypeScript, Ant Design, TanStack Query, and Axios.

This repository includes GitHub Actions workflows for source validation on `jonardGIT/cityzen-dashboard` and a deployment-focused source copy in `Xypes13/xypes-cityzen-dashboard`.

## Deploy To Vercel

Vercel can deploy either the source repository or the deployment repository.

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
NEXT_PUBLIC_API_KEY=your-public-api-key-if-required
API_KEY=your-server-side-api-key-if-required
CIRS_API_BASE_URL=https://your-api-host.example
CIRS_API_BASE_PATH=/api/v1
CIRS_API_KEY=your-server-side-api-key-if-required
NEXT_PUBLIC_OPENAPI_SOURCE=config
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` is the browser-facing API base URL.
- `API_KEY` is used by server-side proxy routes and may reuse the same backend API key when your API requires `x-api-key`.
- `NEXT_PUBLIC_OPENAPI_SOURCE=config` keeps runtime CRUD behavior on the checked-in contract instead of requiring live OpenAPI on Vercel.

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

The dashboard runtime derives a checked-in contract from `dashboard-crud-config.flat.json` by default so production deployments do not depend on `/api/v1/openapi.json` existing.

To compare the dashboard CRUD config against a live backend OpenAPI document, use a non-production API instance:

```bash
npm run check:openapi-drift
```

By default this uses `NEXT_PUBLIC_API_BASE_URL` from `.env.local` and requests `/openapi.json`. You can override that with `OPENAPI_URL`. Do not point this at production-like environments where OpenAPI is intentionally disabled.

When the backend is offline, or when the target environment runs with `NODE_ENV=production`, validate against a saved spec file instead:

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
NEXT_PUBLIC_API_KEY=local-dev-key
```

## API Client Architecture

- `publicClient`: API-key only, used for login and token refresh
- `authClient`: API-key + Bearer token with one refresh retry on `401`
- Both clients are in `src/lib/api/clients.ts`
- Unauthorized sessions are cleared only after refresh is unavailable or rejected

## Auth and Session Behavior

See `docs/auth-operation-endpoint-flow.md` (gitignored) for detailed auth flow documentation.

## Roles

Seven roles are defined. See internal docs for the full permission matrix and capabilities.

Legacy cached frontend role labels (e.g. `SUPER_ADMIN`, `ADMIN`, `VIEWER`) are normalized automatically.

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
