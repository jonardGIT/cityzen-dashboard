# User Capabilities Testing Guide

## Purpose
Use this guide to validate role-based access for each seeded QA user in the dashboard.

## Developer Setup
Before testing user capabilities, complete environment setup in:
- `docs/developer-testing-setup.md`

## Test Accounts
- SUPER_ADMIN: admin@xypes.local / Password123!
- ADMIN: ops.lead@xypes.local / Password123!
- DISPATCHER: dispatcher@xypes.local / Password123!
- RESPONDER: supervisor@xypes.local / Password123!
- VIEWER: analyst@xypes.local / Password123!

## Best-Fit Role Assignment (Who Should Hold Each Role)
- SUPER_ADMIN: Platform owner, system architect, or lead DevOps engineer responsible for global configuration, emergency access, and account governance.
- ADMIN: Operations lead, incident command center head, or city emergency coordinator managing day-to-day records and team workflows.
- DISPATCHER: Dispatch desk staff, radio/communications operator, or duty officer coordinating incident triage and assignments.
- RESPONDER: Field supervisors, team leads, or on-ground responders who need to create and update incidents but should not manage users.
- VIEWER: Analysts, auditors, executives, or partner observers who need visibility/reporting access with minimal write permissions.

## Role Skill and Risk Matrix
| Role | Required Skills | Primary Responsibilities | Blast Radius |
| --- | --- | --- | --- |
| SUPER_ADMIN | Advanced platform administration, access control, incident governance, rollback planning | Global configuration, privileged user management, emergency recovery actions | High |
| ADMIN | Operations management, workflow validation, data quality oversight | Manage operational master data and users (below SUPER_ADMIN), ensure process continuity | High |
| DISPATCHER | Incident triage, communication coordination, assignment handling | Create/update incidents, coordinate and manage assignments | Medium |
| RESPONDER | Field operations, incident reporting discipline, status updates | Create/update incidents and provide on-ground updates | Medium |
| VIEWER | Monitoring, reporting, audit review | Observe dashboards, verify records, submit citizen self-reports where applicable | Low |

## Global Rules
- Authentication required for protected pages and protected API endpoints.
- Users can only manage users with strictly lower role level.
- Role hierarchy: SUPER_ADMIN > ADMIN > DISPATCHER > RESPONDER > VIEWER.
- User creation is limited to assignable roles below the logged-in user role.
- VIEWER incident access is restricted to their own incidents only.

## Capability Matrix (Expected)
Legend:
- Y = allowed
- N = not allowed
- R = restricted (owner/self or backend-filtered)

| Capability | SUPER_ADMIN | ADMIN | DISPATCHER | RESPONDER | VIEWER |
| --- | --- | --- | --- | --- | --- |
| Dashboard access | Y | Y | Y | Y | Y |
| Citizens list/get/create | Y | Y | Y | Y | Y |
| Citizens update/delete | Y | Y | N | N | N |
| Citizens link profile (`/citizens/link-me`) | N | N | N | N | Y |
| Agencies create/update/delete | Y | Y | N | N | N |
| Responders create/update/delete | Y | Y | N | N | N |
| Statuses create/update/delete | Y | Y | N | N | N |
| Categories create/update/delete | Y | Y | N | N | N |
| Severities create/update/delete | Y | Y | N | N | N |
| Locations create/update/delete | Y | Y | N | N | N |
| Incidents list/get | Y | Y | Y | Y | R |
| Incidents create/update/delete | Y | Y | Y | Y | N |
| Incidents report (`/incidents/report`) | N | N | N | N | Y |
| Assignments list/get | Y | Y | Y | Y | Y |
| Assignments create/update/delete | Y | Y | Y | N | N |
| Users list/get/create/update/delete | Y | Y | N | N | N |

## Users Module Expected Behavior
### SUPER_ADMIN
- Can create ADMIN, DISPATCHER, RESPONDER, VIEWER.
- Can edit/delete all users except same-or-higher role (none higher).
- `GET /api/users/capabilities` should indicate user management is enabled.

### ADMIN
- Can create DISPATCHER, RESPONDER, VIEWER.
- Cannot create SUPER_ADMIN or ADMIN.
- Can edit/delete only lower roles (DISPATCHER/RESPONDER/VIEWER), not SUPER_ADMIN, not self-role escalation.

### DISPATCHER
- No Users module access.

### RESPONDER
- No Users module access.

### VIEWER
- No Users module access.

## Test Checklist Per User
For each account:
1. Login succeeds and lands on dashboard.
2. Sidebar only shows resources with list permission.
3. For each visible module, verify create/edit/delete button visibility and behavior matches matrix.
4. Attempt direct navigation to forbidden pages (for example `/users`) and verify forbidden behavior.
5. Verify API rejects disallowed actions with `403` and UI surfaces clear error.
6. Verify allowed actions succeed and list refreshes.

## Focused API Checks (Optional)
Use token from each user and test:
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `POST /api/v1/incidents/report`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/capabilities`

Expected:
- Disallowed operations return `403`.
- Viewer incidents are filtered to owner records.
- User management follows role hierarchy constraints.

## Source of Truth
- `dashboard-crud-config.flat.json`
- `src/lib/auth/permissions.ts`
- `src/features/dynamic-crud/permissions.ts`
- `src/features/users/api.ts`
- `README.md` (seeded QA accounts)
