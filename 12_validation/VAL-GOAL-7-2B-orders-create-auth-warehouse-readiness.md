---
id: VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness
status: reviewed
target: Orders Goal 7.2B Aukro create-order auth and warehouseId readiness
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: runtime-live-smoke-complete
upstream:
  - 01_vision/VISION.md
  - SYSTEM.md
  - 11_tasks/TASK-004-service-integration-clients.md
  - 21_execution_plans/EP-TASK-004-service-integration-clients.md
downstream: []
related_adrs: []
---
# Validation Report: Orders Goal 7.2B Aukro Create-Order Readiness

Validation id: VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness
Target: Aukro-side create-order auth headers and Warehouse-owned `warehouseId` forwarding
Date: 2026-07-01
Validator: AI agent

## Summary

Aukro source and deployment contain the Orders create-order credential gate and Warehouse-owned `warehouseId` forwarding logic. On 2026-07-01 Auth-owned Warehouse service principals were created for Aukro and Orders, granted `internal:warehouse-microservice:admin`, written to Vault-backed runtime properties without printing token values, synced through ExternalSecret, and loaded by restarted Aukro and Orders pods. Aukro and Orders `WAREHOUSE_SERVICE_TOKEN` values now validate through Auth and are accepted by Warehouse. A controlled synthetic live create smoke created one Aukro local order, created the canonical Orders reference, reserved Warehouse stock once, replayed the local webhook without duplicate local rows, and replayed the canonical Orders create idempotently without a second reservation. The deployed Aukro image remains localhost registry tag `91f80cd`; this was a secret/config reload and runtime smoke, not a source image deploy.

No token values, decoded JWTs, raw orders, customer payloads, database rows, or payment data were printed or recorded. Runtime env validation was by name and presence only.

## Upstream goal

Goal 7.2B validates that Aukro can call Orders create-order through the runtime credential gate and forward order line items with Warehouse-owned warehouse identifiers instead of inventing local stock ownership. The closest reviewed repository anchor is `TASK-004-service-integration-clients`; this external coordinator lane does not currently have a dedicated repository-local Goal 7.2B task or execution plan.

## Criteria checked

| Criterion | Result | Evidence |
|---|---|---|
| Orders create payload carries the expected contract version | Pass | Source and compiled runtime contain `orders.create.v1`. |
| Aukro sends Orders internal auth headers | Pass | Source and compiled runtime contain `AUKRO_INTERNAL_SERVICE_TOKEN`, `x-internal-service-token`, and `x-service-name`. |
| `channelAccountId` is stable | Pass | Source normalizes missing account id to `default`; order service forwards `order.accountId`. |
| Product id is canonical Catalog product id | Pass | Order service resolves explicit catalog fields or looks up the mapped Aukro offer `productId`. |
| `warehouseId` remains Warehouse-owned | Pass | Order service calls Warehouse stock lookup and rejects missing, invalid, or unavailable warehouse rows. |
| Required runtime env names are present | Pass | Live pod has `JWT_TOKEN`, `AUKRO_INTERNAL_SERVICE_TOKEN`, `ORDER_SERVICE_URL`, `WAREHOUSE_SERVICE_URL`, and `WAREHOUSE_SERVICE_TOKEN` by presence check only. |
| Runtime deployment contains the source gates | Pass | Live compiled JS contains Orders headers and Warehouse guard strings. |
| Live create-order smoke | Pass | Synthetic external order `synthetic-aukro-live-smoke-1782898959721` created a local Aukro order, stored a central Orders reference, observed Warehouse reservation, replayed locally with count 1, and replayed directly to Orders without a second reservation. |

## IPS Chain

