---
id: SYS-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 01_vision/VISION.md
  - 02_business_case/BUSINESS_CASE.md
downstream:
  - 05_subsystems/SUB-001-api-gateway.md
  - 05_subsystems/SUB-002-marketplace-integration.md
  - 05_subsystems/SUB-003-stock-and-order-events.md
related_adrs:
  - 07_decisions/ADR-002-nestjs-prisma-postgres.md
---
# SYS-001 aukro-service

## Purpose

Provide the production Aukro.cz marketplace integration for account management, offer create/update workflows, stock synchronization and order forwarding.

## Responsibilities

Expose APIs, validate catalog products before offer creation, store integration records, subscribe to stock/order events where configured, forward orders to orders-microservice, and use Vault/K8s secrets.

## Non-responsibilities

Catalog truth, warehouse stock truth, downstream order lifecycle after forwarding, or storing secrets in docs/prompts/tests.

## Inputs

Authorized API requests, catalog validation responses, warehouse stock events, Aukro webhooks and runtime secret references.

## Outputs

Aukro offer calls, account/offer/order transit records, forwarded order data, logs and health status.

## Dependencies

PostgreSQL, Prisma, Aukro REST API, auth, catalog, warehouse, orders, notifications, logging, RabbitMQ and Kubernetes.

## Upstream traceability

`01_vision/VISION.md` and `02_business_case/BUSINESS_CASE.md`.

## Downstream artifacts

`10_features/FEAT-001-offer-management.md`, `10_features/FEAT-002-stock-sync.md`, `10_features/FEAT-003-order-forwarding.md`.

## Validation criteria

Offer creation requires catalog validation; stock sync preserves warehouse ownership; order forwarding preserves order ownership; secrets remain references only; IPS gates pass or document human-review blockers.

## Validation

Run strict documentation audit, pre-coding gate and targeted service tests for implementation changes.

## Open questions

No open questions for baseline adoption. Future marketplace behavior changes require task-specific open questions.
