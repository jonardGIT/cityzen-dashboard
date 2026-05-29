# User Capabilities Testing Guide

## Purpose

Use this guide to validate dashboard access against the current API pilot boundary. The contract source of truth is the synced `dashboard-crud-config.flat.json` copy from the API repo, plus the live `/users/capabilities` payload returned for the authenticated user.

## Developer Setup

Before testing user capabilities, complete environment setup in:

- `docs/developer-testing-setup.md`

## Pilot Role Model

The dashboard should validate against the current pilot role family, not the older `SYSTEM_ADMIN` / `DEPARTMENT_MANAGER` naming:

- `NATIONAL_ADMIN`
- `REGIONAL_DIRECTOR`
- `PROVINCIAL_ADMIN`
- `CITY_ADMIN`
- `CITY_CONTENT_EDITOR`
- `DISPATCHER`
- `RESPONDER`
- `CITIZEN_REPORTER`
- `AUDITOR`

Legacy aliases may still be normalized in frontend code for backward compatibility, but QA expectations should use the pilot role names above.

## Seeded QA Baseline Accounts

The local pilot seed commonly includes these baseline accounts:

- `NATIONAL_ADMIN`: `admin@xypes.local` / `Password123!`
- `CITY_ADMIN`: `ops.lead@xypes.local` / `Password123!`
- `DISPATCHER`: `dispatcher@xypes.local` / `Password123!`
- `RESPONDER`: `supervisor@xypes.local` / `Password123!`
- `CITIZEN_REPORTER`: `analyst@xypes.local` / `Password123!`
- `AUDITOR`: `auditor@xypes.local` / `Password123!`

`REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_CONTENT_EDITOR` should be validated when those fixtures are seeded in the active environment.

## Global Rules

- Authentication is required for protected pages and protected API endpoints.
- Navigation and protected-route checks should be capability-aware, not role-only.
- `/api/users/capabilities` is available to any authenticated user and is the dashboard's source of truth for scoped permission flags.
- User-management UI must honor backend booleans such as `canManageUsers`, `canCreateUser`, `canUpdateUser`, and `canDeleteUser` when they are present.
- `assignments` remains a custom workflow page; create/respond actions should only appear when assignment-management capabilities are present.
- `audit-logs` remains a custom protected review surface.
- Geography resources remain contract-backed in `dashboard-crud-config.flat.json`, but geography and `mobile-content` navigation are intentionally outside the current pilot-visible primary navigation boundary.
- `401` indicates missing or invalid auth. `403` indicates an authenticated role or capability mismatch.

## Capability Guidance

The dashboard should prefer the scoped capability keys returned by the backend. Important examples in the current pilot flow include:

- `incident:read:self`
- `incident:read:assigned`
- `incident:read:city`
- `incident:read:province`
- `incident:read:region`
- `incident:read:global`
- `assignment:create:city`
- `assignment:update:city`
- `assignment:read:own`
- `citizen:link:self`
- `audit:read:global`
- `audit:export:global`
- `user:create:city`
- `user:update:city`
- `user:delete:city`
- `user:manage:city`

When backend booleans are present for the Users module, the dashboard must treat them as authoritative over looser role assumptions.

## Pilot Boundary Summary

This is the current dashboard-facing pilot resource boundary reflected by the synced contract artifact:

- Core operational/custom surfaces: `incidents`, `assignments`, `audit-logs`, `users`
- Generic or shared CRUD-backed resources: `citizens`, `agencies`, `responders`, `statuses`, `categories`, `severities`
- Contract-backed admin/audit resources present in the artifact: `adminUsers`, `adminUserMfaCompliance`, `adminUserAccessReview`, `adminSecurityDataGovernance`, `auditLogs`

The synced contract artifact also still contains geography resources. For the current Tuguegarao-first pilot, those resources should be treated as contract-supported but intentionally hidden from primary navigation unless the pilot-visible workflow is explicitly expanded.

The dashboard should not assume removed or hidden pilot resources such as `mobile-content` are still available just because older code paths or docs mention them.

## Expected Access Patterns

### `NATIONAL_ADMIN`

- Full access to protected operational surfaces.
- User-management access remains capability-aware, not unconditional.
- Can access national-only admin resources such as `adminUsers` when the synced contract exposes them.

### `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`

- Operational management access is bounded by scoped capabilities.
- `users/list` is allowed by the current pilot contract for this LGU admin family.
- Create, update, and delete actions must still follow the backend capability payload.

### `CITY_CONTENT_EDITOR`

- Included in current pilot MFA optional endpoints and read access to configured reference-data resources.
- Should not be treated as a general user-management or assignments-management role without explicit capabilities.

