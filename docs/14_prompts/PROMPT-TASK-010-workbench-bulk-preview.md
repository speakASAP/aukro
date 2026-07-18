---
id: PROMPT-TASK-010-workbench-bulk-preview
status: used
source_task: ../11_tasks/TASK-010-workbench-bulk-preview.md
execution_plan: ../21_execution_plans/EP-TASK-010-workbench-bulk-preview.md
context_package: ../13_context_packages/CP-TASK-010-workbench-bulk-preview.md
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
---
# PROMPT-TASK-010: Workbench Bulk Preview API

## Role

Act as an aukro-service backend engineer implementing a documented Stage 6 task under IPS governance.

## Task

Implement read-only operator workbench bulk preview over existing local review queue items.

## Context

Use `CP-TASK-010`, `EP-TASK-010`, roadmap Stage 6, TASK-009 workbench API, local workbench service/controller/types/tests, and existing synthetic records. Protected intent documents remain read-only.

## Constraints

- Bulk preview is read-only and must not call live Aukro mutation APIs.
- Do not mutate catalog, marketing, supplier, payment, warehouse, order, AI, logging, or BI source systems.
- Do not expose customer contact fields, raw order payloads, buyer messages, tokens, credentials, or live payloads.
- Use synthetic tests only.
- Do not change Prisma schema, Kubernetes manifests, secrets, protected intent docs, or source-system ownership boundaries.

## Acceptance Criteria

- `GET /workbench/bulk-preview` returns safe candidate items from the review queue.
- Optional account, type, minimum-priority, and limit filtering is supported.
- Limits are capped safely and remaining item count is returned.
- Synthetic tests cover filters, caps, priority thresholds, and minimization.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-010`.
