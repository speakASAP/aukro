---
id: TASK-008
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-007-ecosystem-revenue-optimization.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-008.md
execution_plan:
  - ../21_execution_plans/EP-TASK-008-revenue-analytics-events.md
---
# TASK-008: Implement Revenue Analytics And Cross-Service Events

## Objective

Implement the first FEAT-007 backend slice: local Aukro offer revenue analytics records and masked cross-service recommendation events that are observable without changing downstream source-system ownership.

## Upstream Links

`01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-007-ecosystem-revenue-optimization.md`, `16_operations/INTEGRATIONS.md`, and `16_operations/SERVICE_CLIENT_CONTRACTS.md`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-008.md`. This task turns Aukro performance and blocker evidence into explainable, masked recommendation events so revenue work can be prioritized while catalog, marketing, supplier, payment, warehouse, AI, logging, and BI ownership remains outside aukro-service.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation must keep traceability, preserve source-system ownership, avoid sensitive examples or payloads, and add validation evidence before commit/deploy.

## Sensitive-Data Classification

Classification: synthetic and masked. Tests and validation use synthetic offer, account, product, actor, metrics, blocker, recommendation, and correlation records. Tokens, credentials, customer identifiers, production orders, live marketplace payloads, and production logs are excluded.

## Contract/Schema Impact

Adds local API DTOs and an endpoint for recording revenue analytics evidence. Analytics records and recommendation events are stored in `AukroOffer.rawData` for this slice. No Prisma schema migration, Kubernetes manifest, secret, external event schema, or downstream service mutation is required.

## Replay/Determinism Impact

Revenue analytics recording is idempotent by explicit analytics ID. Repeated calls with the same ID return the existing record instead of appending duplicates. Recommendation generation is deterministic from the submitted metric snapshot and current local offer metadata.

## Scope

- Add typed revenue analytics request/response contracts.
- Add `POST /offers/:id/revenue-analytics` to record metric snapshots and blocked revenue evidence.
- Generate explainable recommendation events for operations, marketing, catalog, suppliers, and AI follow-up.
- Mask event context before optional structured logging delivery.
- Store records under local offer rawData without writing to downstream services.
- Add synthetic tests for record creation, idempotent replay, blocked revenue recommendations, and masking.

## Non-Goals

- No live Aukro API publish, update, retry, cancel, price, stock, or order mutation call.
- No BI warehouse, analytics table, Prisma migration, or external event bus.
- No catalog writeback, marketing campaign mutation, supplier action, payment action, warehouse reservation, or order ownership change.
- No UI work, Kubernetes manifest change, secret change, or protected intent document change.

## Acceptance Criteria

- [x] `POST /offers/:id/revenue-analytics` records a metric snapshot with analytics ID, actor, source, correlation ID, and blocked revenue value.
- [x] Recommendation events include target service, reason codes, explainable action, and masked context.
- [x] Optional logging delivery failure does not block local persistence.
- [x] Repeated calls with the same analytics ID reuse the existing record.
- [x] Synthetic tests cover creation, replay, blocked revenue recommendation, and masked event payloads.
- [x] No live marketplace or downstream source-system mutation is introduced.

## Required Context

`AGENTS.md`, protected intent docs, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-007-ecosystem-revenue-optimization.md`, `16_operations/INTEGRATIONS.md`, `16_operations/SERVICE_CLIENT_CONTRACTS.md`, TASK-004 client contracts, TASK-006 human review metadata, TASK-007 queue/reconciliation metadata, offer service/controller, and shared logging client.

## Validation Task

Create and complete `12_validation/VAL-TASK-008-revenue-analytics-events.md`, run the new service test, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-008`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-008-revenue-analytics-events.md` before coding.
