---
id: CORE-ENTITIES-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 01_vision/VISION.md
  - prisma/schema.prisma
downstream:
  - 04_systems/SYS-001-aukro-service.md
related_adrs: []
---
# Core Entities

## Entity relationship overview

aukro-service links catalog products and warehouse stock updates to Aukro offers, then records received Aukro orders as transit data before forwarding.

## VisionGoal
Safe Aukro.cz marketplace integration for offers, stock and order forwarding.
## System
aukro-service including NestJS app, gateway, PostgreSQL schema, K8s manifests and deploy script.
## Subsystem
Gateway, account/offer management, stock synchronization and order forwarding.
## Feature
Offer management, stock synchronization and order forwarding.
## Task
Bounded work requiring traceability, execution plan and validation.
## ContextPackage
Task input that lists included/excluded documents and validation instructions.
## AukroAccount
Configured Aukro seller account and credential reference. Raw credentials stay in Vault/K8s.
## AukroOffer
Marketplace offer linked to an internal catalog product.
## AukroOrder
Aukro order handled as transit data and forwarded to orders-microservice.
