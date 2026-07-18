---
id: VAL-AU2-orders-lifecycle-cabinet-admin-stats
status: pass-with-blocked-smoke
target: docs/10_features/FEAT-003-order-forwarding.md
owner: Engineering
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: implementation-validated-smoke-token-blocked
upstream:
  - docs/10_features/FEAT-003-order-forwarding.md
  - docs/orchestrator/2026-07-02-central-orders-status-read-model-plan.md
downstream: []
related_adrs: []
---
# Validation Report: AU2 Orders Lifecycle Cabinet And Admin Stats

Validation id: VAL-AU2-orders-lifecycle-cabinet-admin-stats
Target: FEAT-003 and AU2 central Orders status read-model plan
Date: 2026-07-02
Validator: AI worker

## Summary

Validated the Aukro customer cabinet order lifecycle read model and added admin-only aggregate order/delivery statistics. Customer order rows continue to hydrate from central Orders status when a stored central order id exists, and admin output exposes counts only.

## Upstream goal

FEAT-003 requires Aukro orders to enter the internal order-processing flow reliably without moving order lifecycle ownership into aukro-service. The AU2 plan extends this by making central Orders lifecycle/status visible in the customer cabinet and as aggregate admin statistics while preserving privacy boundaries.

## Criteria checked

| Criterion | Result | Evidence |
| --- | --- | --- |
| Customer cabinet renders central lifecycle status | Pass | Focused UI spec verifies central `status`, `lifecycleStage`, `paymentStatus`, `fulfillmentStatus`, and `deliveryStatus` from `OrderClientService.getOrderReadModel`. |
| Missing central order id remains actionable | Pass | Focused UI spec verifies `ordersReadStatus=missing_order_id`, `lifecycleStage=unknown`, and `stale=true`. |
| Orders read failure remains fail-closed | Pass | Focused UI spec verifies `ordersReadStatus=unavailable`, `lifecycleStage=unknown`, and `stale=true`. |
| Admin dashboard exposes order/delivery statistics | Pass | `UiController.adminServices` returns aggregate counts by read status, order status, lifecycle, payment, fulfillment, and delivery status. |
| Admin stats preserve privacy | Pass | Focused UI spec verifies the admin response does not contain the synthetic buyer email from the source fixture. |
| Source build remains valid | Pass | `npm --prefix services/aukro-service run build` passed. |
| Synthetic Orders create smoke | Blocked | The smoke token environment value is absent in this shell; source/build validation was used instead. |

## Gate evidence

| Command | Result |
| --- | --- |
| `services/aukro-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/aukro-service/src/ui/ui.controller.spec.ts` | Pass |
| `npm --prefix services/aukro-service run test` | Pass |
| `npm --prefix services/aukro-service run smoke:orders-create` | Blocked: `[MISSING: ORDER_SYNTHETIC_SMOKE_TOKEN]` |
| `npm --prefix services/aukro-service run build` | Pass |
| `git diff --check` | Pass |
| `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues` | Pass after validation-report template and graph update |
| `python3 scripts/pre_coding_gate.py --root .` | Pass |
| `python3 scripts/deployment_readiness_gate.py --root . --target VAL-AU2-orders-lifecycle-cabinet-admin-stats` | Pass after validation-report template and graph update |

## Invariant evidence

AUKRO-INV-001 is preserved through this validation report, the AU2 plan, and graph linkage. AUKRO-INV-003 is preserved because Orders remains lifecycle authority and Aukro only reads central status. AUKRO-INV-004 and AUKRO-INV-005 are preserved because no secrets, tokens, raw production rows, customer identifiers, or credential values were added to docs/tests/output. AUKRO-INV-006 is preserved through the command evidence above.

## Sensitive-data scan evidence

Validation used synthetic fixture data only. The admin stats response was asserted not to include the synthetic buyer email. No production customer/order rows were queried, no live logs were read, no secrets were printed, and no token values were used in reports.

## Replay and determinism evidence

The focused UI spec is deterministic. It uses fixed local order fixtures, a fake `OrderClientService.getOrderReadModel`, and a fake Prisma `aukroOrder.findMany`. The admin aggregation can be replayed without external service calls or cleanup.

## Issues found

- The dedicated synthetic smoke command did not run because the smoke token environment value is absent in this shell.
- Central Orders read authorization for the `aukro-service` role still needs owner/service-contract confirmation before runtime status hydration can be considered fully enabled.
- The real Aukro webhook payload shape is still not verified in this repository; current parsing remains tied to the synthetic/internal shape.
- No current-task source/build/test blocker remains.

## Remaining blockers

- [MISSING: ORDER_SYNTHETIC_SMOKE_TOKEN]
- [MISSING: Orders lifecycle read contract authorized for aukro-service role; client method is implemented fail-closed pending Orders endpoint/role approval.]
- [UNKNOWN: real Aukro webhook payload shape.]

## Recommendation

Accept the source change with follow-up for the missing smoke token and central Orders read authorization. Do not deploy from this worker branch; deployment was explicitly out of scope.

## Traceability confirmation

Vision -> `docs/01_vision/VISION.md` -> System -> `docs/04_systems/SYS-001-aukro-service.md` -> Feature -> `docs/10_features/FEAT-003-order-forwarding.md` -> AU2 Execution Plan -> `docs/orchestrator/2026-07-02-central-orders-status-read-model-plan.md` -> Code -> `services/aukro-service/src/ui/ui.controller.ts` -> Validation -> `docs/12_validation/VAL-AU2-orders-lifecycle-cabinet-admin-stats.md`.
