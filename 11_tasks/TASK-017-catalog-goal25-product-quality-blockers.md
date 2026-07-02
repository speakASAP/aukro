---
id: TASK-017
status: ready
owner: Engineering
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-017.md
execution_plan:
  - ../21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md
---
# TASK-017: Catalog Goal 25 Product Quality Blockers

## Objective

Integrate Aukro from-Catalog product selection, draft creation, and publish-adjacent preflight with Catalog Goal 25 product quality blockers.

## Upstream Links

`01_vision/VISION.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, Catalog contract `catalog-product-quality-review.md`, and policy `catalog.product_quality.v1`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-017.md`. This task prevents Aukro drafts and publication intents from being prepared from Catalog products that still have mandatory Catalog quality blockers, while leaving account, draft, compliance, and marketplace publication ownership in Aukro.

## Scope

- Consume Catalog-owned product readiness/quality blocker evidence for selected products.
- Fail closed before Aukro draft creation when mandatory Catalog blockers or unavailable quality evidence remain.
- Preserve existing Aukro policy checks for account, category, parameters, stock, price, media, duplicate, AI, approval, rate-limit, and idempotency readiness.
- Surface Catalog blocker codes in the product picker, draft response errors, and publish policy evidence.
- Add focused synthetic tests and validation evidence.

## Non-Goals

No Catalog truth redefinition, no Catalog writeback, no Warehouse/Orders/Auth ownership change, no Prisma schema or migration, no Kubernetes/deployment/secret change, and no live Aukro marketplace mutation.

## Acceptance Criteria

- [x] Mandatory Catalog blockers including SKU, title, description, current price, image, placeholder-only image, duplicate SKU, and archived product block Aukro draft creation.
- [x] EAN remains optional/non-blocking for this global Catalog policy.
- [x] Catalog quality lookup failure fails closed.
- [x] Product picker surfaces Catalog quality blockers and disables blocked products.
- [x] Publish-adjacent policy checks re-read Catalog quality evidence for existing offers.
- [x] Tests cover blocker and unavailable-quality handling.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, FEAT-005, TASK-005, TASK-012, Catalog Goal 25 product-quality contract, shared Catalog client, from-Catalog offer controller/service/types/tests, offer policy, and `services/aukro-service/src/ui/ui.controller.ts`.

## Validation Task

Create `12_validation/VAL-TASK-017-catalog-goal25-product-quality-blockers.md`, run focused Aukro tests, service build, IPS gates, and `git diff --check`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md` before coding.
