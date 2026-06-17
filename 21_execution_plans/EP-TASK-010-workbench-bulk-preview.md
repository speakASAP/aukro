---
id: EP-TASK-010
status: reviewed
source_task: ../11_tasks/TASK-010-workbench-bulk-preview.md
owner: Engineering
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 08_roadmap/AI_COMMERCE_ROADMAP.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-010.md
---
# EP-TASK-010 Workbench Bulk Preview API

## Metadata

Owner: Engineering. Status: planned. Source task: TASK-010. Lifecycle state: implementation scoped to read-only bulk preview over local workbench review items.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `09_milestones/MS-003-ai-commerce-platform.md`
- `11_tasks/TASK-009-operator-workbench-api.md`
- `22_goal_impact/GOAL-IMPACT-TASK-010.md`

## Goal Impact

This plan adds preview-only bulk workflow support so operators can inspect candidate local workbench items before later execution workflows. It is read-only and does not bypass policy, human approval, marketplace, stock, price, or order gates.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links before runtime edits.
- AUKRO-INV-002: Do not publish or mutate offers; preview only observes local state.
- AUKRO-INV-003: Keep catalog, warehouse, order, payment, supplier, marketing, AI, logging, and marketplace ownership boundaries intact.
- AUKRO-INV-004: Use synthetic tests and masked output only.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic and masked operational metadata. Return service-safe IDs, statuses, reason codes, counts, timestamps, and preview metadata. Exclude customer contact fields, raw order payloads, buyer messages, tokens, credentials, and live payloads.

## Contract Validation Plan

Synthetic tests validate bulk preview filtering by account, item type, minimum priority, safe limit capping, remaining count, and output minimization with mocked Prisma.

## Replay/Determinism Plan

Bulk preview is a read-only deterministic view over existing review queue items. No replay key is needed because no mutation occurs.

## Scope

Extend `services/aukro-service/src/aukro/workbench` with a `GET /workbench/bulk-preview` endpoint, query/response DTOs, service method, and tests.

## Non-Goals

No bulk execution endpoint, frontend, live Aukro API mutation, downstream write, Prisma migration, scheduler, webhook listener, Kubernetes manifest change, secret change, role-service write, or protected intent document change.

## Files to Inspect

- `AGENTS.md`
- `AGENT_OPERATIONS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `17_governance/AI_AGENT_RULES.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `11_tasks/TASK-009-operator-workbench-api.md`
- `services/aukro-service/src/aukro/workbench/*`

## Files to Create

- `11_tasks/TASK-010-workbench-bulk-preview.md`
- `12_validation/VAL-TASK-010-workbench-bulk-preview.md`
- `13_context_packages/CP-TASK-010-workbench-bulk-preview.md`
- `14_prompts/PROMPT-TASK-010-workbench-bulk-preview.md`
- `21_execution_plans/EP-TASK-010-workbench-bulk-preview.md`
- `22_goal_impact/GOAL-IMPACT-TASK-010.md`

## Files to Modify

- `services/aukro-service/src/aukro/workbench/workbench.controller.ts`
- `services/aukro-service/src/aukro/workbench/workbench.service.ts`
- `services/aukro-service/src/aukro/workbench/workbench.service.spec.ts`
- `services/aukro-service/src/aukro/workbench/workbench.types.ts`
- `TASKS.md`
- `graph/project_graph.example.yaml`
- `12_validation/VAL-TASK-010-workbench-bulk-preview.md`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, Prisma schema, and live credential configuration.

## Implementation Steps

1. Create TASK-010 IPS artifacts and graph/task tracker links.
2. Run pre-coding gate.
3. Add bulk preview query and response types.
4. Add service method that reuses review queue item generation, applies account/type/priority filters, caps limit, and returns preview metadata.
5. Add controller endpoint.
6. Add synthetic tests for filters, caps, threshold, and minimization.
7. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate before runtime edits, deployment-readiness gate for TASK-010 after validation report completion, and inspect git diff for protected files, secret absence, and mutation absence.

## Documentation Updates

Create TASK-010 IPS package and update `TASKS.md` plus `graph/project_graph.example.yaml`.

## Parallel Execution Section

- Workstream A, IPS package: ready now, edits docs/tracker/graph only, integration owner current thread.
- Workstream B, bulk preview API: dependency-gated on Workstream A and pre-coding gate, edits workbench controller/service/types.
- Workstream C, synthetic tests: dependency-gated on Workstream B, edits workbench tests.
- Workstream D, validation and final integration: final integration, current thread owns all gates and readiness evidence.

Shared files are `services/aukro-service/src/aukro/workbench/workbench.controller.ts`, `services/aukro-service/src/aukro/workbench/workbench.service.ts`, `services/aukro-service/src/aukro/workbench/workbench.types.ts`, `services/aukro-service/src/aukro/workbench/workbench.service.spec.ts`, `TASKS.md`, and `graph/project_graph.example.yaml`. Because this slice shares one API contract and test file, no separate Codex threads are started for TASK-010.

## Rollback Plan

Revert the TASK-010 commit. No database migration, secret rotation, live Aukro cleanup, downstream service cleanup, queue drain, stock cleanup, or order cleanup is required because the slice is read-only.

## Agent Handoff Prompt

Implement Stage 6 read-only workbench bulk preview only. Reuse local review queue items, filter and cap preview candidates safely, add synthetic tests, and do not mutate marketplace or downstream systems.

## Completion Checklist

- [x] IPS artifacts complete
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
