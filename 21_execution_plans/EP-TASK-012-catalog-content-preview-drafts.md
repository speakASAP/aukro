---
id: EP-TASK-012
status: reviewed
source_task: ../11_tasks/TASK-012-catalog-content-preview-drafts.md
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-012.md
---
# EP-TASK-012 Catalog Content Preview Drafts

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-012. Lifecycle state: bounded implementation of Catalog canonical content preview in local draft creation and the dashboard preview flow.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `22_goal_impact/GOAL-IMPACT-TASK-012.md`

## Goal Impact

The plan improves the quality and auditability of local Aukro drafts by using Catalog-rendered marketplace content and source evidence. It advances FEAT-005 while preserving Catalog, Warehouse, account, policy, publish, order, and secret ownership boundaries.

## Project Invariants

- AUKRO-INV-001: Add traceable task, goal impact, context, execution plan, prompt, validation, and graph entries.
- AUKRO-INV-002: Preserve catalog validation before offer readiness and use Catalog canonical content as evidence.
- AUKRO-INV-003: Keep Catalog and Warehouse as source systems; aukro-service stores only local draft evidence.
- AUKRO-INV-004: Use synthetic tests and no raw production/customer/order data.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic and catalog-derived product content. Persisted metadata is limited to title, rendered plain text, marketplace, format, source hash/version/generated timestamp, fallback flag, overrides flag, and warnings. The lane does not store tokens, credentials, customer identifiers, raw orders, live logs, or live Aukro responses.

## Contract Validation Plan

Add `CatalogClientService.getProductContentPreview(productId, 'aukro')` for Catalog's protected content-preview endpoint. Synthetic tests validate that from-catalog draft creation uses preview plain text and source evidence when present and falls back to product description when absent.

## Replay/Determinism Plan

Draft creation remains deterministic for `(accountId, productId)` by reusing an existing offer and refreshing metadata. UI preview is read-only and has no replay key because it does not mutate data.

## Scope

Add Catalog preview retrieval, draft snapshot source evidence, preview-first UI behavior, synthetic tests, and IPS artifacts for TASK-012.

## Non-Goals

No publish queue behavior, live Aukro API call, account linking, policy ownership change, stock reservation, order forwarding, Prisma migration, Kubernetes/deployment change, secret change, or Catalog writeback.

## Files to Inspect

- `AGENTS.md`
- `AGENT_OPERATIONS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `17_governance/AI_AGENT_RULES.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `services/aukro-service/src/ui/ui.controller.ts`

## Files to Create

- `11_tasks/TASK-012-catalog-content-preview-drafts.md`
- `12_validation/VAL-TASK-012-catalog-content-preview-drafts.md`
- `13_context_packages/CP-TASK-012-catalog-content-preview-drafts.md`
- `14_prompts/PROMPT-TASK-012-catalog-content-preview-drafts.md`
- `21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md`
- `22_goal_impact/GOAL-IMPACT-TASK-012.md`

## Files to Modify

- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/aukro/offers/catalog-draft.types.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `services/aukro-service/src/ui/ui.controller.ts`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Prisma schema or migrations
- Kubernetes/deployment manifests
- Runtime secrets or secret examples
- Account, policy, publish, warehouse reservation, and order ownership files outside the scoped implementation path

## Implementation Steps

1. Add the Catalog content-preview client method with service-token capable request options.
2. Extend draft snapshot types for rendered plain text, description source, and Catalog source evidence.
3. Fetch preview data in `createFromCatalog` and use preview plain text before raw product description.
4. Add a guarded UI endpoint that returns sanitized preview data for marketplace `aukro`.
5. Update the inline dashboard to preview content before draft creation and require confirmation before calling ui/publish.
6. Add synthetic test coverage for preview use and fallback.
7. Add TASK-012 IPS artifacts and graph links.
8. Run validation commands and update the validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` for service behavior and `npm --prefix services/aukro-service run build` for TypeScript coverage.

## Validation Plan

Run strict documentation audit, pre-coding gate, deployment-readiness gate targeting TASK-012, `git diff --check`, and inspect the final git diff for forbidden file changes.

## Gate Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-012
git diff --check
```

## Documentation Updates

Create TASK-012 task, goal impact, context package, execution plan, coding prompt, validation report, and graph links.

## Parallel Execution

Single workstream, ready now. Parallel edits are not started because the code path shares `offers.service.ts`, `catalog-draft.types.ts`, `offers.service.spec.ts`, and the single inline UI controller. Integration owner and validation owner are this worker session. Merge order: code and tests, IPS docs, graph, validation report.

## Rollback Plan

Revert the TASK-012 code and IPS artifact diff. No database migration, secret rotation, warehouse cleanup, queue replay, or live Aukro cleanup is required.

## Agent Handoff Prompt

Implement TASK-012 by integrating Catalog canonical content previews for marketplace `aukro` into from-catalog draft metadata and the dashboard preview flow. Preserve draft-first behavior, account/policy/publish ownership, and synthetic validation.

## Completion Checklist

- [x] Implementation scoped
- [x] Tests identified
- [x] IPS artifacts created
- [x] Forbidden files excluded
- [x] Validation commands named
