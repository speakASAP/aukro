---
id: GOAL-IMPACT-TASK-017
artifact_type: task
artifact_id: TASK-017
artifact_path: ../11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md
primary_goal: GOAL-AUKRO-001
impact_level: high
status: ready
upstream_links:
  - ../01_vision/VISION.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
---
# Goal Impact: TASK-017 Catalog Goal 25 Product Quality Blockers

## Explanation

TASK-017 strengthens the Catalog validation gate required by the Aukro vision. It ensures mandatory Catalog product-quality blockers are consumed before Aukro creates or refreshes drafts and before publish-adjacent policy checks proceed.

## Evidence

- Upstream vision requires offers to be created or updated only after Catalog product validation.
- Catalog Goal 25 policy id is `catalog.product_quality.v1`.
- Aukro keeps local account, draft, compliance, and publication ownership while consuming Catalog-owned product truth.

## Validation

Success is validated by focused synthetic offer tests, TypeScript build, IPS gates, and `git diff --check`.

## Traceability

Vision -> `01_vision/VISION.md` -> Feature -> `10_features/FEAT-005-catalog-warehouse-publisher.md` -> Task -> `11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md` -> Execution Plan -> `21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md` -> Coding Prompt -> `14_prompts/PROMPT-TASK-017-catalog-goal25-product-quality-blockers.md` -> Code -> Validation -> `12_validation/VAL-TASK-017-catalog-goal25-product-quality-blockers.md`.
