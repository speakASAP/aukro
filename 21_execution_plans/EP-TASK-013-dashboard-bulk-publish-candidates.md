---
id: EP-TASK-013
status: implemented
source_task: ../11_tasks/TASK-013-dashboard-bulk-publish-candidates.md
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-013.md
---
# EP-TASK-013 Dashboard Bulk Publish Candidates

## Metadata

Owner: Engineering. Status: implemented. Source task: TASK-013. Lifecycle state: bounded dashboard implementation for paginated candidate review and capped bulk draft plus publish-intent processing.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `11_tasks/TASK-007-publish-queue-reconciliation.md`
- `11_tasks/TASK-012-catalog-content-preview-drafts.md`
- `16_operations/AUKRO_PLATFORM_RULES.md`
- `22_goal_impact/GOAL-IMPACT-TASK-013.md`

## Goal Impact

This plan advances the service toward automated selling by letting an operator review all eligible catalog products in pages, distinguish current-account offers, select many products, and request publication preparation in one action while preserving the existing fail-closed marketplace boundary.

## Project Invariants

- AUKRO-INV-001: Add traceable task, goal impact, context, execution plan, prompt, validation, and graph entries.
- AUKRO-INV-002: Preserve catalog validation and publish policy gates.
- AUKRO-INV-003: Keep Catalog and Warehouse as source systems.
- AUKRO-INV-004: Return only catalog-derived and local operational metadata.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: catalog-derived product metadata and local offer metadata. The implementation returns service-safe ids, titles, thumbnails, local statuses, blocker codes, and counts. It excludes credentials, customer identifiers, raw order data, live Aukro payloads, production logs, and secrets.

## Contract Validation Plan

Validate the UI-scoped endpoints by TypeScript build and service tests. The new endpoints reuse existing Catalog, Prisma, draft, and publish-intent contracts without schema changes.

## Replay/Determinism Plan

Draft creation remains deterministic through existing `(accountId, productId)` reuse. Publish intent uses stable UI idempotency keys so repeated bulk actions reuse existing attempts.

## Scope

Add paginated candidate and account-offer dashboard read models, normalized card DTOs, selection controls, and capped bulk draft plus publish-intent processing.

## Non-Goals

No live Aukro API mutation, browser automation, scraping, Warehouse reservation, order lifecycle change, Catalog writeback, Prisma migration, Kubernetes/deployment change, secret change, or protected intent document change.

## Files to Inspect

- `AGENTS.md`
- `AGENT_OPERATIONS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `10_features/FEAT-005-catalog-warehouse-publisher.md`
- `11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `11_tasks/TASK-007-publish-queue-reconciliation.md`
- `11_tasks/TASK-012-catalog-content-preview-drafts.md`
- `16_operations/AUKRO_PLATFORM_RULES.md`
- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/ui/ui.controller.ts`

## Files to Create

- `11_tasks/TASK-013-dashboard-bulk-publish-candidates.md`
- `12_validation/VAL-TASK-013-dashboard-bulk-publish-candidates.md`
- `13_context_packages/CP-TASK-013-dashboard-bulk-publish-candidates.md`
- `14_prompts/PROMPT-TASK-013-dashboard-bulk-publish-candidates.md`
- `21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md`
- `22_goal_impact/GOAL-IMPACT-TASK-013.md`

## Files to Modify

- `services/aukro-service/src/ui/ui.controller.ts`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Prisma schema or migrations
- Kubernetes/deployment manifests
- Runtime secrets or secret examples
- Account credential, Warehouse reservation, order forwarding, and live Aukro API executor files

## Implementation Steps

1. Add account-aware candidate filtering to `GET /aukro/ui/catalog/products`.
2. Add normalized candidate DTO fields for thumbnails and local offer state.
3. Add `GET /aukro/ui/offers` for paginated current-account offer cards.
4. Add `POST /aukro/ui/publish/bulk` with a 50-product cap and partial-success results.
5. Update dashboard markup, CSS, and JavaScript for selection, pagination, and bulk feedback.
6. Preserve the existing preview and single-product draft flow.
7. Add TASK-013 IPS artifacts and graph links.
8. Run validation commands and update the validation report.

## Test Plan

Run `npm --prefix services/aukro-service run build` for TypeScript coverage and `npm --prefix services/aukro-service test` for existing policy, orders, offers, and workbench behavior.

## Validation Plan

Run strict documentation audit, pre-coding gate, deployment-readiness gate targeting TASK-013, `git diff --check`, and inspect the final diff for forbidden file changes.

## Gate Commands

```bash
git diff --check
npm --prefix services/aukro-service run build
npm --prefix services/aukro-service test
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-013
```

## Documentation Updates

Create TASK-013 task, goal impact, context package, execution plan, coding prompt, validation report, and graph links.

## Parallel Execution

Read-only backend and UI exploration ran in separate subagents. Implementation stayed in one integration workstream because the active code path shares `services/aukro-service/src/ui/ui.controller.ts` and the remote worktree already contained TASK-012 edits. Integration owner and validation owner are this session. Merge order: inspect dirty TASK-012 state, implement UI controller, validate code, add IPS docs, update graph, run gates.

## Rollback Plan

Revert the TASK-013 changes in `ui.controller.ts`, TASK-013 IPS artifacts, and graph edges. No database migration, secret rotation, live Aukro cleanup, Warehouse cleanup, order cleanup, or queue drain is required because live marketplace mutation remains disabled.

## Agent Handoff Prompt

Implement TASK-013 by adding paginated unpublished catalog candidates, paginated current-account Aukro products, checkbox selection, and capped bulk draft plus publish-intent processing. Preserve TASK-012 preview behavior and TASK-007 record-only publish boundaries.

## Completion Checklist

- [x] Implementation scoped
- [x] Tests identified
- [x] IPS artifacts created
- [x] Forbidden files excluded
- [x] Validation commands named

