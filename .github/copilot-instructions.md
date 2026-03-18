# Xypes CIRS Dashboard Copilot Instructions

This dashboard integrates with the Xypes CIRS API.

## Integration context
- Backend service: Xypes CIRS API
- API style: REST
- Base path: `/api/v1`
- Main resources: `citizens`, `responders`, `statuses`, `categories`, `severities`, `locations`, `incidents`, `assignments`, `users`
- Persistence: Prisma + PostgreSQL (Supabase)

## API behavior
- Protected routes require `x-api-key` when backend `API_KEYS` or `API_KEY` is configured.
- Public routes:
  - `/api/v1/health`
  - `/api/v1/openapi.json`
  - `/api/v1/docs`
- Rate limiting may return `429` with `Retry-After` and `X-RateLimit-*` headers.
- Validation failures commonly return `422` with structured error payloads.

## Architecture assumptions
- Treat CIRS API as source of truth.
- Do not duplicate backend business rules in frontend unless needed for UX.
- Keep API access centralized in one client/service layer.
- Reuse endpoint constants and request/response types.
- Handle `401`, `403`, `404`, `422`, and `429` consistently.
- Surface auth and rate-limit failures clearly in the UI.
- Prepare for future JWT auth and RBAC/scoped permissions.

## Code generation preferences
- Use CIRS resource names exactly as defined.
- Keep integration modular and typed.
- Separate API client code from UI components.
- Prefer maintainable patterns over ad hoc fetch calls.
