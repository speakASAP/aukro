---
id: VAL-TASK-016-orders-create-synthetic-smoke
status: reviewed-with-deployment-blocker
target: 11_tasks/TASK-016-orders-create-synthetic-smoke.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: implementation-validated-deployment-blocked
upstream:
  - 11_tasks/TASK-016-orders-create-synthetic-smoke.md
downstream: []
related_adrs: []
---
# Validation Report: TASK-016 Orders Create Synthetic Smoke

Validation id: VAL-TASK-016-orders-create-synthetic-smoke
Target: TASK-016
Date: 2026-07-01
Validator: AI agent

## Summary

Validated a synthetic, non-mutating create-order smoke path for Aukro order forwarding. The smoke verifies Orders create contract construction, internal service-token header names, stable channel account id, canonical Catalog product id, and Warehouse-owned `warehouseId` mapping with in-memory fakes only.

## Upstream goal

TASK-016 supports the Aukro vision outcome that received Aukro orders are forwarded to the order domain while preserving the system boundary that aukro-service does not own order lifecycle, Warehouse stock truth, payment data, or marketplace mutation.

## Criteria checked

| Criterion | Result | Evidence |
|---|---|---|
| Smoke command exists | Pass | `npm --prefix services/aukro-service run smoke:orders-create`. |
| Token gate is checked without printing token value | Pass | Smoke requires `AUKRO_INTERNAL_SERVICE_TOKEN` and output reports env name only. |
| Orders contract version is verified | Pass | Smoke asserts `orders.create.v1`. |
| Internal service headers are verified | Pass | Smoke asserts header names `x-internal-service-token` and `x-service-name`. |
| Stable channel account id is verified | Pass | Smoke asserts synthetic `channelAccountId`. |
| Canonical Catalog product id is verified | Pass | Smoke uses `productIdSource: catalog` and asserts product id. |
| Warehouse-owned `warehouseId` is verified | Pass | Smoke uses synthetic Warehouse stock row and asserts mapped `warehouseId`. |
| Live mutation is avoided | Pass | Smoke output identifies Orders, Warehouse, DB, marketplace, and payment calls as mocked, synthetic in-memory, or not called. |

## Gate evidence

- `git diff --check`: Pass.
- `AUKRO_INTERNAL_SERVICE_TOKEN=synthetic-smoke-token npm --prefix services/aukro-service run smoke:orders-create`: Pass.
- `npm --prefix services/aukro-service test`: Pass.
- `npm --prefix services/aukro-service run build`: Pass.
- `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`: Pass, score 100/100, findings 0.
- `python3 scripts/pre_coding_gate.py --root .`: Fail due to a sensitive-data wording finding in concurrent uncommitted `12_validation/VAL-TASK-015-mp-xml-feed-executor.md`, unrelated to TASK-016.
- `python3 scripts/deployment_readiness_gate.py --root . --target TASK-016`: Fail because pre-coding gate is failing and the repo still has unresolved markers in existing TASK-014/TASK-015/Goal 7.2B docs.
- Deployment rollout to the TASK-016 commit: Not run; deploy gate was not clean.
- In-pod `npm run smoke:orders-create`: Not run; TASK-016 was not deployed.

## Invariant evidence

AUKRO-INV-001, AUKRO-INV-003, AUKRO-INV-004, AUKRO-INV-005, and AUKRO-INV-006 are preserved. The task is traceable, uses synthetic data, does not print secrets, keeps Orders and Warehouse as owners, and records validation evidence.

## Sensitive-data scan evidence

The smoke uses synthetic ids and item data only. It does not print token values, decoded JWTs, raw production orders, customer identifiers, payment data, database rows, or live downstream responses.

## Replay and determinism evidence

The smoke is deterministic. It uses fixed synthetic input, fake Prisma methods, fake Warehouse stock rows, and a fake HTTP adapter for `OrderClientService`. It can be replayed without external cleanup.

## Issues found

No code blocker remains for the synthetic create-order smoke command. Deployment remains blocked by the concurrent uncommitted MP TASK-015 gate finding, unresolved existing doc markers, and the live Warehouse credential blocker recorded in `12_validation/VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness.md`.

## Recommendation

Accept the TASK-016 source change after targeted smoke, tests, build, and strict doc audit. Do not deploy until the unrelated MP TASK-015 pre-coding finding, unresolved existing doc markers, and live Warehouse credential blocker are resolved or explicitly excluded from this deployment gate.

## Traceability confirmation

TASK-016 remains aligned with the approved project vision by validating order forwarding readiness while preserving domain ownership and secret-handling boundaries.
