---
id: CP-TASK-013
status: implemented
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# CP-TASK-013 Dashboard Bulk Publish Candidates

## Target task

`TASK-013` in `11_tasks/TASK-013-dashboard-bulk-publish-candidates.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `11_tasks/TASK-005-catalog-sell-action-draft-model.md`, `11_tasks/TASK-007-publish-queue-reconciliation.md`, `11_tasks/TASK-012-catalog-content-preview-drafts.md`, `16_operations/AUKRO_PLATFORM_RULES.md`, and `22_goal_impact/GOAL-IMPACT-TASK-013.md`.

## Included documents

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent documents, FEAT-005, TASK-005, TASK-007, TASK-012 docs, platform rules, shared Catalog client, offer service draft and publish-intent contracts, and `services/aukro-service/src/ui/ui.controller.ts`.

## Excluded documents

Runtime secrets, Kubernetes manifests, Prisma migrations, live Aukro payloads, raw customer data, browser automation flows, and source-system mutation contracts.

## Constraints

Keep the workflow local and fail-closed. The user-facing bulk button may request publication preparation, but the backend must only create or refresh drafts and record publish intent until a separate official Aukro WebAPI executor exists. Do not add live marketplace mutation, scraping, downstream writes, schema migrations, or secret changes.

## Agent prompt

Implement TASK-013 by adding paginated unpublished catalog candidates, paginated current-account Aukro products, checkbox selection, and capped bulk draft plus publish-intent processing in the dashboard. Preserve TASK-012 preview behavior and the TASK-007 record-only publish boundary.

## Validation instructions

Run `git diff --check`, `npm --prefix services/aukro-service run build`, `npm --prefix services/aukro-service test`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-013`.

