---
id: EP-TASK-008
status: reviewed
source_task: ../11_tasks/TASK-008-revenue-analytics-events.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-007-ecosystem-revenue-optimization.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-008.md
---
# EP-TASK-008 Revenue Analytics And Cross-Service Events

## Metadata

Owner: Engineering. Status: planned. Source task: TASK-008. Lifecycle state: implementation scoped to local analytics and masked event emission.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-007-ecosystem-revenue-optimization.md`
- `16_operations/INTEGRATIONS.md`
- `16_operations/SERVICE_CLIENT_CONTRACTS.md`
- `22_goal_impact/GOAL-IMPACT-TASK-008.md`

## Goal Impact

This plan makes Aukro performance and blocker evidence actionable for revenue work while keeping downstream services as owners of campaigns, suppliers, catalog edits, payments, AI recommendations, and BI analytics.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links before runtime edits.
- AUKRO-INV-002: Do not publish or mutate offers; analytics only observes validated local metadata.
- AUKRO-INV-003: Keep catalog, warehouse, order, payment, supplier, marketing, AI, and logging ownership boundaries intact.
- AUKRO-INV-004: Use synthetic tests and masked event payloads only.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic and masked operational metadata. Store aggregate counts, rates, prices, stock age, margin, blocked revenue, reason codes, and service-safe IDs. Exclude raw customer data, buyer questions/messages, orders, addresses, phones, emails, tokens, credentials, and live payloads.

## Contract Validation Plan

Synthetic service tests validate request handling, metric normalization, recommendation generation, event masking, optional logging delivery, and rawData persistence with mocked Prisma and clients.

## Replay/Determinism Plan

Analytics records are deterministic by explicit `analyticsId` when supplied, otherwise a stable hash of offer ID, observedAt, and source. Repeated calls with the same ID return the stored record instead of appending duplicates.

## Scope

Add local revenue analytics metadata under `AukroOffer.rawData`, expose one backend endpoint, and emit masked structured logging events through the existing optional logging client boundary if present.

## Non-Goals

No live Aukro API mutation, BI warehouse, Prisma migration, UI, catalog writeback, marketing campaign mutation, supplier action, payment action, order lifecycle change, Kubernetes manifest change, or secret change.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `17_governance/AI_AGENT_RULES.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-007-ecosystem-revenue-optimization.md`
- `16_operations/INTEGRATIONS.md`
- `16_operations/SERVICE_CLIENT_CONTRACTS.md`
- `services/aukro-service/src/aukro/offers/*`
- `shared/clients/logging-client.service.ts`

## Files to Create

- `11_tasks/TASK-008-revenue-analytics-events.md`
- `12_validation/VAL-TASK-008-revenue-analytics-events.md`
- `13_context_packages/CP-TASK-008-revenue-analytics-events.md`
- `14_prompts/PROMPT-TASK-008-revenue-analytics-events.md`
- `21_execution_plans/EP-TASK-008-revenue-analytics-events.md`
- `22_goal_impact/GOAL-IMPACT-TASK-008.md`
- `services/aukro-service/src/aukro/offers/revenue-analytics.types.ts`

## Files to Modify

- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `TASKS.md`
- `graph/project_graph.example.yaml`
- `12_validation/VAL-TASK-008-revenue-analytics-events.md`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, and live credential configuration.

## Implementation Steps

1. Create TASK-008 IPS artifacts and graph/task tracker links.
2. Run pre-coding gate.
3. Add revenue analytics request/response/types.
4. Add `POST /offers/:id/revenue-analytics` route.
5. Implement masked analytics record persistence under offer rawData.
6. Generate recommendation events for blocked revenue, low conversion, low stock, weak media, price/margin risk, stale stock, and policy blockers.
7. Emit optional masked structured events through the logging client boundary where available.
8. Add synthetic tests for record creation, idempotent replay, recommendations, and masked payloads.
9. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate before runtime edits, deployment-readiness gate for TASK-008 after validation report completion, and inspect git diff for protected files, secret absence, and live mutation absence.

## Documentation Updates

Create TASK-008 IPS package and update `TASKS.md` plus `graph/project_graph.example.yaml`.

## Parallel Execution Section

- Workstream A, IPS package: ready now, edits docs/tracker/graph only, integration owner current thread.
- Workstream B, backend analytics contract and route: dependency-gated on Workstream A, edits offer controller/service/types.
- Workstream C, synthetic tests: dependency-gated on Workstream B, edits offer service tests.
- Workstream D, validation and final integration: final integration, current thread owns all gates and commit/deploy readiness.

Shared files are `offers.service.ts`, `offers.controller.ts`, `offers.service.spec.ts`, `TASKS.md`, and `graph/project_graph.example.yaml`. Because Workstreams B and C share the same service contract and test file, no separate Codex threads are started for TASK-008.

## Rollback Plan

Revert the TASK-008 commit. No database migration, secret rotation, live Aukro cleanup, downstream service cleanup, or queue drain is required because the slice records local metadata only.

## Agent Handoff Prompt

Implement FEAT-007 local revenue analytics and masked recommendation events only. Store analytics records in offer rawData, keep downstream service ownership intact, make records idempotent by analytics ID, add synthetic tests, and do not call live marketplace mutation APIs or downstream mutation endpoints.

## Completion Checklist

- [x] IPS artifacts complete
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
