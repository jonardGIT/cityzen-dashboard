# Auth and Operation Endpoint Flow

## Purpose

This document describes the dashboard's current pilot-boundary auth flow, capability hydration, and resource access behavior after syncing to the API-generated contract artifact.

## Base URLs and Clients

- Backend API base: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000/api/v1`)
- Frontend proxy base: `/api` (Next.js route handlers)

Client behavior:

- `publicClient`: used for public auth entrypoints through the frontend proxy.
- `authClient`: used for authenticated backend calls and attaches `Authorization: Bearer <token>`.
- Both clients preserve `x-api-key` behavior.
- Any `401` response clears local auth state and redirects to `/login`.

## 1. Login Flow

1. User submits credentials on `/login`.
2. Frontend calls `POST /api/auth/login` through `publicClient`.
3. The auth proxy forwards to backend `POST /api/v1/auth/login`.
4. The returned token/session payload is normalized and stored locally.
5. Frontend restores the authenticated user with `GET /api/auth/me`.
6. Frontend then hydrates capabilities with `GET /api/users/capabilities`.
7. Protected navigation and action visibility are derived from both normalized role and capability payloads.

## 2. Session Restore Flow

1. On app boot, the dashboard reads the stored auth session and user snapshot.
2. If a session exists, frontend calls `GET /api/auth/me`.
3. On success, frontend refreshes `GET /api/users/capabilities`.
4. On failure, local auth storage is cleared and the user is redirected to `/login`.

## 3. Capabilities Flow

- Frontend: `GET /api/users/capabilities`
- Frontend proxy: forwards directly to backend `GET /api/v1/users/capabilities`
- The dashboard consumes the upstream payload as the source of truth and normalizes:
  - `role`
  - `label`
  - `permissions`
  - `scope`
  - `canManageUsers`
  - `canCreateUser`
  - `canUpdateUser`
  - `canDeleteUser`

The proxy no longer infers management booleans from OpenAPI. It forwards the backend capability payload directly.

## 4. Contract-Driven Resource Flow

The dashboard loads endpoint metadata from `dashboard-crud-config.flat.json`, which is synced from the API copy at `xypes-cirs-api/docs/dashboard-crud-config.flat.json`.

For contract-driven operations:

1. Frontend resolves the endpoint by `resource + operation`.
2. It chooses `authClient` or `publicClient` based on `authRequired`.
3. It calls the configured method/path from the synced artifact.
4. On mutation success, React Query invalidates the relevant list caches.

Current pilot-boundary contract resources include:

- `citizens`
- `agencies`
- `responders`
- `statuses`
- `categories`
- `severities`
- `incidents`
- `assignments`
- `users`
- `adminUsers`
- `adminUserMfaCompliance`
- `adminUserAccessReview`
- `adminSecurityDataGovernance`
- `auditLogs`

## 5. Custom Protected Surfaces vs Generic CRUD

The contract artifact is broader than the dashboard's current generic CRUD navigation.

- `assignments` remains a custom protected workflow surface at `/assignments`.
- `audit-logs` remains a custom protected review surface at `/audit-logs`.
- The dashboard should not reintroduce removed pilot routes such as geography or `mobile-content` navigation when they are absent from the synced contract artifact.

## 6. Users Module Flow

### Users list and mutations

- Frontend: `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `DELETE /api/users/{id}`
- The Next.js proxy forwards to the backend users/admin-users endpoints using the existing fallback strategy.

### Capability-aware access

- Page and nav visibility require both a management role family and backend capability approval.
- `canManageUsers`, `canCreateUser`, `canUpdateUser`, and `canDeleteUser` must all be honored when the backend provides them.
- Role membership alone is not sufficient for create/update/delete UI.

## 7. Typical Endpoint Sequence by User Action

### Open app with an existing session

- `GET /api/auth/me`
- `GET /api/users/capabilities`
- current page data requests

### Open assignments board

- `GET /assignments`
- assignment option sources as needed for the custom page

### Create assignment from the custom assignments surface

- option loads: `GET /incidents`, `GET /responders`
- submit: `POST /assignments`
- refresh: `GET /assignments`

### Review audit logs

- `GET /api/dashboard/audit-logs`
- optional detail requests when the custom page opens a record detail view

## 8. Error Handling Summary

- `401`: session cleared, user redirected to `/login`.
- `403`: authenticated but outside role or capability boundary.
- `422`: validation issue, surfaced to forms when structured errors are present.
- `429`: rate-limit response, surfaced through centralized API handling.
- `503`: upstream service unavailable or backend schema drift state.

## Reference Files

- `src/features/auth/api.ts`
- `src/context/AuthContext.tsx`
- `src/app/api/auth/[...path]/route.ts`
- `src/app/api/users/capabilities/route.ts`
- `src/lib/auth/navigation.ts`
- `src/features/dynamic-crud/config.ts`
- `dashboard-crud-config.flat.json`
