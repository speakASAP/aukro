# Goal 24 Aukro Order-Affinity Replay Producer

Date: 2026-07-03
Owner role: Goal 24 worker A

## IPS Chain

Vision -> Aukro marketplace purchase history can improve related-product evidence without exposing customer, address, payment, provider, token, or raw order payload data.
Goal Impact -> Marketing dry-run can call an Aukro-owned protected replay producer instead of receiving HTTP 404.
System -> Aukro owns local order projection and only emits bounded marketplace replay envelopes; Marketing remains aggregation owner; Catalog remains product relation owner.
Feature -> `GET /internal/aukro/order-affinity/replay-candidates`.
Task -> Add protected, bounded, aggregate-safe replay candidates from persisted Aukro order `rawData` when at least two distinct Catalog products are present.
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

## Blockers

- `[MISSING: Marketing parser source allowlist for aukro-service/bazos-service]`
- `[MISSING: runtime deployment and Marketing pod dry-run evidence for Aukro replay endpoint]`
