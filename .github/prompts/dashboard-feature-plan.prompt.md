---
description: 'Plan a CIRS Dashboard feature using the local orchestrator and return a sequenced execution plan grounded in the repo conventions.'
agent: 'orchestrator'
argument-hint: 'Describe the dashboard feature, page, API integration, test target, or review you want handled'
applyTo:
  - '**/xypes-cirs-dashboard/**'
---

Use the local CIRS Dashboard `orchestrator` to plan and delegate this work.

<task>
{{input}}
</task>

<requirements>
- Follow the conventions in [.github/copilot-instructions.md](../copilot-instructions.md).
- Default to **Tuguegarao-first** product framing.
- Keep dashboard contracts aligned with the CIRS API at `/home/nhad/xypes/xypes-cirs-api`.
- Use the standard order: API and types → UI / pages → tests → review.
- Delegate each slice to the best-fit specialist (`api-integrator`, `page-builder`, `test-writer`, `reviewer`, `cirs-dashboard-api-alignment`).
- Decide explicitly between dynamic CRUD and a custom feature module.
- If the work spans the API or mobile, return a coordination note for the user-level `xypes-platform-orchestrator` rather than implementing cross-repo.
</requirements>

<output>
Return:
- the dashboard specialist agents to use in order
- the main files or code areas each agent should target
- whether the work uses dynamic CRUD or a custom feature module, with rationale
- key constraints that must hold during implementation
- the tests and review steps required before completion
- any cross-repo coordination notes
</output>
