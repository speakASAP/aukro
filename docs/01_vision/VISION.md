---
id: VISION-AUKRO-001
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - BUSINESS.md
downstream:
  - docs/02_business_case/BUSINESS_CASE.md
  - docs/04_systems/SYS-001-aukro-service.md
related_adrs:
  - docs/07_decisions/ADR-003-protect-intent-documents.md
---
# Vision Document

Status: Immutable by AI after IPS baseline adoption. Source: `BUSINESS.md`, `SYSTEM.md` and `README.md`.

## One-sentence vision

aukro-service is the production Aukro.cz sales-channel integration that safely manages Aukro accounts, creates and updates offers from validated catalog products, synchronizes stock, and forwards received Aukro orders to the order domain.

## Problem statement

The business needs reliable automation between internal catalog, stock and order systems and Aukro.cz. Without this service, offer publication, stock accuracy and order intake would be manual or inconsistent.

## Target users

Internal services publishing catalog products, operations owners monitoring marketplace health, and downstream order services receiving Aukro orders.

## Core user need

A safe, traceable integration that updates marketplace state only through approved validation and forwards orders to the proper owner.

## Key outcomes

1. Offers are created or updated only after catalog product validation.
2. Warehouse stock updates propagate to linked Aukro offers.
3. Aukro orders are received and forwarded to orders-microservice.
4. Aukro credentials remain in Vault/K8s secret management.
5. Service changes remain traceable to business intent and validation evidence.

## Non-goals

aukro-service is not the catalog, stock or order lifecycle source of truth. AI agents must not create live offers or mutate marketplace data outside approved code paths and validation.

## Success criteria

Production remains available at the documented domain, offer operations require catalog validation, stock and order flows preserve ownership boundaries, and IPS gates provide evidence for AI-assisted work.

## Product philosophy

Keep the service narrow, operationally predictable and explicit about marketplace boundaries.

## AI philosophy

AI may assist only from documented tasks and execution plans while preserving marketplace safety, secret handling, traceability and validation evidence.
