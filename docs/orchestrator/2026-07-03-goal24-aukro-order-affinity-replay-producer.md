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

## 2026-07-03 Contract Path Runtime Follow-up

Vision -> Aukro marketplace purchase history can improve related-product evidence through a protected replay contract without exposing customer, contact, address, payment, provider, token, or raw order payload data.
Goal Impact -> Marketing recurring Aukro affinity replay can call the already-agreed contract path instead of failing with HTTP 404.
System -> Aukro owns replay route compatibility and local order projection; Marketing owns aggregation and Catalog publish behavior; Catalog remains product relation owner.
Feature -> `GET /internal/aukro/order-affinity/replay-candidates` is reachable without the service-global `/aukro` prefix for internal replay consumers.
Task -> Exclude the internal order-affinity replay path from the Aukro global prefix and keep the previous prefixed variant unavailable.
Execution Plan -> Aukro-owned startup/test/docs only; no Marketing source edits, no Kubernetes manifest edits, no migrations, no secrets, no raw order/customer evidence, and no live Catalog publish.
Coding Prompt -> Preserve the existing controller/auth/service contract and only make the route externally compatible with Marketing marketplace replay path selection.
Code -> `services/aukro-service/src/main.ts`, `services/aukro-service/src/main.prefix.spec.ts`, `services/aukro-service/package.json`.
Validation -> `npm run build`; `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/main.prefix.spec.ts`; `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/aukro/orders/orders.service.spec.ts`; `npm test`; `git diff --check`; deploy image `localhost:5000/aukro-service:68784d7`; Marketing pod probe returned `status=200 success=true events=2 contract=marketplace.order_affinity_candidate.v1` for `/internal/aukro/order-affinity/replay-candidates?limit=10`.
State Update -> Aukro contract path blocker is resolved in commit `68784d7`; Marketing runtime image was refreshed to existing source commit `d569c54` so its deployed CLI uses `/internal/aukro/order-affinity/replay-candidates`.

### Owner-Approved Validation Fixture

The owner approved creating a non-sensitive repeatable Aukro validation order. A single local projection row was upserted with `aukroOrderId=owner-approved-order-affinity-20260703-001`, `status=paid`, no customer email, no customer phone, no provider payload, no payment payload, and two explicit synthetic Catalog product IDs. The earlier synthetic fixture remains in place for repeatable validation.

Sanitized aggregate evidence excluding the earlier `goal24-order-affinity-synthetic-v1` fixture:

| non_synthetic_orders | eligible_status_orders | multi_item_orders | eligible_multi_item_orders |
|---:|---:|---:|---:|
| 2 | 1 | 1 | 1 |

Marketing dry-run evidence after Aukro route fix and Marketing runtime refresh:

| Run ID | Mode | Input records | Accepted created events | Aggregate pairs | Total pair evidence | Ledger status |
|---|---|---:|---:|---:|---:|---|
| `owner-approved-aukro-affinity-20260703-001` | dry-run | 2 | 2 | 2 | 4 | recorded |

### Remaining Activation Boundary

The recurring Aukro CronJob remains suspended and still carries `--publish`. This worker did not run live Catalog publish for the owner-approved validation fixture. Unsuspending recurring publish requires explicit owner acceptance that the approved validation fixture may contribute to Catalog relation evidence, or replacement with live non-sensitive marketplace-derived evidence.
