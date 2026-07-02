# Aukro Central Orders Status Read Model Plan

Date: 2026-07-02
Parent plan: `orders-microservice/docs/orchestrator/2026-07-02-order-lifecycle-warehouse-status-rollout-plan.md`

## Objective

Aukro order views must show central Orders lifecycle and forwarding health for every order known to the service.

## Current Evidence

- Aukro UI dashboard exposes orders with `orderId`, `status`, `forwarded`, totals, currency, customer email, and item list.
- `[UNKNOWN: whether every active provider-backed order path always forwards to central Orders.]`

## Workstream

Owner role: Aukro order read-model owner
Status: discovery required, then ready if files are independent

Allowed files:

- Aukro order service/ui files identified during discovery
- `docs/**`
- tests and validation reports

Forbidden files:

- existing dirty validation report unless validation owner intentionally refreshes it
- unrelated marketplace catalog/source work

## Required Work

1. Inspect Aukro order ingestion and central Orders forwarding.
2. Confirm central Orders id mapping.
3. Render lifecycle stage from Orders API or lifecycle events.
4. Show unforwarded/stale orders as actionable.

## Validation

- dashboard order row shows central lifecycle
- missing central id is visible
- Orders API failure is shown as unknown/stale

## AU1 Worker Handoff - 2026-07-02

Role: Aukro order read-model owner.

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation:

- Vision: aukro-service remains a narrow Aukro sales-channel integration and does not become order lifecycle truth.
- Goal Impact: forwarded Aukro dashboard rows prefer central Orders lifecycle/status and preserve unforwarded visibility.
- System: Orders remains lifecycle authority; Aukro stores `aukro_orders.orderId` as the central order id after forwarding.
- Feature: dashboard order read model hydrates local Aukro rows from central Orders by `aukro_orders.orderId`.
- Task: AU1 status read model and order create audit.
- Execution Plan: inspect ingestion/forwarding, add fail-closed read client, render central lifecycle/status when available, show missing/failed read as `unknown/stale`.
- Coding Prompt: implement only in shared Order client, Aukro order/UI files, tests, and docs; do not deploy or push.
- Code: `OrderClientService.getOrderReadModel`, `UiController.hydrateOrdersWithCentralReadModel`, dashboard/public order status fields, and focused tests.
- Validation: run `git diff --check`, Aukro service tests, synthetic orders create smoke, and build when available.

Discovery:

- Aukro create path stores central Orders id in `aukro_orders.orderId` and marks `forwarded=true` after `OrderClientService.createOrder` succeeds.
- Aukro webhook parsing remains tied to the current synthetic/internal shape because real Aukro webhook shape is `[UNKNOWN]`.
- Read-only Orders repo inspection found `GET /api/orders/:id` and lifecycle list endpoints, but the current read role allowlists do not include `internal:aukro-service:service`.

Implementation behavior:

- If `aukro_orders.orderId` is missing, the dashboard response returns `status=unknown`, `lifecycleStage=unknown`, `ordersReadStatus=missing_order_id`, and `stale=true`.
- If Orders read fails or returns no usable data, the dashboard response returns `status=unknown`, `lifecycleStage=unknown`, `ordersReadStatus=unavailable`, and `stale=true`.
- If Orders read succeeds, the dashboard response uses central `status`, `lifecycleStage`, `paymentStatus`, `fulfillmentStatus`, and `deliveryStatus` while retaining `localStatus` separately.

Remaining blockers:

- [MISSING: Orders lifecycle read contract authorized for aukro-service role; client method is implemented fail-closed pending Orders endpoint/role approval.]
- [UNKNOWN: real Aukro webhook payload shape.]
