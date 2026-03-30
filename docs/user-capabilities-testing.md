# User Capabilities Testing Guide

## Purpose
Use this guide to validate role-based access for each seeded QA user in the dashboard.

## Developer Setup
Before testing user capabilities, complete environment setup in:
- `docs/developer-testing-setup.md`

## Test Accounts
- SYSTEM_ADMIN: admin@xypes.local / Password123!
- DEPARTMENT_MANAGER: ops.lead@xypes.local / Password123!
- DISPATCHER: dispatcher@xypes.local / Password123!
- RESPONDER: supervisor@xypes.local / Password123!
- CITIZEN_REPORTER: analyst@xypes.local / Password123!

Current local seed gap:
- No dedicated AUDITOR account is documented or seeded in this repo. Auditor-only dashboard behavior is implemented, but live validation requires a backend seed or a manually created Auditor user.

## Best-Fit Role Assignment (Who Should Hold Each Role)
- SYSTEM_ADMIN: Platform owner, system architect, or lead DevOps engineer responsible for global configuration, emergency access, and account governance.
- DEPARTMENT_MANAGER: Operations lead, incident command center head, or city emergency coordinator managing day-to-day records and team workflows.
- SUPERVISOR: Shift lead or operations supervisor overseeing dispatchers and responders, with broader operational write access but not top-level governance.
- DISPATCHER: Dispatch desk staff, radio/communications operator, or duty officer coordinating incident triage and assignments.
- RESPONDER: On-ground responders who need to read and update assigned operational work but should not manage users.
- CITIZEN_REPORTER: Public or partner users who need self-service incident reporting and profile linking tied to their own scope.
- AUDITOR: Compliance or review staff who need audit-log visibility without operational write access.

## Role Skill and Risk Matrix
| Role | Required Skills | Primary Responsibilities | Blast Radius |
| --- | --- | --- | --- |
| SYSTEM_ADMIN | Advanced platform administration, access control, incident governance, rollback planning | Global configuration, privileged user management, emergency recovery actions | High |
| DEPARTMENT_MANAGER | Operations management, workflow validation, data quality oversight | Manage operational master data and users, ensure process continuity | High |
| SUPERVISOR | Command oversight, dispatch workflow review, incident coordination | Manage incident and assignment operations across a wider team scope | Medium |
| DISPATCHER | Incident triage, communication coordination, assignment handling | Create/update incidents, coordinate and manage assignments | Medium |
| RESPONDER | Field operations, incident reporting discipline, status updates | Update assigned operational work and provide on-ground updates | Medium |
| CITIZEN_REPORTER | Basic self-service reporting, evidence submission | Report own incidents, link citizen profile, review own-scope records | Low |
| AUDITOR | Audit review, controls verification, evidence handling | Review audit trails and request histories without operational mutation access | Low |

## Global Rules
- Authentication required for protected pages and protected API endpoints.
- Users can only manage users with strictly lower role level.
- Role hierarchy: SYSTEM_ADMIN > DEPARTMENT_MANAGER > SUPERVISOR > DISPATCHER > AUDITOR > RESPONDER > CITIZEN_REPORTER.
- User creation is limited to assignable roles below the logged-in user role.
- `GET /users/capabilities` is available to any authenticated user and returns role, label, permissions, scope, `canUpdateUser`, and `canDeleteUser`.
- CITIZEN_REPORTER incident access is restricted to their own records or explicit self-service flows.
- `401` indicates missing or invalid token or API key forwarding. `403` indicates authenticated role mismatch.

## Capability Matrix (Expected)
Legend:
- Y = allowed
- N = not allowed
- R = restricted (owner/self or backend-filtered)

