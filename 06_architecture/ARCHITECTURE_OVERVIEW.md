---
id: ARCH-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 04_systems/SYS-001-aukro-service.md
downstream:
  - 07_decisions/ADR-002-nestjs-prisma-postgres.md
related_adrs:
  - 07_decisions/ADR-002-nestjs-prisma-postgres.md
---
# Architecture Overview

## Architectural style

NestJS service with colocated API gateway, Prisma/PostgreSQL persistence, RabbitMQ event integration, Aukro REST API calls and Kubernetes deployment.

## Storage choices

PostgreSQL stores Aukro account, offer and order transit records. Prisma manages schema/client access.

## Recommended MVP architecture

Keep modular route/domain boundaries for accounts, offers, orders, gateway and shared platform clients.

## RAG role

No runtime RAG role. IPS retrieval is documentation-oriented and optional.

## Atlassian role

No direct Atlassian dependency is documented for this baseline.

## Security model

Secrets live in Vault and K8s secrets. Docs, prompts, tests, logs and reports reference secret names only.

## Validation

Architecture changes require ADR updates, targeted tests and IPS gate reports.
