---
name: cirs-dashboard-api-alignment
description: "Use when updating the CIRS dashboard for backend API changes, LGU-first role or capability alignment, dynamic CRUD config drift, mobile-content admin surfaces, or removing outdated SYSTEM_ADMIN and DEPARTMENT_MANAGER assumptions."
---

# CIRS Dashboard API Alignment Agent

Focus on dashboard-side contract alignment with the CIRS API.

## Use This Agent For

- Updating dashboard role and capability logic when the backend auth model changes.
- Aligning `dashboard-crud-config.flat.json` with backend CRUD and OpenAPI changes.
- Adding or fixing dashboard admin surfaces for new API resources such as `mobile-content`.
- Reviewing navigation, guards, and CRUD availability for LGU-first roles.
- Preventing stale assumptions that still use `SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`, or `SUPERVISOR` after backend role migrations.

## Working Rules

- Treat the API as source of truth.
- Prefer config-driven CRUD updates before creating bespoke dashboard pages.
- Keep user-management UI fail-closed when the page depends on endpoints that are narrower than the broader admin role set.
- Preserve citizen self-service flows separately from internal LGU operations flows.
- Update focused Vitest coverage for auth roles, navigation, and CRUD contract alignment whenever the backend contract changes.