| Chain node | Evidence |
|---|---|
| Vision | `01_vision/VISION.md` says Aukro forwards received orders to the order domain and must not own order lifecycle truth. |
| Goal Impact | Goal 7.2B preserves the Orders ownership boundary by authenticating Aukro-to-Orders create calls and preserving Warehouse ownership of `warehouseId`. |
| System | `SYSTEM.md` documents `orders-microservice` and `warehouse-microservice` as integrations; K8s manifests now expose the required env names. |
| Feature | Service integration clients support Orders and Warehouse calls through shared clients. |
| Task | `TASK-004-service-integration-clients` is the closest repo task anchor for this external coordinator lane. |
| Execution Plan | `EP-TASK-004-service-integration-clients` is the closest reviewed plan for this external coordinator lane. |
| Coding Prompt | Delegated lane: "Orders Goal 7.2B Aukro create-order auth + warehouseId readiness." |
| Code | Source inspection confirms create-order headers, `orders.create.v1`, stable `channelAccountId`, canonical Catalog `productId`, and Warehouse-owned `warehouseId` forwarding. |
| Validation | Focused specs/builds/gates passed; deploy completed to `91f80cd`; runtime compiled strings, health checks, credential preflights, live create smoke, and idempotency replay passed. |

## Git And Commit Classification

The remote main branch already matched `HEAD` at validation time; the coordinator's earlier "ahead 2" snapshot had already reached the remote main branch.

Relevant commits:

- `faf2d79 chore: wire aukro orders service token alias`: required for runtime readiness. Adds `AUKRO_INTERNAL_SERVICE_TOKEN` env-name documentation and Deployment/ExternalSecret wiring.
- `1c2c4c0 fix: keep aukro external secret synced`: required for runtime readiness. Keeps the ExternalSecret synced while preserving the Orders token alias from the Vault prod aukro-service `JWT_TOKEN` property.
- `b867c33 docs: clear resolved aukro validation debt`: not required for Orders create-order readiness by itself.
- `91f80cd fix: import auth module for aukro executor`: required for successful deployment of the current image; without it, the `b867c33` image crashed during startup with `JwtAuthGuard` unable to resolve `AuthService` in `AukroExecutorModule`.

## Source Evidence

`shared/clients/order-client.service.ts`:

- Adds `contractVersion: 'orders.create.v1'`.
- Normalizes missing `channelAccountId` to `default`.
- Requires `AUKRO_INTERNAL_SERVICE_TOKEN`.
- Sends `x-internal-service-token` and `x-service-name: aukro-service`.
- Rejects missing item `warehouseId` with `ORDER_FORWARDING_WAREHOUSE_ID_MISSING`.

`services/aukro-service/src/aukro/orders/orders.service.ts`:

- Forwards `externalOrderId`, `channel: 'aukro'`, `channelAccountId`, totals, currency, and built items.
- Resolves canonical Catalog `productId` from explicit catalog fields or Aukro offer/listing mapping.
- Resolves `warehouseId` by calling `WarehouseClientService.getStockByProduct(productId)`.
- Rejects invalid or unavailable Warehouse rows instead of inventing a warehouse.

`shared/clients/warehouse-client.service.ts`:

- Uses `WAREHOUSE_SERVICE_TOKEN` first, then `JWT_TOKEN`, then `SERVICE_TOKEN`.
- Sends Warehouse calls with an `Authorization: Bearer ...` header when a token env is present.

K8s manifests:

- `k8s/configmap.yaml` defines `ORDER_SERVICE_URL` and `WAREHOUSE_SERVICE_URL`.
- `k8s/external-secret.yaml` maps `JWT_TOKEN`, `AUKRO_INTERNAL_SERVICE_TOKEN`, and maps `WAREHOUSE_SERVICE_TOKEN` from Auth-owned `AUKRO_WAREHOUSE_SERVICE_TOKEN`.
- `k8s/deployment.yaml` injects `JWT_TOKEN`, `AUKRO_INTERNAL_SERVICE_TOKEN`, and `WAREHOUSE_SERVICE_TOKEN`.

## Runtime Evidence

Deployment after validation:

- `kubectl -n statex-apps get deployment aukro-service -o wide`: image localhost registry Aukro tag `91f80cd`, ready one of one.
- `kubectl -n statex-apps get pods -l app=aukro-service -o wide`: pod `aukro-service-fc687f866-lsrp5` ready one of one, status `Running`, restarts `0` after credential reload.

Env-name presence check inside the live pod:

```text
JWT_TOKEN=present
AUKRO_INTERNAL_SERVICE_TOKEN=present
ORDER_SERVICE_URL=present
WAREHOUSE_SERVICE_URL=present
WAREHOUSE_SERVICE_TOKEN=present
SERVICE_TOKEN=missing
```

