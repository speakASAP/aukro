# Goal 24 Aukro Order-Affinity Replay Producer

Date: 2026-07-03
Owner role: Goal 24 worker A

## IPS Chain

Vision -> Aukro marketplace purchase history can improve related-product evidence without exposing customer, address, payment, provider, token, or raw order payload data.
Goal Impact -> Marketing dry-run can call an Aukro-owned protected replay producer instead of receiving HTTP 404.
System -> Aukro owns local order projection and only emits bounded marketplace replay envelopes; Marketing remains aggregation owner; Catalog remains product relation owner.
Feature -> `GET /internal/aukro/order-affinity/replay-candidates`.
Task -> Add protected, bounded, aggregate-safe replay candidates from persisted Aukro order `rawData` when the local order status is paid/processable and at least two distinct Catalog products are present.
Execution Plan -> Source/test/docs only; no live mutation, no marketplace publication, no DB migration, no Catalog/Marketing edit.
Coding Prompt -> Match Allegro replay contract shape, hash marketplace order refs, return Catalog product item snapshots only, and omit customer/contact/address/payment/provider/token/raw payload fields.
Code -> Orders controller/module/service/spec.
Validation -> Focused service test, service build, `git diff --check`; runtime deploy not performed in this worker turn.
State Update -> Producer source is implemented on branch `codex/goal24-order-affinity-replay-producer`.

## Parallel Execution

| Workstream | Status | Owner | Scope | Dependencies | Validation | Merge Order |
|---|---|---|---|---|---|---|
| Aukro producer | ready for integration | Aukro worker | Protected replay endpoint and tests | Marketing token/source mapping | service test/build/diff check | Before Marketing runtime matrix rerun |
| Bazos producer | ready for integration | Bazos worker | Fail-closed endpoint and tests | Persisted Bazos item replay source missing | service spec/build/diff check | Before Marketing runtime matrix rerun |
| Marketing integration | dependency-gated | Integration owner | Parser/source allowlist and token mapping | Aukro/Bazos branches merged/deployed | Marketing dry-run matrix | After channel deploys |

## Aukro Eligibility Mapping

Aukro replay candidates are fail-closed to local order statuses normalized to lowercase with spaces/hyphens converted to underscores. Eligible statuses are `paid`, `payment_completed`, `ready_for_processing`, `processing`, `shipped`, `delivered`, and `completed`. `pending`, `new`, `unpaid`, `cancelled`, `canceled`, `refunded`, unknown, blank, or unmapped statuses are excluded even if the order has two Catalog products.

An order must still have at least two distinct explicitly mapped Catalog product IDs in the local item snapshot after excluding unmapped items. The response emits only hashed replay references, `channel=aukro`, currency, and item `productId`/`sku`/quantity/amount fields; it does not emit buyer, address, payment, provider, token, credential, raw marketplace, or raw local order identifiers.

## Blockers

- `[MISSING: Marketing marketplace replay URL path selection for aukro-service /internal/aukro/order-affinity/replay-candidates]`
- `[MISSING: Marketing marketplace affinity source allowlist entry for aukro-service]`
- `[MISSING: Marketing runtime token mapping for Aukro protected replay endpoint]`
- `[MISSING: runtime deployment and Marketing pod dry-run evidence for Aukro replay endpoint]`

## 2026-07-03 Compatibility Follow-up

Aukro source now has focused assertions for the `marketplace.order_affinity_candidate.v1` envelope emitted by `/internal/aukro/order-affinity/replay-candidates`, including fail-closed exclusion of a pending multi-product order. Marketing `origin/main` still hard-codes the Allegro replay path and only allowlists `allegro-service`, so Aukro remains fail-closed until Marketing integrates the Aukro path/source and runtime token mapping.
