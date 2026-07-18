# Aukro Business Health Channel Readback Handoff

## Intent Preservation

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: `docs/01_vision/VISION.md`
- Goal Impact: `[MISSING: business-health Aukro channel readback goal impact]`
- System: `docs/04_systems/SYS-001-aukro-service.md`
- Feature: `docs/10_features/FEAT-008-observability-reconciliation.md`
- Task: `[MISSING: Aukro business-health channel readback task]`
- Execution Plan: this handoff
- Coding Prompt: Codex prompt 2026-07-06 Aukro service-owned business-health evidence envelope
- Code:
  - `services/aukro-service/src/business-health/business-health.controller.ts`
  - `services/aukro-service/src/business-health/business-health.service.ts`
  - `services/aukro-service/src/business-health/business-health.types.ts`
  - `services/aukro-service/src/business-health/business-health.module.ts`
- Validation:
  - `npm run verify:business-health-aukro-channel-contract`
  - `npm --prefix services/aukro-service run build`
  - `git diff --check`

## Contract

- Endpoint: `GET /aukro/business-health/channel-readback`
- Contract id: `aukro.channel_readback_business_health.v1`
- Business process contract: `stock-order-marketplace-business-health.v1`
- Owner: `aukro`
- Mode: source-only read-only evidence envelope

## Business Boundary

The envelope states the channel invariant for Aukro marketplace availability convergence:

- Aukro must not publish or keep sellable quantity higher than Warehouse/Catalog availability.
- Aukro must not keep a listing sellable when Catalog marks the product unavailable, deleted, archived, inactive, or not sellable.
- External marketplace readback is required before runtime `pass`.
- External marketplace mutation remains gated by provider policy, account readiness, rate-limit evidence, and human/operator approval.

## Safety Boundary

- No live Aukro/provider calls.
- No offer/listing create, update, delete, or de-list call.
- No Orders, Warehouse, Catalog, payment, or supplier service call.
- No DB query or mutation.
- No secret or environment change.
- No deploy.

## Source References

- `services/aukro-service/src/aukro/offers/offer-availability-reconciliation.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/executor/executor.service.ts`
- `services/aukro-service/src/aukro/public-api/public-api.client.ts`
- `docs/16_operations/AUKRO_PLATFORM_RULES.md`
- `docs/16_operations/INTEGRATIONS.md`
- `docs/10_features/FEAT-008-observability-reconciliation.md`

## Preserved Blockers

- `[MISSING: approved live Aukro readback packet]`
- `[MISSING: target product/listing/account for Aukro channel readback proof]`
- `[MISSING: external Aukro provider policy for live readback cadence, rate limits, and account scope]`
- `[MISSING: approved reconciliation rule that maps Warehouse/Catalog availability to Aukro sellable quantity without external mutation side effects]`

## Handoff To BPCP

`business-process-control-plane` can now consume this envelope as the first marketplace/channel readback plane. Until a live runtime packet exists, the BPCP plane should remain `warn` or `blocked`, not `pass`.

Suggested BPCP sourceRefs:

- `aukro/services/aukro-service/src/business-health/business-health.controller.ts`
- `aukro/services/aukro-service/src/business-health/business-health.service.ts`
- `aukro/docs/orchestrator/2026-07-06-aukro-business-health-handoff.md`
