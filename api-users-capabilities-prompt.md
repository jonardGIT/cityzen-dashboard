# Xypes CIRS API: Users Capabilities Contract Alignment

Use this prompt when validating or updating `GET /api/v1/users/capabilities` for the dashboard.

## Current Objective

Keep the endpoint aligned with the dashboard's current capability-aware user-management flow.

This endpoint is no longer a boolean-only admin check. The dashboard expects a capability payload that can drive route access, scoped messaging, and user-management actions from one response.

## Active Dashboard Dependency

The dashboard calls this endpoint from:

- `src/features/users/api.ts` via `fetchUsersCapabilities`
- `src/app/(protected)/users/page.tsx`
- auth bootstrap and permission helpers that normalize roles and capability payloads

The frontend normalizes the payload through `normalizeCapabilities`, so the backend should preserve a stable shape instead of relying on UI inference.

## Route Contract

### Route

- `GET /api/v1/users/capabilities`

### Auth

- Requires authenticated user (`Bearer` token)
- Requires `x-api-key` when backend API-key enforcement is enabled

### Authorization

- Any authenticated role may call this endpoint
- `401` is for missing or invalid auth
- `403` should be reserved for true policy denial, not used as a substitute for returning a reduced capability payload

## Success Response Shape (200)

Return a JSON object with these fields:

```json
{
  "role": "CITY_ADMIN",
  "label": "City/Municipal Admin",
  "permissions": ["user:create:city", "incident:read:city"],
  "scope": ["city:city-1"],
  "canUpdateUser": true,
  "canDeleteUser": false
}
```

### Field Expectations

- `role`: current canonical backend role or supported transitional alias
- `label`: human-readable role label for UI display
- `permissions`: scoped capability keys used by dashboard auth and navigation logic
- `scope`: scope tokens describing the actor's effective operational boundary
- `canUpdateUser`: optional boolean; include when user-management update behavior should be explicit
- `canDeleteUser`: optional boolean; include when user-management delete behavior should be explicit

## Compatibility Rules

- Canonical contract roles are the current backend role set and any active aliases the frontend already normalizes, such as `NATIONAL_ADMIN` to `SYSTEM_ADMIN` and `CITY_ADMIN` to `DEPARTMENT_MANAGER`.
- Do not reintroduce `SUPER_ADMIN`, `ADMIN`, or `VIEWER` as the canonical live contract.
- Preserve capability keys and scope semantics that match backend enforcement.
- If a role has no user-management access, still return the capability payload with false or omitted user-management booleans instead of failing the endpoint.
- Do not emit `500` for valid authenticated users because of role-mapping gaps.

## Backend Implementation Notes

### 1. Compute capabilities centrally

- Derive role label, permissions, scope, and user-management flags in one backend service path
- Reuse the same policy source used for protected users routes wherever possible

### 2. Keep payload stable

- `permissions` must always be an array
- `scope` should resolve to a stable serializable structure that the dashboard can normalize into a string list
- `canUpdateUser` and `canDeleteUser` should remain boolean when present

### 3. Align with scoped user management

- `SYSTEM_ADMIN` or equivalent global admins may have full user-management booleans
- scoped admins such as `DEPARTMENT_MANAGER` or `CITY_ADMIN` may have `canUpdateUser: true` and `canDeleteUser: false`
- operational and read-only roles should still receive their read capabilities without user-management rights

### 4. Error handling

- return `401` for missing or invalid auth
- return `403` only when the endpoint itself is intentionally blocked
- reserve `500` for real unexpected server failures

## OpenAPI And Docs

Document:

- endpoint path and auth requirements
- full success schema including `role`, `label`, `permissions`, `scope`, and optional booleans
- `401` and `403` responses
- examples for both a scoped admin and a non-user-management role

## Focused Validation Checklist

- [ ] `SYSTEM_ADMIN` or `NATIONAL_ADMIN` receives `200` with full capability payload
- [ ] `DEPARTMENT_MANAGER` or `CITY_ADMIN` receives `200` with scoped permissions and correct booleans
- [ ] `SUPERVISOR`, `DISPATCHER`, `RESPONDER`, `CITIZEN_REPORTER`, and `AUDITOR` receive `200` with role-appropriate capabilities
- [ ] unauthenticated request receives `401`
- [ ] response never regresses to boolean-only payload when role, label, permissions, and scope are available
- [ ] existing `/users` list, create, update, delete, and restore enforcement stays unchanged

## Acceptance Criteria

- Endpoint exists at `GET /api/v1/users/capabilities`
- Authenticated users receive a stable capability payload instead of role-mapping errors
- Dashboard user-management UI can rely on role, permission, scope, and boolean flags together
- Legacy role names remain normalization-only compatibility paths, not the documented primary contract
- QA guidance in `docs/user-capabilities-testing.md` remains consistent with endpoint behavior
