---
id: EP-TASK-005
status: reviewed
source_task: ../11_tasks/TASK-005-catalog-sell-action-draft-model.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-005.md
---
# EP-TASK-005 Catalog Sell Action And Draft Model

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-005. Lifecycle state: implementation scoped to local draft creation and reuse.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `16_operations/INTEGRATIONS.md`
- `22_goal_impact/GOAL-IMPACT-TASK-005.md`

## Goal Impact

The plan turns catalog eligibility into a local Aukro draft record that operators or later approval workflows can inspect. It advances FEAT-005 without creating live listings or moving catalog, stock, or approval ownership into aukro-service.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links.
- AUKRO-INV-002: Require catalog, stock, price, media, category, and parameter evidence before a draft can be policy-allowed.
- AUKRO-INV-003: Keep catalog and warehouse as source systems; aukro-service stores only the local draft and evidence snapshot.
- AUKRO-INV-004: Use synthetic tests and no raw production records.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. Tests and docs contain only synthetic product/account identifiers and mocked service payloads. The endpoint stores catalog-derived product fields, not secrets or customer/order records.

## Contract Validation Plan

Synthetic service tests validate request handling, draft creation, idempotent reuse, and policy blocker responses with mocked Prisma, catalog, warehouse, policy, and logger dependencies.

## Replay/Determinism Plan

Draft creation is deterministic for `(accountId, productId)`. If a matching local offer exists, the endpoint updates the draft snapshot instead of creating a duplicate.

## Scope

Add a typed catalog sell action endpoint and local draft model metadata under `AukroOffer.rawData`.

## Non-Goals

No publish queue, live Aukro mutation, stock reservation, Prisma migration, UI, notification fanout, or AI proposal generation.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/policy/*`
- `shared/clients/catalog-client.service.ts`
- `shared/clients/warehouse-client.service.ts`

## Files to Create

- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `12_validation/VAL-TASK-005-catalog-sell-action-draft-model.md`
- `13_context_packages/CP-TASK-005-catalog-sell-action-draft-model.md`
- `14_prompts/PROMPT-TASK-005-catalog-sell-action-draft-model.md`
- `21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md`
- `22_goal_impact/GOAL-IMPACT-TASK-005.md`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`

## Files to Modify

- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/package.json`
- `TASKS.md`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, and Prisma schema.

## Implementation Steps

1. Create TASK-005 IPS artifacts.
2. Add catalog draft request/response types.
3. Add `POST /offers/from-catalog` before parameterized offer routes.
4. Implement create-or-refresh draft service logic using catalog, pricing, media, and warehouse clients.
5. Store draft metadata and policy evidence in `rawData`.
6. Add deterministic service tests.
7. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate, deployment-readiness gate for TASK-005, and inspect git diff.

## Gate Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-005
```

## Documentation Updates

Create TASK-005 docs and update the task tracker plus graph.

## Rollback Plan

Revert the TASK-005 commit. No database migration, secret rotation, queue replay, or warehouse cleanup is required.

## Agent Handoff Prompt

Implement FEAT-005 local draft creation only. Keep the workflow draft-first, idempotent by account/product, policy-evidence based, synthetic-test covered, and free of live Aukro marketplace mutations.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
