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
