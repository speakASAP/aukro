---
id: TASK-016
status: approved
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: complete
upstream:
  - ../10_features/FEAT-003-order-forwarding.md
  - ../10_features/FEAT-009-service-integration-clients.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-016.md
execution_plan:
  - ../21_execution_plans/EP-TASK-016-orders-create-synthetic-smoke.md
---
# TASK-016: Orders Create Synthetic Smoke

## Objective

Add an owner-approved synthetic create-order smoke path for Aukro order forwarding readiness. The smoke must prove the create-order contract, internal service-token header names, stable channel account id, canonical Catalog product id, and Warehouse-owned `warehouseId` mapping without writing production customer/order/payment data and without calling live Orders, Warehouse, marketplace, or payment services.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-003-order-forwarding.md`, `docs/10_features/FEAT-009-service-integration-clients.md`, `docs/16_operations/INTEGRATIONS.md`, and `docs/12_validation/VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-016.md`. This task closes the Goal 7.2B validation gap by giving operators a repeatable runtime smoke that verifies Aukro-to-Orders readiness while preserving source-system boundaries.

## Project Invariant Impact

Applies AUKRO-INV-001, AUKRO-INV-003, AUKRO-INV-004, AUKRO-INV-005, and AUKRO-INV-006. The smoke is traceable, keeps Orders and Warehouse as owners, uses env names only, prints no secret values, and records validation evidence.

## Sensitive-Data Classification

Classification: synthetic. The smoke uses synthetic order ids, account ids, product ids, warehouse ids, item titles, and prices. It checks token presence by env name only and never prints the token value. It must not contain production customer payloads, production order rows, payment data, decoded JWTs, bearer tokens, or live downstream responses.

## Contract/Schema Impact

Adds a service-local npm smoke command and script. No Prisma schema, migration, Kubernetes manifest, external service schema, secret value, public HTTP route, or live Orders contract change is required.

## Replay/Determinism Impact

The smoke is deterministic and in-memory. It uses fake Prisma, fake Warehouse stock rows, and a mocked Orders HTTP client while still executing the production `OrdersService` mapping and `OrderClientService` request construction.

## Scope

- Add `npm --prefix services/aukro-service run smoke:orders-create`.
- Add a synthetic smoke script under the Orders module.
- Validate the script locally with a synthetic token env value and inside the deployed pod with token presence only.
- Update IPS graph, task tracker, and validation evidence.

## Non-Goals

- No live Aukro order creation.
- No write to production `AukroOrder` rows.
- No live call to orders-microservice, warehouse-microservice, marketplace APIs, payment services, or databases.
- No new public HTTP endpoint.
- No Kubernetes manifest or secret changes.
- No protected intent document changes.

## Acceptance Criteria

- [x] Smoke command is explicit and operator runnable.
- [x] Smoke fails closed when `AUKRO_INTERNAL_SERVICE_TOKEN` is missing.
- [x] Smoke proves `orders.create.v1`, `x-internal-service-token`, and `x-service-name: aukro-service`.
- [x] Smoke proves stable `channelAccountId`.
- [x] Smoke proves canonical Catalog `productId`.
- [x] Smoke proves Warehouse-owned `warehouseId` through synthetic Warehouse stock evidence.
- [x] Smoke output is sanitized and states that live Orders, Warehouse, DB, marketplace, and payment calls were not made.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `SYSTEM.md`, `docs/10_features/FEAT-003-order-forwarding.md`, `docs/16_operations/INTEGRATIONS.md`, `shared/clients/order-client.service.ts`, `services/aukro-service/src/aukro/orders/orders.service.ts`, and `docs/12_validation/VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness.md`.

## Validation Task

Create `docs/12_validation/VAL-TASK-016-orders-create-synthetic-smoke.md`, run targeted smoke, service tests/build, strict audit, IPS gates, deploy if validation passes, and run the smoke inside the deployed pod.

## Required Gates

`git diff --check`; `AUKRO_INTERNAL_SERVICE_TOKEN=synthetic-smoke-token npm --prefix services/aukro-service run smoke:orders-create`; `npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-016`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-016-orders-create-synthetic-smoke.md` before coding.
