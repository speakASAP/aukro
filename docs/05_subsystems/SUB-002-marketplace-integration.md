---
id: SUB-002
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/04_systems/SYS-001-aukro-service.md
downstream:
  - docs/10_features/FEAT-001-offer-management.md
related_adrs: []
---
# SUB-002 Marketplace Integration

## Purpose

Manage Aukro accounts and offers while enforcing catalog validation and secret boundaries.

## Parent system

`docs/04_systems/SYS-001-aukro-service.md`

## Responsibilities

Preserve the subsystem boundary, use existing NestJS/shared modules, and keep ownership aligned with documented domain services.

## Interfaces

Implemented under `services/` and `shared/` source trees as documented in `SYSTEM.md`.

## Dependencies

NestJS, PostgreSQL/Prisma where applicable, shared auth/logging clients, and relevant downstream services.

## Data ownership

The subsystem owns only aukro-service integration concerns. Catalog, stock, orders and secrets remain owned by their source systems.

## Inputs

Authorized API requests, catalog product data and secret references.

## Outputs

Aukro API calls and stored account/offer records.

## Failure modes

Misconfiguration, downstream outage, invalid input, retry/visibility gaps, or stale marketplace state.

## Validation criteria

Targeted tests and operational checks must prove the subsystem preserves ownership boundaries and expected behavior.

## Validation

Run task-specific tests plus IPS gates for implementation changes.
