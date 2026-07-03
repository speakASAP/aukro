# Goal 24 Aukro Order-Affinity Replay Producer Validation

Date: 2026-07-03

## Artifact Validated

Branch `codex/goal24-order-affinity-replay-producer`.

## Commands Run

- `npm --prefix services/aukro-service run test` -> pass.
- `npm --prefix services/aukro-service run build` -> pass.
- `git diff --check` -> pass.

## Evidence

The focused order-service spec now verifies:

- contract `marketplace.order_affinity_candidate.v1`;
- `sourceOwner=aukro-service`, `consumerOwner=marketing-microservice`, `channel=aukro`;
- only multi-Catalog-product orders emit events;
- serialized response omits customer email, delivery address, and raw marketplace order id.

## Sensitive Data

No secrets, customer identifiers, addresses, payment details, provider tokens, or raw marketplace payloads are emitted by the replay event. The event uses a SHA-256 derived reference prefix instead of raw `aukroOrderId`.

## Blockers

- `[MISSING: Marketing parser source allowlist for aukro-service/bazos-service]`
- `[MISSING: runtime deployment and Marketing pod dry-run evidence for Aukro replay endpoint]`

## Recommendation

Merge/deploy after Bazos branch is ready, then run the Marketing dry-run matrix from the pod using runtime internal replay tokens.
