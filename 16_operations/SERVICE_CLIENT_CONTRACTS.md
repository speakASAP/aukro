---
id: SERVICE-CLIENT-CONTRACTS-AUKRO-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 10_features/FEAT-009-service-integration-clients.md
  - 16_operations/INTEGRATIONS.md
downstream:
  - shared/clients
related_adrs: []
---
# Aukro Service Client Contracts

## Purpose

Document the optional ecosystem clients added for FEAT-009. These clients prepare future workflows but do not make offer, stock, order, or publish paths depend on optional services.

## Client Matrix

| Client | Env var | Default URL | Contract examples |
|---|---|---|---|
| `AiClientService` | `AI_SERVICE_URL` | `http://ai-microservice:3380` | `aukro.ai.listing-proposal.v1`, `aukro.ai.policy-risk.v1` |
| `LeadsClientService` | `LEADS_SERVICE_URL` | `http://leads-microservice:4400` | `aukro.leads.create.v1` |
| `MarketingClientService` | `MARKETING_SERVICE_URL` | `http://marketing-microservice:4600` | `aukro.marketing.product-recommendation.v1` |
| `MinioClientService` | `MINIO_SERVICE_URL` | `http://minio-microservice:9000` | `aukro.minio.image-variant.v1`, `aukro.minio.evidence-bundle.v1` |
| `NotificationsClientService` | `NOTIFICATION_SERVICE_URL` | `http://notifications-microservice:3368` | `aukro.notifications.send.v1` |
| `PaymentsClientService` | `PAYMENT_SERVICE_URL` | `http://payments-microservice:3468` | `aukro.payments.status.v1` |
| `SuppliersClientService` | `SUPPLIERS_SERVICE_URL` | `http://suppliers-microservice:3202` | `aukro.suppliers.product-signals.v1` |
| `LoggingClientService` | `LOGGING_SERVICE_URL` | `http://logging-microservice:3367` | `aukro.logging.event.v1` |

## Timeout And Retry Policy

Each client uses its service-specific timeout env var when present, otherwise `HTTP_TIMEOUT`, otherwise 5000 ms. TASK-004 does not add automatic retries for optional advisory clients; callers that need retry semantics must opt in with shared resilience utilities and idempotent contracts.

## Failure Policy

Optional clients return an `EcosystemClientResult` with `success: false`, `unavailable: true`, `service`, `contractVersion`, optional `status`, and masked `errorCode`. They do not throw for downstream unavailability.

## Masking Policy

Client failures log service name, contract version, status, and error code only. The logging event client masks keys matching token, secret, password, email, phone, or address before sending structured events.

## Ownership Boundaries

These clients do not move AI, lead, marketing, media, notification, payment, supplier, or logging domain logic into aukro-service. Downstream services remain authoritative for their own contracts and data.

## Validation

Mocked tests validate request contract versions, health checks, graceful unavailable results, and masking. No live service calls are required for TASK-004 validation.
