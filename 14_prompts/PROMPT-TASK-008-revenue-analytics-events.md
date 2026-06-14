---
id: PROMPT-TASK-008-revenue-analytics-events
status: used
source_task: ../11_tasks/TASK-008-revenue-analytics-events.md
execution_plan: ../21_execution_plans/EP-TASK-008-revenue-analytics-events.md
context_package: ../13_context_packages/CP-TASK-008-revenue-analytics-events.md
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
---
# PROMPT-TASK-008: Revenue Analytics And Cross-Service Events

## Role

Act as an aukro-service backend engineer implementing a documented FEAT-007 task under IPS governance.

## Task

Implement local revenue analytics records and masked recommendation events for Aukro offers.

## Context

Use `CP-TASK-008`, `EP-TASK-008`, FEAT-007, TASK-004 service clients, TASK-006 human review metadata, TASK-007 queue/reconciliation metadata, offer service/controller, and shared logging client. Protected intent documents remain read-only.

## Constraints

- Analytics records are local metadata only and must not call live Aukro publish/update APIs.
- Do not mutate catalog, marketing, supplier, payment, warehouse, order, AI, or BI source systems.
- Recommendation events must be explainable and masked.
- Repeated analytics calls with the same analytics ID reuse the existing record.
- Use synthetic tests only.
- Do not change Prisma schema, Kubernetes manifests, secrets, protected intent docs, or source-system ownership boundaries.

## Acceptance Criteria

- `POST /offers/:id/revenue-analytics` records a metric snapshot with actor, correlation ID, source, observedAt, blocked revenue, and recommendation events.
- Recommendation events include reason codes and target service names without PII or raw payloads.
- Optional logging delivery failures do not block persistence.
- Repeated requests with the same analytics ID reuse the existing record.
- Synthetic tests cover creation, replay, blocked revenue recommendations, and masking.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-008`.

## Expected Output

The coding agent must return files changed, documents created, missing markers, tests run, validation evidence, deviations, and commit/push/deploy status when applicable.
