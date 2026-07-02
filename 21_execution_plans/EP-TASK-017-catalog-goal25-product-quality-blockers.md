---
id: EP-TASK-017
status: approved
source_task: ../11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md
owner: Engineering
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-017.md
---
# EP-TASK-017 Catalog Goal 25 Product Quality Blockers

## Metadata

Owner: Engineering. Status: approved by delegated worker prompt on 2026-07-02. Source task: TASK-017. Lifecycle state: bounded Aukro consumer integration for Catalog Goal 25 quality blockers.

## Upstream Traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `11_tasks/TASK-005-catalog-sell-action-draft-model.md`, `11_tasks/TASK-012-catalog-content-preview-drafts.md`, and Catalog policy `catalog.product_quality.v1`.

## Goal Impact

Aukro will stop preparing local drafts or publish-adjacent intent from Catalog products that still have mandatory global Catalog quality blockers. This preserves the vision outcome that offers are created or updated only after catalog product validation.

## Scope

Add a Catalog quality/readiness consumer path, fail-closed draft guard, publish evidence refresh, picker blocker surfacing, and focused tests/reporting.

## Non-Goals

No marketplace live mutation, no Catalog writes, no Catalog truth replication, no account/policy ownership transfer, no schema/migration, no deployment manifest, and no secret changes.

## Files to Inspect

- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.types.ts`
- `services/aukro-service/src/ui/ui.controller.ts`

## Files to Create

- `11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md`
- `21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md`
- `22_goal_impact/GOAL-IMPACT-TASK-017.md`
- `13_context_packages/CP-TASK-017-catalog-goal25-product-quality-blockers.md`
- `14_prompts/PROMPT-TASK-017-catalog-goal25-product-quality-blockers.md`
- `12_validation/VAL-TASK-017-catalog-goal25-product-quality-blockers.md`

## Files to Modify

- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.types.ts`
- `services/aukro-service/src/ui/ui.controller.ts`

## Files That Must Not Be Modified

Protected intent documents, Prisma schema/migrations, Kubernetes/deployment manifests, runtime secrets, Warehouse, Orders, Auth, and live Aukro executor mutation paths.

## Implementation Steps

1. Add a shared Catalog client method for exact per-product quality/readiness diagnostics.
2. Add a draft quality snapshot type that stores Catalog policy id, blocker codes, source, and next action without storing authorization tokens.
3. Fail closed before draft create/reuse when mandatory Catalog blockers or unavailable quality evidence remain.
4. Re-read Catalog quality evidence for existing offers during publish-adjacent policy checks.
5. Surface Catalog blocker codes in the dashboard product picker and disable blocked candidate selection.
6. Add synthetic tests for mandatory blockers, unavailable Catalog quality evidence, and publish-adjacent policy blocking.
7. Record validation evidence.

## Test Plan

Run the focused offer service spec that covers from-Catalog draft creation, Catalog quality blocker rejection, unavailable quality evidence rejection, and publish-adjacent policy evidence:

```bash
cd services/aukro-service
npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/aukro/offers/offers.service.spec.ts
```

## Validation Plan

Run `git diff --check`, focused `offers.service.spec.ts`, `npm --prefix services/aukro-service run build`, and IPS documentation gates. If broader service tests fail for unrelated debt, record the exact current-task impact in validation.

## Gate Commands

```bash
git diff --check
npm --prefix shared run build
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-017
```

## Documentation Updates

Create TASK-017 task, execution plan, context package, coding prompt, goal-impact record, validation report, and graph links. Do not modify protected constitution or vision documents.

## Rollback Plan

Revert the TASK-017 code and documentation changes as one unit before deployment. No database migration, runtime secret, Kubernetes manifest, or live marketplace mutation is introduced by this task.

## Agent Handoff Prompt

Implement only the Aukro consumer side for Catalog Goal 25 product quality blockers. Use Catalog-owned readiness/quality evidence, keep EAN optional, fail closed before draft creation when mandatory blockers or unavailable quality evidence remain, and record validation evidence.

## Completion Checklist

- [x] Implementation complete
- [x] Focused tests complete
- [x] Build and diff validation complete
- [x] Documentation updated
- [x] Deviations documented

## Parallel Execution

Single worker lane only. The touched files form one shared draft/policy/UI contract, so parallel edits would create avoidable conflicts. Integration owner and validation owner: current Aukro worker. Merge order: code and types, tests, validation report, optional orchestrator status update by parent thread.
