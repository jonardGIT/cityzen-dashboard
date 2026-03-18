# Xypes LGU Incident Response Dashboard

Production-style Next.js App Router dashboard built with TypeScript, Ant Design, TanStack Query, and Axios.

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

App URL: `http://localhost:3001`

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_API_KEY=local-dev-key
```

## API Client Architecture

- `publicClient`: API-key only, used for login
- `authClient`: API-key + Bearer token
- Both clients are in `src/lib/api/clients.ts`
- 401 responses clear auth state and redirect to `/login`

## Auth and Session Behavior

- Login endpoint: `POST /auth/login`
- Session endpoint: `GET /auth/me`
- Access token and user are stored in local storage
- On app boot, session restore is attempted via `/auth/me`
- 401 redirects to `/login`
- 403 is rendered as forbidden state/page

## Roles

- `SUPER_ADMIN`
- `ADMIN`
- `DISPATCHER`
- `RESPONDER`
- `VIEWER`

## Permission Matrix

- Create incident: `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `RESPONDER`
- Create assignment: `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`
- Create/manage users: `SUPER_ADMIN`, `ADMIN`

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
- `/locations`
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

- `admin@xypes.local / Password123!` (`SUPER_ADMIN`)
- `ops.lead@xypes.local / Password123!` (`ADMIN`)
- `dispatcher@xypes.local / Password123!` (`DISPATCHER`)
- `supervisor@xypes.local / Password123!` (`RESPONDER`)
- `analyst@xypes.local / Password123!` (`VIEWER`)

## CORS Reminder

Set backend `CORS_ORIGIN` to include dashboard origins, for example:

- `http://localhost:3001`
- your LAN/dev origin when testing from another device
- your deployed dashboard domain