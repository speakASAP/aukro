---
id: TASK-010
status: reviewed
owner: Engineering
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
upstream:
  - ../08_roadmap/AI_COMMERCE_ROADMAP.md
  - ../11_tasks/TASK-009-operator-workbench-api.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-010.md
execution_plan:
  - ../21_execution_plans/EP-TASK-010-workbench-bulk-preview.md
---
# TASK-010: Implement Workbench Bulk Preview API

## Objective

Implement the next Stage 6 backend slice: a read-only bulk workbench preview API that lets operators preview candidate local review items by account, type, and priority before any future bulk workflow is executed.

## Upstream Links

`01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `09_milestones/MS-003-ai-commerce-platform.md`, `10_features/FEAT-006-ai-human-workbench.md`, `10_features/FEAT-007-ecosystem-revenue-optimization.md`, `10_features/FEAT-008-observability-reconciliation.md`, and `11_tasks/TASK-009-operator-workbench-api.md`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-010.md`. This task advances Stage 6 bulk workflows by adding preview-only batching over existing safe workbench review items without introducing any live marketplace, downstream, approval, stock, price, or order mutation.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation must remain traceable, read only, avoid sensitive payloads, preserve source-system ownership, and add validation evidence before closure.

## Sensitive-Data Classification

Classification: synthetic and masked. Tests and validation use synthetic account, offer, product, order, actor, blocker, queue, and analytics records. Tokens, credentials, customer identifiers, production orders, live marketplace payloads, buyer messages, and production logs are excluded.

## Contract/Schema Impact

Adds local API DTOs and one read-only workbench endpoint. No Prisma schema migration, Kubernetes manifest, secret, external service schema, or source-system mutation is required.

## Replay/Determinism Impact

The endpoint is a deterministic read model over existing local workbench review items. It does not approve, reject, publish, update prices, reserve stock, forward orders, write downstream events, or create queue attempts.

## Scope

- Add bulk preview query contract for optional account, item type, minimum priority, and limit.
- Add `GET /workbench/bulk-preview` that returns a capped list of candidate review items plus safe counts.
- Reuse existing review queue generation so preview behavior remains consistent with operator workbench state.
- Add synthetic tests for filtering, priority thresholds, limit caps, and data minimization.

## Non-Goals

- No bulk execution endpoint in this slice.
- No frontend implementation.
- No role-service expansion beyond preserving guard-protected read access.
- No live Aukro API call, publish/update mutation, price change, stock reservation, order lifecycle change, downstream service write, Prisma migration, Kubernetes manifest change, secret change, or protected intent document change.

## Acceptance Criteria

- [x] `GET /workbench/bulk-preview` returns safe preview candidates sourced from review queue items.
- [x] Optional account, item type, and minimum-priority filtering are supported.
- [x] Preview results are capped by a safe limit and include remaining item count.
- [x] Synthetic tests cover filters, caps, priority threshold, and sensitive-data minimization.
- [x] No live marketplace or downstream source-system mutation is introduced.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `08_roadmap/AI_COMMERCE_ROADMAP.md`, Stage 6 roadmap section, TASK-009 docs and validation report, workbench controller/service/types/tests, and local rawData metadata contracts.

## Validation Task

Create and complete `12_validation/VAL-TASK-010-workbench-bulk-preview.md`, run the workbench test, service test suite, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-010`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-010-workbench-bulk-preview.md` before coding.
