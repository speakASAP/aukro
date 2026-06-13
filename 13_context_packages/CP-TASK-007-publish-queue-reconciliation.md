---
id: CP-TASK-007
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 11_tasks/TASK-007-publish-queue-reconciliation.md
downstream:
  - 14_prompts/PROMPT-TASK-007-publish-queue-reconciliation.md
related_adrs: []
---
# CP-TASK-007 Publish Queue, Attempt Records, And Reconciliation

## Target task

`TASK-007` in `11_tasks/TASK-007-publish-queue-reconciliation.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-008-observability-reconciliation.md`, `21_execution_plans/EP-TASK-007-publish-queue-reconciliation.md`, TASK-005 draft model docs, and TASK-006 human approval docs.

## Included documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, AI_AGENT_RULES, FEAT-008, TASK-005/TASK-006 docs and validation reports, INTEGRATIONS, SERVICE_CLIENT_CONTRACTS, offer service/controller, offer policy service, catalog draft types, AI proposal types, catalog client, warehouse client, and notifications client.

## Excluded documents

Secret files, raw production orders, customer data, live Aukro payloads, tokens, credentials, live service logs, and protected intent document edits.

## Constraints

Implement local publish queue and reconciliation records only. Do not publish to Aukro.cz, retry live mutations, reserve/decrement stock, change order ownership, add secrets, change Kubernetes manifests, or modify protected intent documents.

## Agent prompt

Implement `POST /offers/:id/enqueue-publish` and `POST /offers/:id/reconciliation` with idempotent attempt records, publish-mode policy snapshots, queue metrics, reconciliation drift reports, and synthetic tests.

## Validation instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, inspect git diff, and update the TASK-007 validation report with evidence.
