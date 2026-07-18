---
id: CP-TASK-017
status: ready
owner: Engineering
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: complete
---
# CP-TASK-017 Catalog Goal 25 Product Quality Blockers

## Target task

`TASK-017` in `docs/11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md`.

## Upstream traceability

`docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, TASK-005, TASK-012, and Catalog Goal 25 policy `catalog.product_quality.v1`.

## Included documents

Repository instructions, protected intent docs, Catalog Goal 25 contract and validation report, shared Catalog client, offer draft controller/service/types/tests, offer policy types, and dashboard UI controller.

## Excluded documents

Secrets, live marketplace payloads, raw production logs, customer/order records, Prisma migrations, deployment manifests, and unrelated service ownership files.

## Constraints

Use Catalog-owned readiness/quality evidence. Do not reimplement Catalog truth in Aukro. Do not persist bearer tokens. Keep EAN optional and non-blocking. Fail closed when mandatory blockers or quality evidence unavailability remain.

## Agent prompt

Implement the Aukro consumer side for Catalog Goal 25 product quality blockers while keeping Aukro ownership boundaries intact.

## Validation instructions

Run focused offer tests, service build, IPS gates, and `git diff --check`; record results in `docs/12_validation/VAL-TASK-017-catalog-goal25-product-quality-blockers.md`.
