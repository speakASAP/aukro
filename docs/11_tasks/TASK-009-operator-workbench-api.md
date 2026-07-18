---
id: TASK-009
status: reviewed
owner: Engineering
created: 2026-06-14
last_updated: 2026-06-14
completeness_level: complete
upstream:
  - ../08_roadmap/AI_COMMERCE_ROADMAP.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-009.md
execution_plan:
  - ../21_execution_plans/EP-TASK-009-operator-workbench-api.md
---
# TASK-009: Implement Operator Workbench API

## Objective

Implement the first Stage 6 backend slice: a read-only operator workbench API that aggregates local Aukro drafts, policy blockers, approvals, publish queue, reconciliation, revenue analytics, and order forwarding status.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/09_milestones/MS-003-ai-commerce-platform.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/10_features/FEAT-006-ai-human-workbench.md`, `docs/10_features/FEAT-007-ecosystem-revenue-optimization.md`, `docs/10_features/FEAT-008-observability-reconciliation.md`, and `docs/16_operations/SERVICE_CLIENT_CONTRACTS.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-009.md`. This task reduces routine manual Aukro.cz checking by exposing local operational queues and offer/order evidence through a service API while preserving backend policy gates and source-system ownership.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation must remain traceable, read only, avoid sensitive payloads, preserve source-system ownership, and add validation evidence before commit/deploy.

## Sensitive-Data Classification

Classification: synthetic and masked. Tests and validation use synthetic account, offer, product, order, actor, queue, blocker, and analytics records. Tokens, credentials, customer identifiers, production orders, live marketplace payloads, and production logs are excluded.

## Contract/Schema Impact

Adds local API DTOs and read-only workbench endpoints. No Prisma schema migration, Kubernetes manifest, secret, external service schema, or source-system mutation is required.

## Replay/Determinism Impact

Workbench endpoints are deterministic read models over local records and synthetic tests. They do not create, publish, update, approve, reject, reserve stock, forward orders, or mutate downstream services.

## Scope

- Add workbench summary endpoint for counts and key metrics.
- Add review queue endpoint for blocked drafts, approval-needed AI proposals, blocked publish attempts, reconciliation drift, blocked revenue, and order-forwarding failures.
- Add offer detail endpoint that returns local draft, AI review, publish queue, reconciliation, revenue analytics, and safe order linkage context.
- Add synthetic tests for summary, queues, detail context, filtering, and data minimization.

## Non-Goals

- No frontend implementation in this slice.
- No live Aukro API call, publish/update mutation, price change, stock reservation, or order lifecycle change.
- No AI proposal creation, approval/rejection mutation, downstream service write, BI warehouse, Prisma migration, Kubernetes manifest change, secret change, or protected intent document change.

## Acceptance Criteria

- [x] `GET /workbench/summary` returns account, offer, draft, queue, drift, revenue, and order-forwarding metrics.
- [x] `GET /workbench/review-queue` returns actionable local review items with reason codes and safe context.
- [x] `GET /workbench/offers/:id` returns a safe offer workbench detail view.
- [x] Optional account filtering is supported.
- [x] Synthetic tests cover summary, queues, detail, and sensitive-data minimization.
- [x] No live marketplace or downstream source-system mutation is introduced.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, Stage 6 roadmap section, TASK-005 through TASK-008 docs and validation reports, offer/order/account services, and local rawData metadata contracts.

## Validation Task

Create and complete `docs/12_validation/VAL-TASK-009-operator-workbench-api.md`, run the new workbench test, service test suite, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-009`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-009-operator-workbench-api.md` before coding.
