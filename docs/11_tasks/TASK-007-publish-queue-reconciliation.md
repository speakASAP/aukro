---
id: TASK-007
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-008-observability-reconciliation.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-007.md
execution_plan:
  - ../21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md
---
# TASK-007: Implement Publish Queue, Attempt Records, And Reconciliation

## Objective

Implement the first FEAT-008 backend slice: a local publish queue record, idempotent publish attempt records, and offer reconciliation reports that are observable without performing live Aukro.cz mutations.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/10_features/FEAT-008-observability-reconciliation.md`, `docs/16_operations/INTEGRATIONS.md`, and `docs/16_operations/SERVICE_CLIENT_CONTRACTS.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-007.md`. This task makes approved publish intent and reconciliation drift visible while preserving catalog, warehouse, policy, human approval, and idempotency gates before any later live Aukro mutation worker exists.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation must keep traceability, preserve catalog/warehouse/order ownership, avoid secrets/raw production data, and add validation evidence before commit/deploy.

## Sensitive-Data Classification

Classification: synthetic. Tests and validation use synthetic offer, actor, queue, policy, stock, price, and reconciliation records. No tokens, credentials, raw customer data, production orders, or live Aukro payloads are included.

## Contract/Schema Impact

Adds local API DTOs and endpoints for enqueueing publish intent and recording reconciliation results. Queue, attempt, and reconciliation records are stored in `AukroOffer.rawData` for this slice. No Prisma schema migration, Kubernetes manifest, secret, or external service schema change is required.

## Replay/Determinism Impact

Publish enqueue is idempotent by stable idempotency key. Repeated calls with the same key return the existing attempt record instead of appending duplicates. Reconciliation reports are record-only and do not mutate catalog, warehouse, order, or live Aukro state.

## Scope

- Add typed publish queue and reconciliation request/response contracts.
- Add `POST /offers/:id/enqueue-publish` to record a publish attempt as `queued` only when publish-mode policy gates pass.
- Record blocked publish attempts with policy snapshot, blockers, actor, idempotency key, and queue metrics.
- Derive human approval evidence from approved human review records when present.
- Require current policy, stock, catalog, human approval, rate-limit, and idempotency evidence for queued status.
- Add `POST /offers/:id/reconciliation` to record stock, price, and status drift evidence without correcting remote or source-system state.
- Add synthetic tests for queued, blocked, idempotent replay, and drift reconciliation paths.

## Non-Goals

- No live Aukro API publish, update, retry, cancel, or stock mutation call.
- No background worker, scheduler, webhook listener, or rate-limit integration with official Aukro API quotas.
- No warehouse reservation/decrement, order ownership change, or orders-microservice changes.
- No Prisma migration or new database table in this slice.
- No UI work and no protected intent document changes.

## Acceptance Criteria

- [x] `POST /offers/:id/enqueue-publish` records a publish attempt with idempotency key, actor, status, policy snapshot, and blockers.
- [x] Publish attempts become `queued` only when publish-mode policy gates pass.
- [x] Missing approval, rate-limit evidence, idempotency evidence, or policy blockers produce a blocked attempt record rather than a live mutation.
- [x] Repeated enqueue calls with the same idempotency key reuse the existing attempt record.
- [x] `POST /offers/:id/reconciliation` records stock, price, and status drift without changing source-system ownership.
- [x] Synthetic tests cover the queue, replay, blocked, and reconciliation paths.
- [x] No live Aukro marketplace mutation is introduced.

## Required Context

`AGENTS.md`, protected intent docs, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/10_features/FEAT-008-observability-reconciliation.md`, TASK-005/TASK-006 docs and validation reports, offer service/controller, offer policy service, AI proposal review metadata, catalog client, warehouse client, and notifications/logging contract docs.

## Validation Task

Create and complete `docs/12_validation/VAL-TASK-007-publish-queue-reconciliation.md`, run the new service test, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-007`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md` before coding.
