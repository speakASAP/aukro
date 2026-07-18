---
id: PROMPT-TASK-012-catalog-content-preview-drafts
status: used
source_task: ../11_tasks/TASK-012-catalog-content-preview-drafts.md
execution_plan: ../21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md
context_package: ../13_context_packages/CP-TASK-012-catalog-content-preview-drafts.md
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# PROMPT-TASK-012: Catalog Content Preview Drafts

## Role

Act as an aukro-service backend/UI worker implementing one bounded FEAT-005 lane under IPS governance.

## Task

Integrate Catalog canonical content connector previews into Aukro from-catalog draft creation and the UI preview flow for marketplace `aukro`.

## Context

Use `docs/13_context_packages/CP-TASK-012-catalog-content-preview-drafts.md`, `docs/21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md`, FEAT-005, TASK-005 draft behavior, shared Catalog client, offer draft service/types/tests, and `services/aukro-service/src/ui/ui.controller.ts`.

## Constraints

Keep the workflow draft-first and local. Do not publish to Aukro.cz, enqueue publication, change account linking, alter policy ownership, reserve stock, write back to Catalog, add Prisma migrations, edit Kubernetes/deployment files, change secrets, or modify protected intent documents.

## Acceptance criteria

- The Catalog client can fetch `GET /api/products/:productId/content-previews/:marketplace` for marketplace `aukro`.
- From-catalog drafts store rendered plain text and source evidence.
- Draft descriptions prefer preview plain text over raw product descriptions.
- The dashboard displays preview content before draft creation.
- Synthetic tests cover preview use and fallback behavior.
- Forbidden files remain untouched.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/deployment_readiness_gate.py --root . --target TASK-012`, and `git diff --check`.

