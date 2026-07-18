---
id: TASK-013
status: implemented
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
upstream:
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../11_tasks/TASK-012-catalog-content-preview-drafts.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-013.md
execution_plan:
  - ../21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md
---
# TASK-013: Dashboard Bulk Publish Candidates

## Objective

Extend the Aukro dashboard so operators can page through catalog products that are not actively published on the current Aukro account, view a second paginated block of products already present in the Aukro account, select candidate products, and trigger a capped bulk draft plus publish-intent workflow.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/11_tasks/TASK-005-catalog-sell-action-draft-model.md`, `docs/11_tasks/TASK-007-publish-queue-reconciliation.md`, `docs/11_tasks/TASK-012-catalog-content-preview-drafts.md`, and `docs/16_operations/AUKRO_PLATFORM_RULES.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-013.md`. This task moves the service from one-product manual draft creation toward operator-scale catalog publication while preserving policy gates and the current record-only publish boundary.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation is traceable, keeps Catalog and Warehouse as source systems, stores no secrets, performs no live marketplace mutation, preserves protected intent documents, and records validation evidence.

## Sensitive-Data Classification

Classification: catalog-derived product metadata and local offer metadata. The UI returns product ids, titles, thumbnails, local offer ids, draft status, publish status, blocker codes, and aggregate counts. It does not return credentials, raw customer data, raw orders, live Aukro payloads, or secret values.

## Contract/Schema Impact

Adds UI-scoped contracts under `services/aukro-service/src/ui/ui.controller.ts`: account-aware catalog candidates, paginated account offers, and capped bulk draft plus publish-intent processing. No Prisma schema, migration, external service schema, Kubernetes manifest, secret, or live Aukro API contract changes are required.

## Replay/Determinism Impact

Single and bulk draft creation reuse existing idempotent `(accountId, productId)` behavior. Bulk publish intent uses a stable `ui-bulk-${accountId}-${productId}` idempotency key so repeated requests reuse existing publish attempts instead of appending duplicates.

## Scope

- Add account-aware candidate filtering for catalog products not active with an Aukro offer id.
- Add normalized candidate DTOs with thumbnail, existing local offer status, draft status, publish status, and blockers.
- Add paginated current-account Aukro offer cards.
- Add dashboard checkbox selection, select-page, clear-selection, pagination, and bulk action controls.
- Add a capped bulk endpoint that creates or refreshes drafts and records publish intent.

## Non-Goals

- No live Aukro API publish call.
- No browser automation, scraping, crawler, or account-control bypass.
- No Prisma schema or migration change.
- No Kubernetes, deployment, runtime secret, Warehouse reservation, order forwarding, Catalog writeback, or protected intent document change.

## Acceptance Criteria

- [x] Candidate product block is paginated and excludes products that are both active and have an Aukro offer id for the current account.
- [x] Candidate cards show thumbnails where available and expose selection controls.
- [x] A second paginated block shows products from the current Aukro account.
- [x] Selected candidate products can be processed in one capped bulk action.
- [x] Bulk action creates or refreshes local drafts and records publish intent without live marketplace mutation.
- [x] Validation evidence is recorded.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, TASK-005, TASK-007, TASK-012 docs and validation, `docs/16_operations/AUKRO_PLATFORM_RULES.md`, shared Catalog client, offer service publish-intent contract, and `services/aukro-service/src/ui/ui.controller.ts`.

## Validation Task

Create `docs/12_validation/VAL-TASK-013-dashboard-bulk-publish-candidates.md`, run the service build/tests, strict audit, deployment readiness gates, and `git diff --check`.

## Required Gates

`git diff --check`; `npm --prefix services/aukro-service run build`; `npm --prefix services/aukro-service test`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-013`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md` before future modifications to this slice.

