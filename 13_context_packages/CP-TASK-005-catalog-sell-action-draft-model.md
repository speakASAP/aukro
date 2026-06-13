---
id: CP-TASK-005
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 11_tasks/TASK-005-catalog-sell-action-draft-model.md
downstream:
  - 14_prompts/PROMPT-TASK-005-catalog-sell-action-draft-model.md
related_adrs: []
---
# CP-TASK-005 Catalog Sell Action And Draft Model

## Target task

`TASK-005` in `11_tasks/TASK-005-catalog-sell-action-draft-model.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, and `21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md`.

## Included documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, FEAT-005, INTEGRATIONS, offer service/controller, offer policy service, catalog client, and warehouse client.

## Excluded documents

Secret files, raw production orders, customer data, live Aukro payloads, tokens, credentials, and live service logs.

## Constraints

Implement local draft creation only. Do not publish, enqueue publication, reserve stock, add secrets, change Prisma schema, or move catalog/warehouse ownership into aukro-service.

## Agent prompt

Implement `POST /offers/from-catalog` with idempotent local draft creation, source evidence, policy blockers, and synthetic tests.

## Validation instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, and git diff review.
