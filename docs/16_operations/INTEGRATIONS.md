---
id: INTEGRATIONS-AUKRO-AI-COMMERCE-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - SYSTEM.md
  - docs/08_roadmap/AI_COMMERCE_ROADMAP.md
downstream:
  - docs/10_features/FEAT-009-service-integration-clients.md
related_adrs: []
---
# Aukro Ecosystem Integrations

## Purpose

Define integration boundaries that future aukro-service execution plans must preserve or explicitly validate.

## Existing Boundaries

| Integration | Direction | Current usage | Constraint |
|---|---|---|---|
| auth-microservice | inbound auth / outbound validation | shared JWT guard and auth service | Operators and service calls require authenticated actor context. |
| catalog-microservice | outbound | product search, detail, pricing, media | Offer creation and updates require catalog validation. |
| warehouse-microservice | outbound / RabbitMQ inbound | stock totals and stock events | Warehouse remains stock truth. |
| orders-microservice | outbound | order create and status contract | Aukro orders are transit records only, then forwarded. |
| logging-microservice | outbound | shared logger | Logs must be masked and non-secret. |
| Aukro API | outbound future hardening | marketplace offer/account/order operations | Must respect official API rules, auth, scopes, rate limits, and terms. |

## Planned Boundaries

| Integration | Direction | Planned usage | Validation need |
|---|---|---|---|
| ai-microservice | outbound | title, description, category, media, pricing, and policy-risk proposals | proposal contract, deterministic request ID, no secrets or raw customer data |
| leads-microservice | outbound | buyer inquiry and high-intent lead creation | lead event contract and PII minimization |
| marketing-microservice | outbound | campaign and promotion recommendations | recommendation contract and attribution fields |
| minio-microservice | outbound | approved media variants and evidence bundles | signed reference contract and media policy tests |
| notifications-microservice | outbound | approval, blocker, order, drift, and failure alerts | notification contract and graceful failure behavior |
| payments-microservice | outbound | payment/settlement/refund status evidence | read-only contract first and masked data policy |
| suppliers-microservice | outbound | cost, stock, lead time, replenishment and margin signals | supplier availability contract and fallback behavior |

## Event Taxonomy

Future event names should use the aukro prefix and masked payloads:

| Event | Producer | Consumer intent |
|---|---|---|
| aukro.catalog.ready | aukro-service | Product is eligible for an Aukro draft. |
| aukro.draft.created | aukro-service | Local draft exists for product/account. |
| aukro.policy.blocked | aukro-service | Publication blocked with reason codes. |
| aukro.ai.proposal.created | aukro-service | AI proposal stored for human review. |
| aukro.publish.approved | aukro-service | Human approved publish request. |
| aukro.publish.queued | aukro-service | Publish attempt queued with idempotency key. |
| aukro.publish.succeeded | aukro-service | Aukro mutation succeeded. |
| aukro.publish.failed | aukro-service | Aukro mutation failed or was rejected. |
| aukro.stock.synced | aukro-service | Offer quantity aligned with warehouse truth. |
| aukro.stock.drift | aukro-service | Marketplace stock differs from warehouse truth. |
| aukro.order.received | aukro-service | Aukro order received. |
| aukro.order.forwarded | aukro-service | Order accepted by orders-microservice. |
| aukro.order.forward_failed | aukro-service | Order forwarding failed after retry policy. |
| aukro.margin.warning | aukro-service | Price or supplier cost threatens margin. |
| aukro.demand.signal | aukro-service | Buyer interest should inform leads or marketing. |

## Required Execution-Plan Checks

Every contract-affecting task must declare:

- affected integrations;
- env vars and secret references without values;
- request and response examples with synthetic or masked data;
- timeout, retry, circuit breaker, and fallback behavior;
- log masking rules;
- contract tests and rollback plan.
