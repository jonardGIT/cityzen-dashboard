# CIRS Dashboard — Copilot Instructions

This is the CIRS Dashboard repository. It is the operational frontend for the CIRS platform — a Next.js LGU operations product, not a generic national administration shell. The CIRS API at `/home/nhad/xypes/xypes-cirs-api` is the **source of truth** for the contract, roles, and data shape consumed here.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Ant Design 6 for UI composition
- TanStack React Query 5 + Axios for server state and API access
- Vitest + Testing Library (jsdom), setup at `src/test/setup.ts`
- Backend integration: REST `/api/v1`, base path served by the CIRS API

## Repository layout

- `src/app/` — App Router pages, layouts, route groups, API proxy routes
- `src/app/(protected)/` — authenticated dashboard pages wrapped by `AuthGate` and `AppShell`
- `src/components/` — shared UI by concern: `auth`, `audit`, `common`, `crud`, `layout`
- `src/features/` — domain modules: `auth`, `users`, `incidents`, `assignments`, `audit-logs`, `reference-data`, `dynamic-crud`
- `src/lib/api/` — Axios clients and response normalization / pagination helpers
- `src/lib/auth/` — token storage, role and permission helpers, navigation logic
- `src/lib/cirs/` — typed API client resources, constants, errors, shared API types
- `src/context/AuthContext.tsx`, `src/providers/AppProviders.tsx` — app-wide auth and provider wiring
- `src/hooks/` — URL query parameter state and reusable hooks
- `src/types/api.ts`, `src/types/auth.ts` — cross-cutting dashboard contract types
- `dashboard-crud-config.flat.json` (in repo root and mirrored at `xypes-cirs-api/docs/`) — drives the dynamic CRUD engine

## Architecture

- Protected operational pages belong under `src/app/(protected)/` behind `AuthGate` + `AppShell`.
- Feature-specific behavior lives in `src/features/<domain>/`, not in page files or ad hoc shared folders.
- Shared UI reused across domains lives in `src/components/` under the right concern.
- Dynamic resource management is driven by `dashboard-crud-config.flat.json` plus the dynamic CRUD feature module.
- Use custom feature modules when a domain has meaningful behavior beyond generic CRUD (incidents, assignments, auth, audit logs, capability-aware navigation).
- Pages stay thin: compose feature hooks, feature APIs, and shared components.

## API integration

All API communication goes through centralized client layers.

- `publicClient` — login and intentionally public endpoints.
- `authClient` — authenticated requests, bearer token attachment, refresh handling, shared response behavior.
- Both clients preserve the `x-api-key` header behavior.
- Reuse normalization and pagination helpers from `src/lib/api/`.
- Typed resource integrations live in `src/lib/cirs/` or in feature-local API modules under `src/features/*/api.ts`.
- Use Next.js API proxy routes only when the existing architecture already routes a concern through `src/app/api/` for server-side reasons.
- Never issue raw `fetch` calls from page or component code when centralized clients or typed wrappers cover it.

Standard backend behavior:
- Public endpoints: `/api/v1/health`, `/api/v1/openapi.json`, `/api/v1/docs`.
- Validation failures return `422` with structured payloads.
- Rate limiting returns `429` with `Retry-After` and `X-RateLimit-*` headers.
- Surface 401, 403, 404, 422, and 429 consistently.

Reference: [docs/auth-operation-endpoint-flow.md](../docs/auth-operation-endpoint-flow.md), [docs/account-security.md](../docs/account-security.md), [docs/audit-logs.md](../docs/audit-logs.md), [docs/geography-crud-drift.md](../docs/geography-crud-drift.md).

## Auth and RBAC

Auth flow:

1. Login through the public auth endpoint.
2. Persist tokens via shared token storage utilities.
3. Restore auth state on app startup.
4. Load the authenticated user and capability context.
5. Drive navigation and page actions from role and capability checks.

Rules:

- Navigation is capability-aware, not page-hard-coded.
- Use `AuthGate`, `RoleGuard`, and existing auth utilities — do not invent one-off page guards.
- UI visibility checks must mirror backend enforcement, especially for create / update / delete / restore / export / audit / assignment actions.
- Do not broaden role assumptions in the dashboard if the API contract or backend role groups do not support them.
- Hiding actions is never a substitute for backend enforcement.

