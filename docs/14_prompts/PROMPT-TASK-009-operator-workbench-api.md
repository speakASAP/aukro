---
id: PROMPT-TASK-009-operator-workbench-api
status: used
source_task: ../11_tasks/TASK-009-operator-workbench-api.md
execution_plan: ../21_execution_plans/EP-TASK-009-operator-workbench-api.md
context_package: ../13_context_packages/CP-TASK-009-operator-workbench-api.md
created: 2026-06-14
last_updated: 2026-06-14
completeness_level: complete
---
# PROMPT-TASK-009: Operator Workbench API

## Role

Act as an aukro-service backend engineer implementing a documented Stage 6 task under IPS governance.

## Task

Implement read-only operator workbench API aggregation for local Aukro selling state.

## Context

Use `CP-TASK-009`, `EP-TASK-009`, roadmap Stage 6, TASK-005 draft metadata, TASK-006 AI review metadata, TASK-007 queue/reconciliation metadata, TASK-008 revenue analytics metadata, accounts/offers/orders local records, and existing synthetic tests. Protected intent documents remain read-only.

## Constraints

- Workbench endpoints are read-only and must not call live Aukro mutation APIs.
- Do not mutate catalog, marketing, supplier, payment, warehouse, order, AI, logging, or BI source systems.
- Do not expose customer contact fields, raw order payloads, buyer messages, tokens, credentials, or live payloads.
- Use synthetic tests only.
- Do not change Prisma schema, Kubernetes manifests, secrets, protected intent docs, or source-system ownership boundaries.

## Acceptance Criteria

- `GET /workbench/summary` returns safe counts and metrics.
- `GET /workbench/review-queue` returns actionable queue items with reason codes.
- `GET /workbench/offers/:id` returns safe offer detail context.
- Account filtering is supported.
- Synthetic tests cover summary, queue, detail, filtering, and minimization.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-009`.
