---
id: GOAL-IMPACT-TASK-013
artifact_type: task
artifact_id: TASK-013
artifact_path: ../11_tasks/TASK-013-dashboard-bulk-publish-candidates.md
primary_goal: GOAL-AUKRO-001
impact_level: high
status: implemented
upstream_links:
  - ../01_vision/VISION.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../11_tasks/TASK-012-catalog-content-preview-drafts.md
---
# Goal Impact: TASK-013 Dashboard Bulk Publish Candidates

## Explanation

TASK-013 moves the Aukro service from one-product manual draft creation toward operator-scale selling automation. It lets the operator see eligible catalog candidates, distinguish current-account offers, select many products, and process them as one batch while preserving policy gates and traceable publish intent.

The task deliberately does not redefine success as live Aukro publication. The current system has no approved live Aukro WebAPI executor, and TASK-007 keeps publish attempts record-only. This task therefore advances automation without violating the platform boundary.

## Evidence

- Upstream feature: `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`.
- Existing draft foundation: `docs/11_tasks/TASK-005-catalog-sell-action-draft-model.md`.
- Existing publish-intent foundation: `docs/11_tasks/TASK-007-publish-queue-reconciliation.md`.
- Existing content preview foundation: `docs/11_tasks/TASK-012-catalog-content-preview-drafts.md`.
- Code path: `services/aukro-service/src/ui/ui.controller.ts`.
- Validation report: `docs/12_validation/VAL-TASK-013-dashboard-bulk-publish-candidates.md`.

## Validation

Success is validated by TypeScript build, service tests, strict documentation audit, pre-coding gate, deployment-readiness gate targeting TASK-013, and `git diff --check`.

## Traceability

Vision -> `docs/01_vision/VISION.md` -> Feature -> `docs/10_features/FEAT-005-catalog-warehouse-publisher.md` -> Task -> `docs/11_tasks/TASK-013-dashboard-bulk-publish-candidates.md` -> Execution Plan -> `docs/21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md` -> Coding Prompt -> `docs/14_prompts/PROMPT-TASK-013-dashboard-bulk-publish-candidates.md` -> Code -> Validation -> `docs/12_validation/VAL-TASK-013-dashboard-bulk-publish-candidates.md`.

