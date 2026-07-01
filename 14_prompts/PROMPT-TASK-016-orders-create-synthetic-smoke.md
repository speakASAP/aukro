---
id: PROMPT-TASK-016-orders-create-synthetic-smoke
status: used
source_task: ../11_tasks/TASK-016-orders-create-synthetic-smoke.md
execution_plan: ../21_execution_plans/EP-TASK-016-orders-create-synthetic-smoke.md
context_package: ../13_context_packages/CP-TASK-016-orders-create-synthetic-smoke.md
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: complete
---
# PROMPT-TASK-016: Orders Create Synthetic Smoke

## Role

Act as an aukro-service backend worker implementing one bounded synthetic validation lane under IPS governance.

## Task

Add a non-mutating create-order smoke command that verifies Aukro order forwarding contract readiness without writing production data or calling live downstream systems.

## Context

Use `13_context_packages/CP-TASK-016-orders-create-synthetic-smoke.md`, `21_execution_plans/EP-TASK-016-orders-create-synthetic-smoke.md`, FEAT-003 order forwarding, FEAT-009 service integration clients, Orders service mapping, and shared Orders client request construction.

## Constraints

Do not add a public HTTP route, create production orders, call live orders-microservice, call live warehouse-microservice, call marketplace APIs, call payment services, read raw DB rows, print token values, decode JWTs, change Kubernetes manifests, change secrets, or modify protected intent documents.

## Acceptance criteria

- Smoke command exists as `npm --prefix services/aukro-service run smoke:orders-create`.
- Smoke fails when `AUKRO_INTERNAL_SERVICE_TOKEN` is absent.
- Smoke verifies `orders.create.v1`, `x-internal-service-token`, `x-service-name: aukro-service`, `channelAccountId`, Catalog product id, and Warehouse-owned `warehouseId`.
- Smoke output is sanitized JSON and says live DB, Orders, Warehouse, marketplace, and payment calls were not made.
- Smoke runs in the deployed pod.

## Validation

Run `git diff --check`, targeted smoke, service tests/build, strict audit, pre-coding gate, deployment-readiness gate targeting TASK-016, deployment rollout status, health checks, and in-pod smoke.