Compiled runtime checks inside the live pod found:

- `orders.create.v1`.
- `AUKRO_INTERNAL_SERVICE_TOKEN`.
- `x-internal-service-token`.
- `x-service-name`.
- `ORDER_FORWARDING_WAREHOUSE_ID_MISSING`.
- `resolveWarehouseId`.
- `getStockByProduct`.
- Warehouse `WAREHOUSE_SERVICE_TOKEN` / `JWT_TOKEN` Authorization fallback.

Health checks:

- In-pod Node HTTP check to `http://127.0.0.1:3700/health`: status `200`.
- Public `https://aukro.alfares.cz/health`: returned status payload for `aukro-service`.

Live pre-smoke Warehouse credential checks after owner approval:

- Read-only candidate discovery found a Catalog-valid product with a Warehouse row available for quantity one; product and warehouse identifiers are intentionally omitted from this report.
- Original checks showed Aukro pod calls to Warehouse stock API using `WAREHOUSE_SERVICE_TOKEN`, `JWT_TOKEN`, and `AUKRO_INTERNAL_SERVICE_TOKEN` each returned HTTP 401.
- On 2026-07-01 an Auth-owned Aukro Warehouse service principal was created for `aukro-service`, assigned `internal:warehouse-microservice:admin`, and the issued token was written to Vault without printing it.
- `k8s/external-secret.yaml` now maps Aukro `WAREHOUSE_SERVICE_TOKEN` from the Auth-owned `AUKRO_WAREHOUSE_SERVICE_TOKEN` Vault property; Kubernetes server dry-run and apply passed, ExternalSecret refreshed with `Ready=True`, and the Aukro Deployment was restarted.
- Post-restart Warehouse receiver comparison from the Aukro pod returned `no_auth=401`, `bogus_bearer=401`, and `WAREHOUSE_SERVICE_TOKEN=200` for a synthetic product stock lookup.
- Post-alignment Auth validate from the Aukro pod returned HTTP 201 with `valid=true`, `serviceName=aukro-service`, and role `internal:warehouse-microservice:admin` without printing the token.
- Only env names, HTTP statuses, boolean validity, and role/identity shape were inspected; token values were not printed, decoded, copied, or persisted.

## Validation Commands

- `git diff --check`: Pass.
- `npm --prefix shared test -- order-client.service.spec.ts`: Pass.
- `npm --prefix services/aukro-service test -- orders.service.spec.ts`: Pass.
- `npm --prefix shared run build`: Pass.
- `npm --prefix services/aukro-service run build`: Pass.
- `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`: Pass, score 100/100, findings 0.
- `python3 scripts/pre_coding_gate.py --root .`: Pass.
- `python3 scripts/deployment_readiness_gate.py --root .`: Pass.
- `npm --prefix services/aukro-service test -- executor.module.spec.ts`: Pass after `91f80cd`.
- Auth service-principal dry-runs for `aukro-service` and `orders-microservice`: Pass, no database mutation and no token emitted.
- Auth service-principal apply for `aukro-service` and `orders-microservice`: Pass, database mutation and token issuance approved, token values written only to 0600 pod files and not printed.
- Vault patches for `AUKRO_WAREHOUSE_SERVICE_TOKEN` and Orders `WAREHOUSE_SERVICE_TOKEN`: Pass, values supplied through stdin/file pipes and not printed.
- ExternalSecret force refresh and Aukro/Orders rollout restarts: Pass.
- Aukro credential preflight after restart: Auth validate HTTP 201 `valid=true`, Warehouse stock lookup HTTP 200.
- Orders credential preflight after restart: Auth validate HTTP 201 `valid=true`, Warehouse stock lookup HTTP 200.
- Live synthetic Aukro create smoke: Pass, `synthetic-aukro-live-smoke-1782898959721`, local forwarded true, central reference stored, Warehouse reservation observed.
- Direct Orders idempotency replay: Pass, HTTP 201 success, Warehouse reservation unchanged.

## Deployment Evidence

First deploy attempt moved the Deployment from stale image `5fc56aa` to `b867c33` and failed because the new image crashed on `JwtAuthGuard` dependency resolution in `AukroExecutorModule`.