Reference: [docs/user-capabilities-testing.md](../docs/user-capabilities-testing.md).

## Dynamic CRUD engine

- Use the dynamic CRUD engine for standard reference-data and conventional resources that fit the shared config-driven model.
- Use custom feature modules when the domain needs bespoke UX, richer workflows, or behavior that does not fit a generic table-form-modal lifecycle.
- Keep resource names, endpoint paths, allowed operations, and role expectations aligned with the backend configuration and OpenAPI-derived understanding.
- Reuse `CrudResourcePage`, existing CRUD tables / modals, field configuration, and query helpers — do not clone similar generic screens.
- Treat OpenAPI / config drift as a real problem. Fix the mismatch instead of papering over it inside the UI.

When deciding between dynamic CRUD and a custom feature module, default to the simplest approach that matches the real product behavior.

## UI conventions

- Prefer Ant Design 6 components and composition patterns over raw HTML controls.
- Reuse existing layout primitives, tables, filters, drawers, modals, and state components before introducing variants.
- Preserve loading, error, empty, and success feedback states on data-driven surfaces.
- Use the existing URL query parameter hooks for list pagination, filters, and sortable table state — pages must remain shareable and reload-safe.
- Keep page files thin; push reusable UI / logic into feature modules or shared components.
- Use client components only where interactivity actually requires them.

Visual / design context: [docs/design-system.md](../docs/design-system.md).

## Testing and validation

- Use Vitest + jsdom + Testing Library, following the patterns in `src/test/setup.ts`.
- Add or update focused tests near the affected feature, component, hook, or API helper.
- Cover both success and failure behavior for auth, RBAC, and permission-sensitive UI.
- Validate loading, empty, error, and mutation feedback states where the UI depends on async data.
- Prefer targeted `npx vitest run <path>` for changed slices; broaden only when warranted.

Reference: [docs/developer-testing-setup.md](../docs/developer-testing-setup.md).

## LGU-First direction

- Tuguegarao-first, then partner-LGU rollout.
- Prioritize city and barangay operations workflows.
- Prefer UI language and page structures that make sense for real LGU operations teams.
- Avoid national-first abstractions that make the operational dashboard harder to use.

## Contract stability

- Preserve backend response shape assumptions unless the API contract has intentionally changed.
- Prefer additive frontend changes over assumptions that rewrite server semantics.
- Keep dashboard types, typed resource helpers, CRUD config, and permission checks aligned with backend contracts.
- Stay compatible with future mobile clients by respecting stable API contracts — but do not optimize the dashboard architecture around mobile-specific needs right now.

## Deployment

- [docs/production-deployment.md](../docs/production-deployment.md)
- [docs/production-release-order.md](../docs/production-release-order.md)
- [docs/production-cutover-checklist.md](../docs/production-cutover-checklist.md)
- [docs/production-env-matrix.md](../docs/production-env-matrix.md)

## Cross-repo coordination

- The CIRS API repo lives at `/home/nhad/xypes/xypes-cirs-api`. Its `docs/dashboard-crud-config.flat.json` and OpenAPI surface define the contract this dashboard consumes.
- For multi-repo work, use the user-level `xypes-platform-orchestrator`. Do not cross repo boundaries from inside dashboard changes — return cross-repo notes instead.
- The MyTuguegarao mobile app at `/home/nhad/xypes/MyTuguegarao` consumes the same API. Avoid distorting dashboard contracts to accommodate mobile-only needs.

## AI workflow

- Use `.github/agent-context.json` as the canonical durable reference for repo-level orchestration notes, validation defaults, and reusable handoff context.
- Prefer updating that file over duplicating updateable state across multiple agent files.

## Available agents

Local specialists in `.github/agents/`:

- `orchestrator` — multi-step coordinator
- `page-builder` — App Router pages, Ant Design composition, CRUD UI, AppShell composition
- `api-integrator` — typed clients, React Query, auth lifecycle, dynamic CRUD wiring
- `test-writer` — Vitest + Testing Library, role-sensitive UI, dynamic CRUD coverage
- `reviewer` — read-only auth / RBAC / API quality / contract drift review
- `cirs-dashboard-api-alignment` — focused agent for backend API contract alignment, role drift, dynamic CRUD config
