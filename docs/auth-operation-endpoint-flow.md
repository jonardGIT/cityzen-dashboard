# Auth and Operation Endpoint Flow

## Purpose

This document explains which endpoints are called when users log in, restore session, and perform CRUD operations in the dashboard.

## Base URLs and Clients

- Backend API base: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000/api/v1`)
- Frontend API proxy base: `/api` (Next.js route handlers)

Client behavior:

- `publicClient`: sends `x-api-key` only, used for login/public endpoints.
- `authClient`: sends `x-api-key` + `Authorization: Bearer <token>`.
- Any `401` response clears auth storage and redirects to `/login`.

## 1. Login Flow

1. User submits credentials on `/login`.
2. Frontend calls:
   - `POST /auth/login` (via `publicClient`, backend `/api/v1/auth/login`)
3. Token is stored in local storage.
4. Frontend restores user profile by calling:
   - `GET /auth/me` (via `authClient`, backend `/api/v1/auth/me`)
5. User context is set and protected UI is enabled.

## 2. Session Restore Flow

1. On app boot, token/user is read from local storage.
2. If token exists, frontend calls:
   - `GET /auth/me`
3. Success keeps user authenticated.
4. Failure clears storage and sends user to `/login`.

## 3. Generic CRUD Operation Flow (/dashboard/[resource])

The resource pages use endpoint metadata from `dashboard-crud-config.flat.json`.

For each operation:

1. Frontend resolves endpoint definition by `resource + operation`.
2. Chooses client:
   - `authRequired: true` -> `authClient`
   - `authRequired: false` -> `publicClient`
3. Calls method/path from config (examples):
   - `GET /incidents`
   - `POST /incidents`
   - `PATCH /incidents/{id}`
   - `DELETE /incidents/{id}`
4. On success, React Query list cache is invalidated and table refreshes.

## 4. Users Module Flow (Proxy-based)

Users page is wired to Next.js API routes under `/api`.

### List users

- Frontend: `GET /api/users`
- Next API route forwards to backend with fallback:
  - `/admin/users`, then `/users`

### Create user

- Frontend: `POST /api/users`
- Next API route forwards to backend with fallback:
  - `/admin/users`, then `/users`

### Capabilities check

- Frontend: `GET /api/users/capabilities`
- Current proxy implementation checks backend OpenAPI and infers booleans for:
  - `canUpdateUser`
  - `canDeleteUser`

## 5. Backend Direct vs Frontend Proxy for Capabilities

Two different paths can exist during testing:

- Backend direct: `GET /api/v1/users/capabilities`
- Frontend proxy: `GET /api/users/capabilities`

If backend implements direct endpoint first, proxy and direct can temporarily differ.
Always validate both in QA when debugging capability mismatches.

## 6. Typical Endpoint Sequence by User Action

### Open app (already logged in)

- `GET /auth/me`
- resource list endpoints (based on current page)

### Create incident (allowed roles)

- optional option loads: `GET /statuses`, `GET /citizens`, `GET /categories`, `GET /severities`
- submit: `POST /incidents`
- refresh list: `GET /incidents`

### Viewer self-report incident

- optional profile link: `POST /citizens/link-me`
- submit report: `POST /incidents/report`
- list refresh (viewer-scoped): `GET /incidents`

### Manage users (admin roles)

- `GET /api/users`
- `GET /api/users/capabilities`
- `POST /api/users` or `PATCH /api/users/{id}` or `DELETE /api/users/{id}`

## 7. Error Handling Summary

- `401`: session cleared; user redirected to `/login`.
- `403`: action forbidden by role/guard.
- `422`: validation issue; frontend maps field errors when available.
- `429`: rate-limit response, surfaced by API error handling.
- `500`: unexpected backend/proxy error; should be investigated with server logs.

## Reference Files

- `src/lib/api/clients.ts`
- `src/context/AuthContext.tsx`
- `src/features/dynamic-crud/api-client.ts`
- `src/features/dynamic-crud/config.ts`
- `src/app/api/users/route.ts`
- `src/app/api/users/capabilities/route.ts`
- `dashboard-crud-config.flat.json`
