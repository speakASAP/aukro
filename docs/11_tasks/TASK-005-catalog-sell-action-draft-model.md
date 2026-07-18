---
id: TASK-005
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-005.md
execution_plan:
  - ../21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md
---
# TASK-005: Implement Catalog Sell Action And Draft Model

## Objective

Implement the first FEAT-005 backend slice: a catalog-driven sell action that creates or reuses a local Aukro draft for one catalog product and account without publishing to Aukro.cz.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, and `docs/16_operations/INTEGRATIONS.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-005.md`. This task makes catalog products actionable in aukro-service while preserving draft-first marketplace safety.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation requires catalog and warehouse evidence, keeps catalog/stock ownership external, stores no secrets, and performs no live marketplace mutation.

## Sensitive-Data Classification

Classification: synthetic. Tests use synthetic product, account, pricing, media, and stock records. No raw customer data, tokens, secrets, live Aukro payloads, or production logs are included.

## Contract/Schema Impact

Adds `POST /offers/from-catalog` request/response DTOs and a local draft metadata structure stored in `AukroOffer.rawData`. No Prisma schema change, external service schema change, Kubernetes manifest change, or secret change is required.

## Replay/Determinism Impact

The sell action is idempotent by `(accountId, productId)`: an existing local offer is reused and refreshed instead of creating duplicates. Tests use deterministic in-memory mocks.

## Scope

- Add typed catalog sell action and draft response contracts.
- Add `POST /offers/from-catalog` endpoint.
- Fetch catalog product, pricing, media, and warehouse availability.
- Create or reuse a local inactive draft offer.
- Attach draft metadata, source snapshot, policy evidence, and policy blockers.
- Add synthetic tests for creation, reuse, and blocked draft evidence.

## Non-Goals

- No live Aukro publish call.
- No publish queue or human approval workflow.
- No warehouse reservation, decrement, or stock ownership change.
- No Prisma migration or new database table.
- No UI work.

## Acceptance Criteria

- [x] `POST /offers/from-catalog` creates a local draft from one catalog product/account.
- [x] Repeated calls for the same account/product reuse the existing offer.
- [x] Zero stock, missing price, missing media, category gaps, and parameter gaps are surfaced through policy blockers.
- [x] Draft response exposes status, blockers, source snapshot, and policy evaluation.
- [x] No live marketplace mutation is introduced.

## Required Context

`AGENTS.md`, protected intent docs, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/16_operations/INTEGRATIONS.md`, `services/aukro-service/src/aukro/offers/*`, and shared catalog/warehouse clients.

## Validation Task

Create `docs/12_validation/VAL-TASK-005-catalog-sell-action-draft-model.md`, run the new service test, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-005`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md` before coding.
