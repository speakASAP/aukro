---
id: EP-TASK-009
status: reviewed
source_task: ../11_tasks/TASK-009-operator-workbench-api.md
owner: Engineering
created: 2026-06-14
last_updated: 2026-06-14
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 08_roadmap/AI_COMMERCE_ROADMAP.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-009.md
---
# EP-TASK-009 Operator Workbench API

## Metadata

Owner: Engineering. Status: planned. Source task: TASK-009. Lifecycle state: implementation scoped to read-only backend workbench aggregation.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `09_milestones/MS-003-ai-commerce-platform.md`
- `22_goal_impact/GOAL-IMPACT-TASK-009.md`

## Goal Impact

This plan provides the first operator workbench API slice so humans can inspect safe local selling state without direct routine Aukro.cz checks. It is read-only and does not bypass policy or human approval gates.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links before runtime edits.
- AUKRO-INV-002: Do not publish or mutate offers; workbench only observes local state.
- AUKRO-INV-003: Keep catalog, warehouse, order, payment, supplier, marketing, AI, logging, and marketplace ownership boundaries intact.
- AUKRO-INV-004: Use synthetic tests and masked output only.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic and masked operational metadata. Return service-safe IDs, statuses, counts, reason codes, totals, and local timestamps. Exclude customer contact fields, raw order payloads, buyer messages, tokens, credentials, and live payloads.

## Contract Validation Plan

Synthetic tests validate summary aggregation, review queue generation, offer detail context, account filtering, and output minimization with mocked Prisma.

## Replay/Determinism Plan

Workbench endpoints are read-only deterministic views over local records. No replay key is needed because no mutation occurs.

## Scope

Add `services/aukro-service/src/aukro/workbench` module/controller/service/types with read-only dashboard summary, review queue, and offer detail endpoints.

## Non-Goals

No frontend, live Aukro API mutation, downstream write, Prisma migration, BI table, scheduler, webhook listener, Kubernetes manifest change, secret change, or protected intent document change.

## Files to Inspect

- `AGENTS.md`
- `AGENT_OPERATIONS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `17_governance/AI_AGENT_RULES.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `services/aukro-service/src/aukro/accounts/*`
- `services/aukro-service/src/aukro/offers/*`
- `services/aukro-service/src/aukro/orders/*`

## Files to Create

- `11_tasks/TASK-009-operator-workbench-api.md`
- `12_validation/VAL-TASK-009-operator-workbench-api.md`
- `13_context_packages/CP-TASK-009-operator-workbench-api.md`
- `14_prompts/PROMPT-TASK-009-operator-workbench-api.md`
- `21_execution_plans/EP-TASK-009-operator-workbench-api.md`
- `22_goal_impact/GOAL-IMPACT-TASK-009.md`
- `services/aukro-service/src/aukro/workbench/workbench.controller.ts`
- `services/aukro-service/src/aukro/workbench/workbench.module.ts`
- `services/aukro-service/src/aukro/workbench/workbench.service.ts`
- `services/aukro-service/src/aukro/workbench/workbench.service.spec.ts`
- `services/aukro-service/src/aukro/workbench/workbench.types.ts`

## Files to Modify

- `services/aukro-service/src/aukro/aukro.module.ts`
- `services/aukro-service/package.json`
- `TASKS.md`
- `graph/project_graph.example.yaml`
- `12_validation/VAL-TASK-009-operator-workbench-api.md`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, Prisma schema, and live credential configuration.

## Implementation Steps

1. Create TASK-009 IPS artifacts and graph/task tracker links.
2. Run pre-coding gate.
3. Add workbench types, module, service, and controller.
4. Aggregate accounts, offers, and orders into safe summary metrics.
5. Build review queue items from draft blockers, AI proposals, publish attempts, reconciliation drift, revenue analytics, and order forwarding failures.
6. Add safe offer detail view.
7. Add synthetic tests and wire them into the service test script.
8. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate before runtime edits, deployment-readiness gate for TASK-009 after validation report completion, and inspect git diff for protected files, secret absence, and mutation absence.

## Documentation Updates

Create TASK-009 IPS package and update `TASKS.md` plus `graph/project_graph.example.yaml`.

## Parallel Execution Section

- Workstream A, IPS package: ready now, edits docs/tracker/graph only, integration owner current thread.
- Workstream B, workbench API: dependency-gated on Workstream A, edits workbench module/controller/service/types and Aukro module.
- Workstream C, synthetic tests: dependency-gated on Workstream B, edits workbench tests and package test script.
- Workstream D, validation and final integration: final integration, current thread owns all gates and commit/deploy readiness.

Shared files are `services/aukro-service/package.json`, `services/aukro-service/src/aukro/aukro.module.ts`, `TASKS.md`, and `graph/project_graph.example.yaml`. Because this slice shares generated tracking files and a single API contract, no separate Codex threads are started for TASK-009.

## Rollback Plan

Revert the TASK-009 commit. No database migration, secret rotation, live Aukro cleanup, downstream service cleanup, or queue drain is required because the slice is read-only.

## Agent Handoff Prompt

Implement Stage 6 read-only operator workbench API only. Aggregate local metadata safely, add synthetic tests, and do not mutate marketplace or downstream systems.

## Completion Checklist

- [x] IPS artifacts complete
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
