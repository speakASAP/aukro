# W5 Aukro Orders Lifecycle Cabinet Proof

Date: 2026-07-05
Agent: W5 Aukro and Heureka cabinet proof
Repo: /home/ssf/Documents/Github/aukro
Scope: prove whether Aukro lifecycle views and admin stats consume central Orders lifecycle, or record exact gaps.

## Intent Preservation Chain

Vision -> Every customer/admin cabinet reflects canonical Orders lifecycle without moving lifecycle truth into marketplace services.
Goal Impact -> Aukro users/admins can see central lifecycle state and operational stale/missing states without raw customer, payment, token, or provider payload exposure.
System -> Orders owns central order lifecycle. Aukro owns channel UI/order client rendering and may only read central lifecycle state.
Feature -> Aukro dashboard order lifecycle cards and admin service statistics consume central Orders read-model fields.
Task -> Run existing lifecycle verifier, inspect UI/order-client source, perform safe runtime status/env-presence checks, and record exact remaining blockers.
Execution Plan -> Read repo handoff and master plan, run `verify:orders-lifecycle-ui`, check source call sites for `OrderClientService.getOrderReadModel`, check protected endpoints fail closed without a bearer/session, and avoid deploy/provider/customer data output.
Coding Prompt -> Allowed files: UI/order client/verifier docs/reports. Forbidden: broad contract/schema edits, provider writes, deploy, raw customer/payment/token output.
Code -> No source code changed by this W5 proof pass.
Validation -> See command evidence below.

## Verdict

Source proof: PASS. Aukro dashboard and admin stats consume central Orders lifecycle read-model fields through `OrderClientService.getOrderReadModel(orderId)` when local Aukro rows contain a central `orderId`.

Runtime proof: PARTIAL, auth-gated. The deployed pod has an Orders URL and internal token source by presence-only evidence, public service routes are healthy, and protected dashboard/admin APIs fail closed without a session. No approved customer/admin bearer/session packet was available in this lane, so live row-level lifecycle rendering was not queried.

## Source Evidence

- `services/aukro-service/src/ui/ui.controller.ts` imports `OrderClientService` and injects it into the UI controller.
- `hydrateOrdersWithCentralReadModel()` reads `order.orderId`, calls `this.orderClient.getOrderReadModel(centralOrderId)`, and records `centralOrderRead.status` as `available`, `missing_order_id`, or `unavailable`.
- `publicOrder()` renders central `status`, `lifecycleStage`, `paymentStatus`, `fulfillmentStatus`, and `deliveryStatus`, with stale/unknown fallback for unavailable central reads.
- Dashboard summary counts `ordersWithCentralStatus` and `staleOrders` from central read status.
- `adminOrderStats()` aggregates `byOrdersReadStatus`, `byOrderStatus`, `byLifecycleStage`, `byPaymentStatus`, `byFulfillmentStatus`, and `byDeliveryStatus` from central Orders fields when available.
- UI refresh coverage exists through 30s polling, `visibilitychange`, and manual `Obnovit Orders` refresh.

## Command Evidence

```bash
ssh alfares 'cd /home/ssf/Documents/Github/aukro && npm run verify:orders-lifecycle-ui'
```

Result:

```json
{"success":true,"lifecycleStagesCovered":13,"refreshCoverage":"polling plus manual Orders refresh button","specCoverage":true}
```

Protected-route status-only smoke, no bearer/session:

```bash
ssh alfares 'for url in https://aukro.alfares.cz/ https://aukro.alfares.cz/health https://aukro.alfares.cz/aukro/ui/dashboard https://aukro.alfares.cz/aukro/ui/admin/services; do printf "%s " "$url"; curl -sk -o /dev/null -w "%{http_code}\n" "$url"; done'
```

Result:

```text
https://aukro.alfares.cz/ 200
https://aukro.alfares.cz/health 200
https://aukro.alfares.cz/aukro/ui/dashboard 403
https://aukro.alfares.cz/aukro/ui/admin/services 403
```

Runtime env presence was checked inside `deployment/aukro-service` with values redacted. Evidence: `ORDER_SERVICE_URL` present, `JWT_TOKEN` present, `AUKRO_INTERNAL_SERVICE_TOKEN` present; no raw token values printed.

## Exact Gaps

- [MISSING: approved live Aukro customer/admin bearer or browser session packet for row-level dashboard/admin smoke]
- [MISSING: live proof that at least one Aukro row has a central Orders `orderId` linked to a current non-stale lifecycle stage]
- [UNKNOWN: whether current production data contains Aukro orders with central lifecycle status available; protected API was not queried without approved session]

## Sensitive Data Boundary

This pass did not print tokens, bearer values, customer identifiers, payment data, delivery addresses, raw order rows, provider tracking payloads, or database rows. Runtime evidence is limited to HTTP status codes and env presence/length.
