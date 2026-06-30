---
id: GOAL-IMPACT-TASK-012
artifact_type: task
artifact_id: TASK-012
artifact_path: ../11_tasks/TASK-012-catalog-content-preview-drafts.md
primary_goal: GOAL-AUKRO-001
impact_level: medium
status: reviewed
upstream_links:
  - ../01_vision/VISION.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../11_tasks/TASK-005-catalog-sell-action-draft-model.md
---
# Goal Impact: TASK-012 Catalog Content Preview Drafts

## Explanation

TASK-012 advances the Aukro service vision by making catalog-driven local drafts use Catalog's canonical marketplace-rendered content instead of relying only on raw product descriptions. Operators see the Aukro-targeted content before creating a draft, and the draft stores source hash/version evidence for review.

The task keeps aukro-service narrow: Catalog owns canonical content, Warehouse owns stock evidence, Aukro policy remains in the offer policy layer, and publication stays outside this lane.

## Evidence

- Upstream feature: `10_features/FEAT-005-catalog-warehouse-publisher.md`.
- Existing draft foundation: `11_tasks/TASK-005-catalog-sell-action-draft-model.md`.
- Planned code path: `shared/clients/catalog-client.service.ts`, `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`, `services/aukro-service/src/aukro/offers/offers.service.ts`, `services/aukro-service/src/aukro/offers/offers.service.spec.ts`, and `services/aukro-service/src/ui/ui.controller.ts`.
- Validation report: `12_validation/VAL-TASK-012-catalog-content-preview-drafts.md`.

## Validation

Success is validated by synthetic offer service tests, TypeScript build, strict IPS audit, pre-coding gate, deployment-readiness gate targeting TASK-012, and `git diff --check`.

## Traceability

Vision -> `01_vision/VISION.md` -> Feature -> `10_features/FEAT-005-catalog-warehouse-publisher.md` -> Task -> `11_tasks/TASK-012-catalog-content-preview-drafts.md` -> Execution Plan -> `21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md` -> Coding Prompt -> `14_prompts/PROMPT-TASK-012-catalog-content-preview-drafts.md` -> Code -> Validation -> `12_validation/VAL-TASK-012-catalog-content-preview-drafts.md`.

