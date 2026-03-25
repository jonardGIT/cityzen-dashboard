# Developer Testing Setup

## Purpose
Use this guide to prepare the local environment before running role and capability tests.

## 1. Install and Run Frontend
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Expected local URL: `http://localhost:3001`

## 2. Configure Environment Variables
Create `.env.local` in project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_API_KEY=local-dev-key
```

## 3. Backend Requirements
- Xypes CIRS API must be running and reachable from `NEXT_PUBLIC_API_BASE_URL`.
- API key validation must accept the value set in `NEXT_PUBLIC_API_KEY`.
- CORS must include dashboard origin (for local: `http://localhost:3001`).
- Authentication endpoints must be available:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`

## 4. Database and Seed Data
- Roles must exist in backend auth system:
  - `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `RESPONDER`, `VIEWER`
- Seed QA users must exist and be active.
- Reference datasets should be available for stable testing:
  - citizens, statuses, categories, severities, locations

## 5. Frontend Quality Gates
Run before executing manual role tests:
- `npm run lint`
- `npm run build` (optional but recommended)

## 6. Required Config Sources (Do Not Drift)
When validating permissions, align with:
- `dashboard-crud-config.flat.json` (endpoint-level allowed roles)
- `src/lib/auth/permissions.ts` (UI feature flags and role hierarchy)
- `src/features/dynamic-crud/permissions.ts` (generic endpoint guard logic)
- `src/features/users/api.ts` (`/api/users/capabilities` behavior)

## 7. Troubleshooting Setup Issues
- If login fails:
  - verify API base URL and API key
  - verify backend is running and CORS allows frontend origin
- If all actions appear disabled:
  - verify token exists after login
  - verify role payload from `/auth/me`
- If options in modals are empty:
  - check reference endpoints for `4xx/5xx`
  - verify seeded reference data exists
