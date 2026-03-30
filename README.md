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

- `publicClient`: API-key only, used for login and token refresh
- `authClient`: API-key + Bearer token with one refresh retry on `401`
- Both clients are in `src/lib/api/clients.ts`
- Unauthorized sessions are cleared only after refresh is unavailable or rejected

## Auth and Session Behavior

- Login endpoint: `POST /auth/login`
- Password reset request endpoint: `POST /auth/password-reset/request`
- Password reset confirm endpoint: `POST /auth/password-reset/confirm`
- Refresh endpoint: `POST /auth/refresh`
- Current user endpoint: `GET /auth/me`
- Session inventory endpoint: `GET /auth/sessions`
- Session revoke endpoint: `DELETE /auth/sessions/:id`
- MFA endpoints:
  - `POST /auth/mfa/setup`
  - `POST /auth/mfa/enable`
  - `POST /auth/mfa/disable`
- Access token, refresh token, user, and session metadata are stored in local storage
- Forgot-password and reset-password public flows are available from the login experience
- In non-production environments, password reset request responses may expose `resetToken` and `resetExpiresAt` for local development testing
- On app boot, session restore is attempted via `/auth/me`
- Protected API calls attempt a refresh before redirecting to `/login`
- Login shows explicit re-authentication reasons for sign-out, expired or revoked sessions, MFA changes, and other server-driven invalidations when the API provides them
- The profile page exposes active-session management and MFA enrollment for permitted roles
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
