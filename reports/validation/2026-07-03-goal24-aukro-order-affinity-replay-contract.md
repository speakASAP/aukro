# Goal 24 Aukro Order-Affinity Replay Contract Validation

Date: 2026-07-03
Owner role: Goal 24 Aukro replay endpoint worker

## IPS Chain

Vision -> Aukro marketplace purchase history can improve Catalog product-affinity evidence without exposing customer, address, payment, provider, token, credential, or raw marketplace payload data.
Goal Impact -> Marketing recurring order-affinity publish can safely consume Aukro only after Marketing supports the Aukro producer path/source and runtime token mapping.
System -> Aukro owns local Aukro order projection and emits bounded marketplace replay envelopes; Marketing owns aggregation, scheduling, ledger, and Catalog publishing; Catalog owns durable product relations.
Feature -> `GET /internal/aukro/order-affinity/replay-candidates`.
Task -> Verify the existing Aukro replay endpoint against `marketplace.order_affinity_candidate.v1` and record fail-closed blockers from Marketing `origin/main`.
Execution Plan -> Aukro-owned tests/docs only; no Marketing, Catalog, Orders, Kubernetes, secret, migration, or live deployment edits.
Coding Prompt -> Preserve `source=aukro-service`, hash marketplace order references, emit Catalog product item snapshots only, and do not invent Marketing parser/source contracts.
Code -> `services/aukro-service/src/aukro/orders/orders.service.spec.ts` contract assertions.
Validation -> focused Aukro service test, service build, `git diff --check`.
State Update -> Aukro endpoint remains producer-owned and contract-shaped; Marketing current main still needs parser/path/token integration before recurring Aukro publish can run.

## Aukro Endpoint Contract

Aukro exposes the producer-owned protected endpoint:

```text
GET /internal/aukro/order-affinity/replay-candidates
```

The response data envelope is expected to include:

- `sourceOwner=aukro-service`
- `consumerOwner=marketing-microservice`
- `contract=marketplace.order_affinity_candidate.v1`
- `channel=aukro`
- `events[]` with `type=marketplace.order_affinity_candidate.v1`, `eventVersion=1`, `source=aukro-service`, hashed `eventId`, hashed `payload.orderId`, `payload.channel=aukro`, optional `currency`, and bounded `items[]` containing Catalog product IDs and item amounts only.

## Fail-Closed Compatibility Findings

Marketing `origin/main` currently fetches marketplace replay data with a hard-coded Allegro path:

```text
/internal/allegro/order-affinity/replay-candidates
```

Marketing `origin/main` also allowlists only `allegro-service` for `marketplace.order_affinity_candidate.v1`. Aukro must not emit `source=allegro-service` and must not expose raw order/customer/payment/provider payloads to work around that parser.

## Remaining Blockers

- `[MISSING: Marketing marketplace replay URL path selection for aukro-service /internal/aukro/order-affinity/replay-candidates]`
- `[MISSING: Marketing marketplace affinity source allowlist entry for aukro-service]`
- `[MISSING: Marketing runtime token mapping for Aukro protected replay endpoint]`
- `[MISSING: runtime deployment and Marketing pod dry-run evidence for Aukro replay endpoint]`


## Validation Evidence

- Focused orders spec: `cd services/aukro-service && npx ts-node --skip-ignore --compiler-options ... src/aukro/orders/orders.service.spec.ts` -> pass.
- Service build: `npm --prefix services/aukro-service run build` -> pass.
- Whitespace check: `git diff --check` -> pass.
- Service test script: `npm --prefix services/aukro-service run test` -> pass.

## Scope Boundaries

No Marketing, Catalog, Orders, Kubernetes manifests, secrets, migrations, runtime data, or unrelated dirty work were edited.
