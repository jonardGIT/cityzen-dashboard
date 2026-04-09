# Xypes CIRS API: Users Capabilities Endpoint Implementation

> **SUPERSEDED** — This prompt was written against legacy role names (`SUPER_ADMIN`, `ADMIN`, `VIEWER`) and the original boolean-only contract (`canUpdateUser`, `canDeleteUser`).  
> The backend now uses the current role set (`SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`, `SUPERVISOR`, `DISPATCHER`, `RESPONDER`, `CITIZEN_REPORTER`, `AUDITOR`) and returns scoped capability keys (e.g. `incident:read:department`, `assignment:create:department`).  
> Refer to `docs/user-capabilities-testing.md` for the current capability matrix.

---

## Original Objective (historical)

Implement `GET /users/capabilities` so the dashboard can dynamically determine whether the current authenticated user can update and delete users.

## Why This Is Needed

The frontend Users module already calls this endpoint and expects a stable response contract:

- `GET /api/users/capabilities`
- Expected shape:
  ```json
  {
    "canUpdateUser": true,
    "canDeleteUser": true
  }
  ```

Current behavior observed in QA:

- `SUPER_ADMIN` and `ADMIN` receive `500`
- non-admin roles receive `403`

The `500` for authorized roles should be fixed.

## Endpoint Contract

### Route

- `GET /api/v1/users/capabilities`

### Auth

- Requires authenticated user (`Bearer` token)
- Requires API key if backend key enforcement is enabled

### Authorization

- Recommended role policy:
  - `SUPER_ADMIN`, `ADMIN`: allowed
  - `DISPATCHER`, `RESPONDER`, `VIEWER`: forbidden (`403`)

### Success Response (200)

```json
{
  "canUpdateUser": true,
  "canDeleteUser": true
}
```

### Error Responses

- `401` unauthenticated / invalid token
- `403` authenticated but not allowed role
- `500` only for true unexpected server errors (should not happen for normal authorized flow)

## Capability Rules

Return booleans based on current backend policy. At minimum:

- `canUpdateUser`: whether current user can use update-user operations
- `canDeleteUser`: whether current user can use delete-user operations

If your backend supports feature flags or temporary policy toggles, apply them here so UI behavior stays in sync with backend state.

## Implementation Notes

### 1. Add Controller/Route

- Add `GET /users/capabilities` handler in Users controller
- Reuse existing auth/guard middleware

### 2. Add Service Method

- Implement a service method that computes capability flags for the authenticated principal
- Keep logic centralized (avoid duplicating role checks in multiple controllers)

### 3. Return Stable DTO

- Return a typed DTO/object with exactly:
  - `canUpdateUser: boolean`
  - `canDeleteUser: boolean`

### 4. Error Handling

- Do not throw generic errors for valid admin users
- Return explicit `403` for disallowed roles
- Log exceptions with context for debugging

### 5. OpenAPI/Swagger

Document:

- endpoint path
- auth requirements
- response schema
- 401/403 responses

## Frontend Dependency (Already Implemented)

The dashboard already calls this endpoint from:

- `src/features/users/api.ts` (`fetchUsersCapabilities`)
- `src/app/(protected)/users/page.tsx`

UI behavior currently depends on this response to:

- enable/disable edit and delete actions
- show capability warnings

No frontend change required once backend contract is implemented correctly.

## Testing Checklist

### Functional

- [ ] `SUPER_ADMIN` receives `200` with boolean flags
- [ ] `ADMIN` receives `200` with boolean flags
- [ ] `DISPATCHER` receives `403`
- [ ] `RESPONDER` receives `403`
- [ ] `VIEWER` receives `403`
- [ ] Unauthenticated request receives `401`

### Contract

- [ ] Response includes both keys: `canUpdateUser`, `canDeleteUser`
- [ ] Values are booleans (never null/string)
- [ ] Response shape is stable across environments

### Regression

- [ ] Existing `/users` list/create/update/delete endpoints remain unchanged
- [ ] User role hierarchy and restrictions still enforced

## Example Responses

### Allowed (SUPER_ADMIN)

```json
HTTP 200
{
  "canUpdateUser": true,
  "canDeleteUser": true
}
```

### Forbidden (VIEWER)

```json
HTTP 403
{
  "message": "Forbidden"
}
```

## Acceptance Criteria

- Endpoint exists at `GET /api/v1/users/capabilities`
- Authorized admin roles return `200` with valid payload
- Non-admin roles return `403`
- Frontend Users page no longer sees `500` for admin roles
- QA script `scripts/qa/role-capabilities.ps1` shows non-error status for admin capability check
