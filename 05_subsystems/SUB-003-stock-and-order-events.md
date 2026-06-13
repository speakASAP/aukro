---
id: SUB-003
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 04_systems/SYS-001-aukro-service.md
downstream:
  - 10_features/FEAT-001-offer-management.md
related_adrs: []
---
# SUB-003 Stock and Order Events

## Purpose

Keep Aukro stock aligned with warehouse events and forward Aukro orders to the order domain.

## Parent system

`04_systems/SYS-001-aukro-service.md`

## Responsibilities

Preserve the subsystem boundary, use existing NestJS/shared modules, and keep ownership aligned with documented domain services.

## Interfaces

Implemented under `services/` and `shared/` source trees as documented in `SYSTEM.md`.

## Dependencies

NestJS, PostgreSQL/Prisma where applicable, shared auth/logging clients, and relevant downstream services.

## Data ownership

The subsystem owns only aukro-service integration concerns. Catalog, stock, orders and secrets remain owned by their source systems.

## Inputs

stock.updated events, order webhooks and runtime config.

## Outputs

Aukro quantity updates, forwarded orders and transit records.

## Failure modes

Misconfiguration, downstream outage, invalid input, retry/visibility gaps, or stale marketplace state.

## Validation criteria

Targeted tests and operational checks must prove the subsystem preserves ownership boundaries and expected behavior.

## Validation

Run task-specific tests plus IPS gates for implementation changes.
