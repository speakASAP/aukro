---
id: CP-TASK-016
status: approved
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: complete
---
# CP-TASK-016 Orders Create Synthetic Smoke

## Target task

`TASK-016` in `docs/11_tasks/TASK-016-orders-create-synthetic-smoke.md`.

## Upstream traceability

`docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-003-order-forwarding.md`, `docs/10_features/FEAT-009-service-integration-clients.md`, `docs/16_operations/INTEGRATIONS.md`, `docs/12_validation/VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness.md`, and `docs/22_goal_impact/GOAL-IMPACT-TASK-016.md`.

## Included documents

Repository instructions, protected intent docs, system/integration docs, the previous Goal 7.2B validation report, Orders service code, Orders client code, package scripts, and graph/task tracker files.

## Excluded documents

Secret values, raw production orders, customer identifiers, decoded JWTs, database exports, payment data, live downstream responses, Kubernetes manifest changes, and protected intent document edits.

## Constraints

The smoke must be synthetic, deterministic, and non-mutating. It must not add a public route. It must not call live Orders, Warehouse, marketplace, payment, or database services. It may check token presence by env name only and must not print token values.

## Agent prompt

Add an operator-runnable synthetic create-order smoke command for Aukro Orders forwarding. Prove the Orders contract and Warehouse-owned `warehouseId` mapping with in-memory fakes and sanitized output only.

## Validation instructions

Run `git diff --check`, `AUKRO_INTERNAL_SERVICE_TOKEN=synthetic-smoke-token npm --prefix services/aukro-service run smoke:orders-create`, `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, strict doc audit, pre-coding gate, deployment-readiness gate targeting TASK-016, deploy if clean, and run the smoke inside the deployed pod.