The concurrent fix commit `91f80cd` imported `AuthModule` into `AukroExecutorModule` and added executor module coverage. A second deploy built and pushed localhost registry Aukro tag `91f80cd`. Kubernetes image pulling took about 3m44s, then rollout completed successfully.

## Smoke Decision

Owner approved a controlled live create-order smoke after this validation report was first written. The original smoke was stopped before `POST /aukro/orders/webhook` because the Aukro Warehouse lookup credential failed Auth/Warehouse validation. That credential blocker is now resolved for both Aukro lookup and Orders reservation.

The live smoke used a synthetic external order id, synthetic item title, no customer fields, no payment fields, a Catalog-valid product id, and a Warehouse-owned warehouse id. It invoked deployed Aukro `OrdersService.handleWebhook` inside the running pod to exercise the production mapping, Warehouse lookup client, Orders client, central Orders create, and Warehouse reservation handoff without requiring a browser user token.

Result: local Aukro order was created and marked forwarded, a central Orders reference was stored, Warehouse stock moved from available 3/reserved 0 to available 2/reserved 1, local webhook replay kept exactly one local order row, and direct canonical Orders replay returned success while Warehouse remained available 2/reserved 1. No token values, customer data, provider payloads, or payment data were printed.

## Deviations

- RAG lookup was required by repo instructions. The documented `curl` command failed because the Aukro container does not include `curl`; the lookup was retried through the container Node runtime and returned HTTP 200 with no context or sources.
- The repo was clean at start, but the remote main branch advanced during the lane from `1c2c4c0` to `b867c33` and then `91f80cd`. No teammate changes were reset or overwritten.
- The first deploy command exited non-zero due to the `b867c33` startup crash. The second deploy from `91f80cd` completed successfully.

## Gate evidence

- Focused Orders and Warehouse readiness tests/builds passed.
- IPS strict doc audit initially failed on this report shape; the report was revised to match `18_templates/VALIDATION_REPORT_TEMPLATE.md`.
- Final strict doc audit result is expected to be recorded by the committing agent after graph/report updates.

## Invariant evidence

- AUKRO-INV-001 traceability is preserved through this validation report and graph edge.
- AUKRO-INV-003 is preserved because Aukro forwards to Orders and uses Warehouse-owned `warehouseId`; it does not become the order or stock source of truth.
- AUKRO-INV-004 and AUKRO-INV-005 are preserved because no secret values were printed and only env names/Vault property names were recorded.
- AUKRO-INV-006 is preserved through this validation evidence.

## Sensitive-data scan evidence

Validation used synthetic test fixtures, source inspection, env-name presence checks, runtime string checks, and health responses only. No token values, raw customer/order payloads, DB rows, production order rows, payment data, or decoded JWTs were printed.

## Replay and determinism evidence

Focused specs are deterministic and mocked. The live smoke used a synthetic persistent order id and is replayable only for idempotency, not as a new create. The direct Orders replay returned success without changing Warehouse reservation totals, proving the canonical idempotency path did not duplicate the reservation.

## Issues found

- Runtime credential blocker is resolved: Aukro and Orders Warehouse service credentials validate through Auth and are accepted by Warehouse.
- Owner-approved live Aukro-to-Orders create smoke passed with synthetic data and no duplicate reservation on replay.
- This external coordinator lane does not currently have a dedicated repository-local Goal 7.2B task or execution plan; `TASK-004` and `EP-TASK-004` are the closest approved traceability anchors.
- First deploy to `b867c33` failed on an executor AuthModule dependency issue; `91f80cd` fixed it and deployed successfully.

## Remaining MISSING markers

- `[MISSING: repository-local task document for Orders Goal 7.2B]`
- `[MISSING: repository-local execution plan for Orders Goal 7.2B]`

## Recommendation

Accept Aukro Orders Goal 7.2B runtime readiness for canonical Orders create. The completed live smoke used synthetic persisted data; no cleanup was run in this lane. Future live smokes should use a documented reusable fixture and explicit cleanup/expiry policy if stock restoration must be immediate.

## Traceability confirmation

The validated state remains aligned with the approved Aukro vision: Aukro safely receives and forwards marketplace orders to the order domain, keeps Warehouse ownership of stock location, and keeps credentials in Vault/K8s secret management.
