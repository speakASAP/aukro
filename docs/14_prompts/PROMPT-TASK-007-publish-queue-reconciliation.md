---
id: PROMPT-TASK-007-publish-queue-reconciliation
status: used
source_task: ../11_tasks/TASK-007-publish-queue-reconciliation.md
execution_plan: ../21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md
context_package: ../13_context_packages/CP-TASK-007-publish-queue-reconciliation.md
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
---
# PROMPT-TASK-007: Publish Queue, Attempt Records, And Reconciliation

## Role

Act as an aukro-service backend engineer implementing a documented FEAT-008 task under IPS governance.

## Task

Implement local publish queue observability, idempotent publish attempt records, and reconciliation drift reports for Aukro offers.

## Context

Use `CP-TASK-007`, `EP-TASK-007`, FEAT-008, TASK-005 draft metadata, TASK-006 human review metadata, offer service/controller, offer policy service, catalog client, warehouse client, and notifications client. Protected intent documents remain read-only.

## Constraints

- Queue entries are local metadata only and must not call live Aukro publish/update APIs.
- Mark attempts `queued` only after publish-mode policy passes.
- Record blocked attempts with policy snapshot, blockers, actor, idempotency key, and mutation disabled marker.
- Reuse existing attempt records by idempotency key.
- Reconciliation reports must detect drift without changing catalog, warehouse, order, or Aukro state.
- Use synthetic tests only.
- Do not change Prisma schema, Kubernetes manifests, secrets, protected intent docs, or source-system ownership boundaries.

## Acceptance criteria

- `POST /offers/:id/enqueue-publish` records a publish attempt with idempotency key, actor, status, policy snapshot, queue metrics, and blockers.
- Publish attempt status is `queued` only when catalog, stock, policy, human approval, rate-limit, and idempotency evidence pass.
- Missing evidence produces a blocked attempt record and no live mutation.
- Repeated enqueue with the same idempotency key reuses the existing attempt record.
- `POST /offers/:id/reconciliation` records stock, price, and status drift evidence without source-system mutation.
- Synthetic tests cover queued, blocked, replay, and reconciliation paths.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-007`.

## Task Summary

Create the FEAT-008 local publish queue and reconciliation observability slice without live marketplace mutation.

## Required Context

`docs/13_context_packages/CP-TASK-007-publish-queue-reconciliation.md`, `docs/21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md`, FEAT-008, offer service/controller, policy service, catalog/warehouse clients, TASK-005 draft metadata, and TASK-006 human approval metadata.

## Allowed Changes

Offer controller/service files, a publish observability type file, synthetic offer service tests, TASK-007 IPS artifacts, task tracker, and graph links.

## Forbidden Changes

Protected constitution/vision documents, Prisma schema, runtime secrets, Kubernetes manifests, live Aukro publish/update behavior, warehouse reservation/decrement behavior, order ownership changes, and UI files.

## Implementation Instructions

Add typed enqueue and reconciliation contracts, route `POST /offers/:id/enqueue-publish`, route `POST /offers/:id/reconciliation`, publish-mode policy evidence merge, idempotent rawData publish attempts, per-account queue metrics, drift comparison, rawData reconciliation reports, and synthetic tests.

## Validation Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-007
```

## Expected Output

The coding agent must return:

- Files changed
- Documents created
- Missing sections and remaining markers
- Tests run
- Validation evidence
- Deviations
- Commit, push, and deploy status
