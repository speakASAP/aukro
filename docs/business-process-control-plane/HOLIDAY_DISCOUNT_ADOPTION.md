# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-02
Service: `aukro`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Channel/storefront consumer for BPCP experience slots where Aukro customer-facing flows exist.

## Responsibilities

- Render approved slots only when the current channel supports them.
- Avoid changing Aukro marketplace protocol logic for holiday discount unless explicitly scoped.

## Required interfaces

- Experience slot decision.
- Optional campaign badge/message mapping.
- Fail-closed unsupported slot handling.

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- [MISSING: current Aukro UI ownership and supported slots]

## Validation evidence required before implementation is accepted

- UI smoke or documented unsupported slot result.
- No marketplace listing mutation from BPCP without separate approval.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