### `DISPATCHER`

- Operational incident and assignment access.
- No Users module navigation unless backend capability data explicitly allows it.

### `RESPONDER`

- Incident read/update behavior remains scoped.
- No assignment-create UI unless the backend actually emits assignment-management capabilities.

### `CITIZEN_REPORTER`

- Self-service routing only.
- Incident reporting and citizen profile linking are scoped to self-service capabilities.
- Should not receive operational navigation such as assignments or audit logs.

### `AUDITOR`

- Audit review access.
- Incident read access where the backend emits the required audit-safe incident permissions.
- No user-management or assignment-management UI unless explicitly granted by backend capabilities.

## Live Validation Snapshot

Latest local smoke observations should be recorded against:

- `GET /api/v1/auth/me`
- `GET /api/v1/users/capabilities`
- the relevant protected dashboard page

At minimum, verify that:

- the backend emits pilot role names
- the dashboard normalizes legacy aliases without showing legacy labels in QA guidance
- protected navigation matches both role family and capabilities
- geography resources stay absent from primary navigation unless the current pilot boundary changes
- user-management buttons honor backend booleans when provided
- assignment create actions are hidden when only assignment read access is present

## Test Checklist Per User

For each account under test:

1. Login succeeds and the landing route matches the user's capability scope.
2. Sidebar navigation reflects the current pilot boundary only.
3. Direct navigation to a forbidden protected route returns a forbidden state or equivalent denial UI.
4. Visible create/update/delete actions align with both role family and backend capability payload.
5. `assignments` create actions appear only when assignment-management capability keys are present.
6. Users module actions honor `canManageUsers`, `canCreateUser`, `canUpdateUser`, and `canDeleteUser` when returned.
7. Citizen self-service users are routed to self-service pages, not operator pages.
8. Audit-only users can reach audit views without receiving operator mutation UI.

## Release Signoff Worksheet

Use this worksheet to close the pilot readiness item for real operator accounts and capabilities in the paired API environment.

Environment and operator record:

- Environment checked: `<fill-environment>`
- Checked at: `<fill-time>`
- Checked by: `Jonard M. Delos Santos`
- Business acknowledgment: `Dennis M. Tobias`

Account roster under test:

| Account label      | Real account identifier | Expected role | Expected landing route | Result | Notes |
| ------------------ | ----------------------- | ------------- | ---------------------- | ------ | ----- |
| Primary operator   |                         |               |                        |        |       |
| Secondary operator |                         |               |                        |        |       |
| Auditor reviewer   |                         |               |                        |        |       |

Capability verification record:

| Account label      | `/api/auth/me` ok | `/api/users/capabilities` ok | Navigation scope correct | Mutation visibility correct | Direct forbidden route denied | Final result | Notes |
| ------------------ | ----------------- | ---------------------------- | ------------------------ | --------------------------- | ----------------------------- | ------------ | ----- |
| Primary operator   |                   |                              |                          |                             |                               |              |       |
| Secondary operator |                   |                              |                          |                             |                               |              |       |
| Auditor reviewer   |                   |                              |                          |                             |                               |              |       |

Minimum signoff rules:

1. The backend must emit the intended pilot role names for the tested accounts.
2. `/api/users/capabilities` must match the expected operator scope for each tested account.
3. The sidebar and protected routes must stay within the current pilot-visible boundary.
4. Forbidden protected routes must deny correctly.
5. Mutation UI must follow backend capabilities, not looser role assumptions.

Outcome:

- Operator-account verification status: `<pass-fail>`
- Follow-up actions: `<fill-actions-or-none>`
- Evidence location: `<fill-ticket-or-release-log-location>`

## Focused API Checks

Use a token for the active user and validate the contract directly where needed:

- `GET /api/v1/auth/me`
- `GET /api/v1/users/capabilities`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `GET /api/v1/assignments`
- `POST /api/v1/assignments`
- `GET /api/v1/audit-logs`
- `GET /api/v1/users`
- `GET /api/v1/admin/users`

Expected:

- unauthenticated requests fail with `401`
- authenticated but out-of-scope requests fail with `403`
- self-service flows remain scoped to the authenticated citizen reporter
- assignment creation and user-management behavior match the backend capability payload, not just the frontend role family

## Source of Truth

- `dashboard-crud-config.flat.json`
- `/home/nhad/xypes/xypes-cirs-api/docs/dashboard-crud-config.flat.json`
- `src/lib/auth/navigation.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/roles.ts`
- `src/features/auth/api.ts`
- `src/features/dynamic-crud/config.ts`
