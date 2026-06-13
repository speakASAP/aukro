---
id: BUSINESS-CASE-AUKRO-001
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - BUSINESS.md
  - 01_vision/VISION.md
downstream:
  - 10_features/FEAT-001-offer-management.md
  - 10_features/FEAT-002-stock-sync.md
  - 10_features/FEAT-003-order-forwarding.md
related_adrs: []
---
# Business Case

## Problem

The company needs a production Aukro.cz integration that publishes offers, keeps stock aligned and transfers orders into the order-processing ecosystem without duplicating domain ownership.

## Pain points

Marketplace offers must not be created from unvalidated catalog data; stock updates must propagate from warehouse events; Aukro orders must be forwarded; credentials must remain in Vault/K8s; production changes need auditable validation evidence.

## Proposed solution

Maintain aukro-service as a narrow NestJS service backed by PostgreSQL and Prisma, integrated with catalog, warehouse, orders, logging, auth and notifications services.

## Value proposition

The service provides a controlled Aukro.cz sales channel while keeping catalog, stock, order and secret ownership in the proper systems.

## Differentiators

Catalog validation before offer creation, event-driven stock synchronization, order forwarding instead of local order ownership, Vault-backed secrets, and IPS traceability.

## Risks

Invalid offers, stale stock, secret leakage and untraced AI changes could harm marketplace operations.

## Adoption strategy

Adopt IPS as a governance layer without changing runtime behavior. Future feature and fix work starts from task, plan, context and validation artifacts.
