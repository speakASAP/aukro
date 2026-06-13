---
id: GOAL-IMPACT-TASK-005
artifact_type: task
artifact_id: TASK-005
artifact_path: ../11_tasks/TASK-005-catalog-sell-action-draft-model.md
primary_goal: FEAT-005
secondary_goals:
  - VISION-AUKRO-001 key outcomes
  - ROADMAP-AUKRO-AI-COMMERCE-001
impact_level: high
impact_description: Adds the draft-first catalog sell action needed before human-reviewed publication workflows.
success_metric: Catalog products can create or reuse local Aukro drafts with policy blockers and no live marketplace mutation.
upstream_links:
  - 10_features/FEAT-005-catalog-warehouse-publisher.md
  - 08_roadmap/AI_COMMERCE_ROADMAP.md
downstream_links:
  - services/aukro-service/src/aukro/offers
validation_method: Synthetic service tests, TypeScript build, IPS gates, and validation report.
status: reviewed
---
# GOAL-IMPACT-TASK-005 Catalog Sell Action And Draft Model

## Explanation

TASK-005 advances FEAT-005 by letting catalog or operator workflows request a local Aukro draft for an eligible product/account pair. The draft captures source evidence and policy blockers while preserving human control before any later publish path.

## Evidence

- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`

## Validation

Validate with synthetic service tests, service build, strict documentation audit, pre-coding gate, and deployment-readiness gate.