| Capability | SYSTEM_ADMIN | DEPARTMENT_MANAGER | SUPERVISOR | DISPATCHER | RESPONDER | CITIZEN_REPORTER | AUDITOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard access | Y | Y | Y | Y | Y | R | Y |
| Citizens list/get/create | Y | Y | N | N | N | N | N |
| Citizens update/delete | Y | Y | N | N | N | N | N |
| Citizens link profile (`/citizens/link-me`) | N | N | N | N | N | Y | N |
| Agencies create/update/delete | Y | Y | N | N | N | N | N |
| Responders create/update/delete | Y | Y | N | N | N | N | N |
| Statuses create/update/delete | Y | Y | N | N | N | N | N |
| Categories create/update/delete | Y | Y | N | N | N | N | N |
| Severities create/update/delete | Y | Y | N | N | N | N | N |
| Incidents list/get | Y | Y | Y | Y | Y | R | N |
| Incidents create/update/delete | Y | Y | Y | Y | Y | N | N |
| Incidents report (`/incidents/report`) | N | N | N | N | N | Y | N |
| Assignments list/get | Y | Y | Y | Y | Y | N | N |
| Assignments create/update/delete | Y | Y | Y | Y | N | N | N |
| Audit logs list/get | Y | N | N | N | N | N | Y |
| Users list/get/create | Y | Y | N | N | N | N | N |
| Users update/delete | Y | R | N | N | N | N | N |
| Users capabilities | Y | Y | Y | Y | Y | Y | Y |

## Live Validation Snapshot (March 30, 2026)
Verified directly against `http://localhost:3000/api/v1` with `x-api-key: local-dev-key`:

| Account | `/auth/me role` | `/users/capabilities` | `/citizens` | `/incidents` | `/incidents/report` | `/citizens/link-me` | `/audit-logs` | `/users` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| admin@xypes.local | SYSTEM_ADMIN | 200 | 200 | 200 | 403 | 403 | 200 | 200 |
| ops.lead@xypes.local | DEPARTMENT_MANAGER | 200 | 200 | 200 | 403 | 403 | 403 | 200 |
| dispatcher@xypes.local | DISPATCHER | 200 | 403 | 200 | 403 | 403 | 403 | 403 |
| supervisor@xypes.local | RESPONDER | 200 | 403 | 200 | 403 | 403 | 403 | 403 |
| analyst@xypes.local | CITIZEN_REPORTER | 200 | 403 | 422 | 400 | 201 | 403 | 403 |

Notes from live validation:
- The backend already emits the new role names in login and `/auth/me` payloads.
- `DEPARTMENT_MANAGER` currently receives `canDeleteUser: false` from `/users/capabilities`, so the frontend must honor capability flags in addition to role checks.
- `CITIZEN_REPORTER` currently has `scope: "own"` and a successful `citizens/link-me` flow.
- The local frontend proxy at `http://localhost:3001/api/users/capabilities` was not reachable during this smoke test, so proxy behavior still requires a live frontend dev server for manual validation.

## Users Module Expected Behavior
### SYSTEM_ADMIN
- Can create DEPARTMENT_MANAGER, SUPERVISOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR.
- Can edit/delete all users except same-or-higher role (none higher).
- `GET /api/users/capabilities` should indicate user management is enabled.

### DEPARTMENT_MANAGER
- Can create SUPERVISOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER.
- Cannot create SYSTEM_ADMIN or peer DEPARTMENT_MANAGER users.
- Backend currently reports update enabled and delete disabled in the local seed environment.

### DISPATCHER
- No Users module access.

### RESPONDER
- No Users module access.

### CITIZEN_REPORTER
- No Users module access.

### AUDITOR
- Audit log UI access only.
- No Users module access.

## Test Checklist Per User
For each account:
1. Login succeeds and lands on dashboard.
2. Sidebar and landing route reflect capability scope, including self-service routing for citizen users.
3. For each visible module, verify create/edit/delete button visibility and behavior matches matrix.
4. Attempt direct navigation to forbidden pages (for example `/users`) and verify forbidden behavior.
5. Verify API rejects disallowed actions with `403` and UI surfaces clear unauthorized state.
6. Verify `401` states clearly indicate missing auth or API-key forwarding problems.
6. Verify allowed actions succeed and list refreshes.

## Focused API Checks (Optional)
Use token from each user and test:
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `POST /api/v1/incidents/report`
- `POST /api/v1/citizens/link-me`
- `GET /api/v1/audit-logs`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/capabilities`

Expected:
- Disallowed operations return `403`.
- Citizen Reporter records are filtered to owner records or self-service flows.
- User management follows role hierarchy constraints plus capability flags.

## Source of Truth
- `dashboard-crud-config.flat.json`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/navigation.ts`
- `src/lib/auth/roles.ts`
- `src/features/dynamic-crud/permissions.ts`
- `src/features/users/api.ts`
- `README.md` (seeded QA accounts)
