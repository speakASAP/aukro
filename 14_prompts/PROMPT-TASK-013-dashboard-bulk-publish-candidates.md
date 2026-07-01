---
id: PROMPT-TASK-013-dashboard-bulk-publish-candidates
status: used
source_task: ../11_tasks/TASK-013-dashboard-bulk-publish-candidates.md
execution_plan: ../21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md
context_package: ../13_context_packages/CP-TASK-013-dashboard-bulk-publish-candidates.md
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# PROMPT-TASK-013: Dashboard Bulk Publish Candidates

## Role

Act as an aukro-service backend/UI worker implementing one bounded FEAT-005 dashboard automation lane under IPS governance.

## Task

Add paginated unpublished catalog candidates, paginated current-account Aukro products, checkbox selection, and capped bulk draft plus publish-intent processing to the dashboard.

## Context

Use `13_context_packages/CP-TASK-013-dashboard-bulk-publish-candidates.md`, `21_execution_plans/EP-TASK-013-dashboard-bulk-publish-candidates.md`, FEAT-005, TASK-005 draft behavior, TASK-007 publish-intent behavior, TASK-012 content preview behavior, shared Catalog client, and `services/aukro-service/src/ui/ui.controller.ts`.

## Constraints

Keep the workflow draft-first and record-only for publish intent. Do not publish to Aukro.cz, add browser automation, scrape Aukro, bypass policy gates, reserve Warehouse stock, write back to Catalog, add Prisma migrations, edit Kubernetes/deployment files, change secrets, or modify protected intent documents.

## Acceptance criteria

- Dashboard candidate block is paginated and searchable.
- Candidate block excludes products that are both active and have an Aukro offer id for the current account.
- Candidate cards show thumbnails where available.
- Dashboard includes a second paginated block for current-account Aukro products.
- Operators can select a page, clear selection, and process selected products in one capped bulk action.
- Bulk action creates or refreshes local drafts and records publish intent without live marketplace mutation.

## Validation

Run `git diff --check`, `npm --prefix services/aukro-service run build`, `npm --prefix services/aukro-service test`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-013`.

