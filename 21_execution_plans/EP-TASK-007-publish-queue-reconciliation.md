---
id: EP-TASK-007
status: reviewed
source_task: ../11_tasks/TASK-007-publish-queue-reconciliation.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-008-observability-reconciliation.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-007.md
---
# EP-TASK-007 Publish Queue, Attempt Records, And Reconciliation

## Metadata

Owner: Engineering. Status: planned. Source task: TASK-007. Lifecycle state: implementation scoped to local publish-intent observability and reconciliation evidence.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-008-observability-reconciliation.md`
- `16_operations/INTEGRATIONS.md`
- `16_operations/SERVICE_CLIENT_CONTRACTS.md`
- `22_goal_impact/GOAL-IMPACT-TASK-007.md`

## Goal Impact

The plan makes publication readiness and drift observable while ensuring live marketplace mutation remains impossible in this slice. It advances FEAT-008 by recording queue state, attempt status, idempotency, policy snapshots, actor identity, and reconciliation drift without bypassing catalog, warehouse, policy, or human approval gates.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links before runtime edits.
- AUKRO-INV-002: Require current publish-mode policy pass before a publish attempt can be marked queued.
- AUKRO-INV-003: Keep catalog, warehouse, order, and marketplace ownership boundaries intact; reconciliation reports do not correct source systems.
- AUKRO-INV-004: Use synthetic tests and no raw production order/customer data or live Aukro payloads.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. Store only masked/local actor IDs, synthetic idempotency keys, policy reason codes, stock/price/status drift values, and metadata needed for traceability. Exclude tokens, credentials, customer data, raw production orders, and live Aukro payloads.

## Contract Validation Plan

Synthetic service tests validate request handling, publish-mode policy gating, queue status, attempt replay by idempotency key, blocked attempt records, and reconciliation drift records with mocked Prisma, catalog, warehouse, policy, AI, notification, and logger dependencies.

## Replay/Determinism Plan

A publish attempt is deterministic by idempotency key. If the same key already exists for an offer, the service returns that record without adding another queue entry. The default key is stable per offer; callers can pass a stronger future workflow key.

## Scope

Add local queue/attempt/reconciliation metadata under `AukroOffer.rawData` and expose two backend endpoints: enqueue publish intent and record reconciliation evidence.

## Non-Goals

No live Aukro API mutation, background queue worker, official Aukro rate-limit integration, warehouse reservation/decrement, Prisma migration, UI, webhook listener, or protected intent document change.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `17_governance/AI_AGENT_RULES.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-008-observability-reconciliation.md`
- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `11_tasks/TASK-006-ai-proposal-human-approval.md`
- `12_validation/VAL-TASK-005-catalog-sell-action-draft-model.md`
- `12_validation/VAL-TASK-006-ai-proposal-human-approval.md`
- `services/aukro-service/src/aukro/offers/*`
- `services/aukro-service/src/aukro/offers/policy/*`

## Files to Create

- `11_tasks/TASK-007-publish-queue-reconciliation.md`
- `12_validation/VAL-TASK-007-publish-queue-reconciliation.md`
- `13_context_packages/CP-TASK-007-publish-queue-reconciliation.md`
- `14_prompts/PROMPT-TASK-007-publish-queue-reconciliation.md`
- `21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md`
- `22_goal_impact/GOAL-IMPACT-TASK-007.md`
- `services/aukro-service/src/aukro/offers/publish-observability.types.ts`

## Files to Modify

- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `TASKS.md`
- `graph/project_graph.example.yaml`
- `12_validation/VAL-TASK-007-publish-queue-reconciliation.md`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, and live credential configuration.

## Implementation Steps

1. Create TASK-007 IPS artifacts and graph/task tracker links.
2. Add publish observability request/response/types.
3. Add `POST /offers/:id/enqueue-publish` route.
4. Implement policy evidence collection for publish mode, including human approval, idempotency, and rate-limit readiness evidence.
5. Append or reuse rawData publish attempt records and per-account queue metrics.
6. Add `POST /offers/:id/reconciliation` route.
7. Implement reconciliation drift comparison and rawData report persistence without source-system mutation.
8. Add synthetic tests for queued, blocked, idempotent replay, and drift paths.
9. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate before runtime edits, deployment-readiness gate for TASK-007 after validation report completion, and inspect git diff for protected files and live mutation absence.

## Documentation Updates

Create TASK-007 IPS package and update `TASKS.md` plus `graph/project_graph.example.yaml`.

## Parallel Execution Section

- Workstream A, IPS package: ready now, edits docs/tracker/graph only, integration owner current thread.
- Workstream B, backend queue and reconciliation: dependency-gated on Workstream A, edits offer controller/service/types.
- Workstream C, synthetic tests: dependency-gated on Workstream B, edits offer service tests.
- Workstream D, validation and final integration: final integration, current thread owns all gates and commit/deploy.

Shared files are `offers.service.ts`, `offers.controller.ts`, `offers.service.spec.ts`, `TASKS.md`, and `graph/project_graph.example.yaml`. Because Workstreams B and C depend on the same service contract and test file, no separate Codex threads are started for this task.

## Rollback Plan

Revert the TASK-007 commit. No database migration, secret rotation, queue worker drain, live Aukro cleanup, or warehouse/order cleanup is required because the slice records local metadata only.

## Agent Handoff Prompt

Implement FEAT-008 local publish queue and reconciliation observability only. Queue entries require publish-mode policy pass, human approval evidence, rate-limit readiness evidence, and idempotency evidence. Store attempts and reconciliation reports in offer rawData, make enqueue idempotent by key, add synthetic tests, and do not call live Aukro mutation APIs.

## Completion Checklist

- [x] IPS artifacts complete
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
