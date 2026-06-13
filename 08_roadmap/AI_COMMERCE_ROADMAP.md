---
id: ROADMAP-AUKRO-AI-COMMERCE-001
status: reviewed
owner: Engineering / Product / Operations
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 01_vision/VISION.md
  - 02_business_case/BUSINESS_CASE.md
  - 04_systems/SYS-001-aukro-service.md
downstream:
  - 09_milestones/MS-003-ai-commerce-platform.md
  - 10_features/FEAT-004-aukro-compliance-policy.md
  - 10_features/FEAT-005-catalog-warehouse-publisher.md
  - 10_features/FEAT-006-ai-human-workbench.md
  - 10_features/FEAT-007-ecosystem-revenue-optimization.md
  - 10_features/FEAT-008-observability-reconciliation.md
  - 10_features/FEAT-009-service-integration-clients.md
related_adrs: []
---
# Aukro AI Commerce Roadmap

## Purpose

Turn aukro-service from a basic Aukro.cz integration into an AI-assisted sales-channel operating system that increases revenue while preserving marketplace rules, source-system ownership, human control, and IPS traceability.

This document extends the existing approved vision without changing protected intent. Runtime changes still require task-specific execution plans, validation reports, and ADRs for major architecture, schema, marketplace, AI autonomy, or deployment decisions.

## Strategic North Star

Sell more validated Alfares catalog products on Aukro.cz with less manual marketplace work, better conversion, lower stock/order risk, and explicit policy guardrails that prevent rule-breaking offers.

## Current Baseline

aukro-service currently provides:

- account records in PostgreSQL;
- local Aukro offer records linked to catalog product IDs;
- catalog search, pricing, media, and warehouse stock lookup during sync;
- order transit records and forwarding to orders-microservice;
- JWT auth, logging, RabbitMQ stock-event wiring, Prisma, Kubernetes, and Vault secret references;
- IPS documentation gates.

Known baseline gaps:

- no dedicated Aukro API/OAuth client and no token lifecycle equivalent to Allegro;
- no explicit Aukro compliance policy engine;
- no draft/publish queue with human approval and idempotent attempts;
- no AI content/category/pricing assistant connected to ai-microservice;
- no leads, marketing, payments, suppliers, minio, or notifications integration plan beyond basic system mentions;
- no offer performance, conversion, reconciliation, or revenue feedback loop;
- no frontend/operator workbench in this repo;
- no concrete implementation goal tracker for the large AI commerce program.

## Reference Patterns To Reuse

### From allegro-service

- Preserve catalog-microservice as product source of truth and use catalog product IDs without cross-service foreign keys.
- Use marketplace account/token lifecycle patterns with encrypted credentials and user reauthorization states.
- Track sync status, sync error, sync source, raw marketplace payload, events, metrics, and sync jobs.
- Keep offer publishing explicit, observable, rate-limited, and user-account aware.
- Use notifications for order and sync-error alerts.
- Use import/transformation only as a bounded ingestion path, not as a second product truth.

### From bazos-service

- Treat marketplace rules as backend policy gates, not UI warnings.
- Require human review for ambiguous category, content, identity, duplicate, challenge, or account states.
- Use guarded queues and idempotent publish attempts instead of synchronous unrestricted publishing.
- Store explicit challenge/review states so automation fails closed.
- Provide catalog sell actions that prepare drafts first and require explicit confirmation before publish.
- Provide monitoring and reconciliation for blocked attempts, stale submissions, and active listing counts.

## Core Product Principles

1. Catalog, warehouse, orders, payments, suppliers, leads, marketing, notifications, logging, minio, and AI services keep their domain ownership.
2. aukro-service owns only the Aukro channel orchestration, Aukro mapping, Aukro policy state, Aukro publication attempts, and Aukro reconciliation evidence.
3. AI may recommend, draft, score, classify, translate, and optimize, but policy gates and human approval decide what can publish.
4. Every live marketplace mutation must be traceable to catalog data, stock data, policy evaluation, actor, idempotency key, and validation evidence.
5. Automation must fail closed when Aukro rules, API responses, account state, product data, stock, images, pricing, or category mapping are unclear.

## Ecosystem Integration Map

| Service | Direction | Aukro value | Required contract |
|---|---|---|---|
| auth-microservice | inbound auth / outbound validation | operator identity, role checks, audit actor | JWT validation, role claims, service tokens |
| catalog-microservice | outbound / inbound sell action | product truth, title, description, category, pricing, media references | product detail, search, category, pricing, media, publish eligibility |
| warehouse-microservice | outbound / event inbound | available quantity, reservations, stock reconciliation | stock totals, stock events, reserve/unreserve policy for Aukro orders |
| orders-microservice | outbound | central order creation and lifecycle handoff | idempotent order create, status lookup/update, conflict handling |
| ai-microservice | outbound | content quality, category mapping, translation, policy risk, pricing recommendations | deterministic request IDs, model/version metadata, no secrets/raw customer data |
| leads-microservice | outbound | convert watcher/questions/messages into leads and follow-up tasks | lead create/update, source=aukro, product and account context |
| marketing-microservice | outbound | campaign selection, seasonal promotion, keywords, cross-channel plan | campaign/product recommendations and UTM/channel attribution |
| minio-microservice | outbound | channel-ready image variants and evidence archives | signed media references, image transform outputs, policy evidence bundle storage |
| notifications-microservice | outbound | human approval alerts, blocked publish alerts, order/sync failures | notification send with masked context |
| payments-microservice | outbound | payment status reconciliation for Aukro orders where relevant | payment status contract, refund/chargeback context when available |
| suppliers-microservice | outbound | supplier availability, dropship viability, replenishment hints | supplier stock, cost, lead time, margin inputs |
| logging-microservice | outbound | structured audit, revenue, policy, and failure events | masked structured events with correlation IDs |
| allegro-service | reference only / future peer events | reuse marketplace patterns and compare cross-channel performance | no direct ownership coupling |
| bazos-service | reference only / future peer events | reuse compliance, human review, queue, and monitoring patterns | no direct ownership coupling |

## Roadmap Stages

### Stage 0: Governance And Baseline Stabilization

Goal: document the complete program and prepare implementation without changing live behavior.

Deliverables:

- this roadmap and integration map;
- feature set FEAT-004 through FEAT-009;
- TASK-002 planning package and validation evidence;
- active program state in TASKS.md;
- readiness gates run and recorded.

Exit criteria:

- IPS strict audit passes or documented exceptions exist;
- pre-coding and deployment-readiness gates pass for documentation-only planning;
- no protected intent document modified by AI.

### Stage 1: Aukro Rulebook, Contracts, And API Foundation

Goal: make Aukro publication rules, account states, API contracts, and ecosystem contracts explicit before automation.

Implementation goals:

- create an Aukro compliance policy document under operations/governance;
- add ADR for Aukro API/OAuth/token handling after confirming official Aukro API constraints;
- define DTOs/contracts for draft, policy evaluation, publish attempt, reconciliation, and human review;
- add service clients for ai, leads, marketing, minio, notifications, payments, suppliers, and logging where not already present;
- define environment variables and Kubernetes secret references without secret values;
- add contract tests with mocked services.

Revenue impact:

- prevents account/rule damage;
- enables safe automation and faster onboarding of sellable catalog products.

### Stage 2: Catalog And Warehouse Sell Pipeline

Goal: allow catalog or warehouse to request Aukro selling without manual aukro.cz login.

Implementation goals:

- add POST /offers/from-catalog to create or reuse a local Aukro draft;
- add POST /offers/:id/policy-check to return blocking and recommended actions;
- add POST /offers/:id/request-approval for human review;
- add POST /offers/:id/enqueue-publish that works only after explicit approval and current policy pass;
- add product eligibility filters: active product, sellable category, images present, price present, stock available, supplier viable, no local duplicate, no channel conflict;
- subscribe to catalog product updates and warehouse stock updates where practical;
- map catalog category to Aukro category with human-review fallback.

Revenue impact:

- faster publication of eligible inventory;
- fewer stale or invalid offers;
- lower manual listing time per product.

### Stage 3: AI Listing Intelligence With Human Control

Goal: use AI to improve offer quality and conversion while leaving publish authority to policy and humans.

Implementation goals:

- AI title optimization in Czech with marketplace-safe claims;
- AI description generation from catalog attributes and supplier data;
- AI category and parameter suggestions with confidence and reason codes;
- AI image quality scoring and minio-backed image variant requests;
- AI price recommendation using catalog margin, supplier cost, stock age, marketplace performance, and marketing campaigns;
- AI risk scoring for forbidden goods, unsupported claims, duplicate text, missing warranty/company info, and low-quality media;
- human diff view between catalog source and AI proposal;
- approval workflow with roles from auth-microservice.

Revenue impact:

- better click-through and conversion;
- higher margin through price optimization;
- lower rejection and manual editing time.

### Stage 4: Publish Queue, Reconciliation, And Order Feedback

Goal: make live marketplace mutation idempotent, rate-limited, observable, and reversible where possible.

Implementation goals:

- publish attempt table with stable idempotency key;
- per-account queue and rate limit based on Aukro API rules;
- pre-submit policy recheck immediately before Aukro mutation;
- webhook/polling reconciliation for offer status, stock, price, and order state;
- order idempotency against orders-microservice using external order ID and channel account ID;
- stock reservation or decrement policy aligned with warehouse and orders ownership;
- notifications for failed publish, blocked account, order-forward failure, and reconciliation drift.

Revenue impact:

- prevents overselling and duplicate orders;
- reduces downtime and hidden failed listings;
- increases trust in automated channel operations.

### Stage 5: Revenue Optimization And Cross-Service Growth Loops

Goal: use marketplace data to sell more and improve the whole Alfares ecosystem.

Implementation goals:

- feed offer performance, views, watchers, questions, conversion, margin, and stock age into a channel analytics table;
- create leads from buyer questions and high-intent interactions;
- request marketing campaign recommendations for products with stock but low conversion;
- request supplier replenishment or alternative supplier recommendations for high-converting low-stock products;
- compare Aukro performance with Allegro/Bazos where data is available;
- surface product-level recommendations back to catalog: improve title, add missing attribute, update images, adjust price, avoid channel;
- build scorecards: revenue, margin, conversion, sell-through, blocked value, time-to-publish, policy failure reasons.

Revenue impact:

- prioritizes products likely to sell;
- turns marketplace signals into catalog, supplier, and marketing action;
- supports measurable channel growth.

### Stage 6: Operator Workbench And Customer-Grade Experience

Goal: provide humans a productive UI/API so they do not need to log into aukro.cz manually for routine work.

Implementation goals:

- dashboard for drafts, policy blockers, approvals, publish queue, live offers, orders, and revenue;
- bulk workflows with safe filters and preview;
- product detail panel with catalog/warehouse/supplier/AI/marketplace context;
- human review queues by priority and blocked revenue;
- audit timeline for every offer and order;
- role-based actions for viewer, editor, approver, admin;
- clear recovery flows for expired tokens, blocked account, missing category, failed image, stock conflict, and order-forward error.

Revenue impact:

- fewer operator hours per listing;
- faster resolution of blockers;
- safer scaling across large product catalogs.

## Feature Backlog

| Feature | Purpose | First implementation task |
|---|---|---|
| FEAT-004 Aukro compliance policy | Prevent rule-breaking publication | Define policy, states, gates, and validation tests |
| FEAT-005 Catalog/warehouse publisher | Turn catalog stock into Aukro drafts and publish requests | Add draft from catalog and policy-check APIs |
| FEAT-006 AI/human workbench | AI recommendations with human approval | Integrate ai-microservice for content/category/price draft suggestions |
| FEAT-007 Revenue optimization | Close performance loops with ecosystem services | Add channel analytics and recommendation events |
| FEAT-008 Observability/reconciliation | Keep live marketplace state aligned | Add publish attempts, reconciliation jobs, notifications |
| FEAT-009 Service integration clients | Standardize ecosystem connections | Add missing clients/contracts/env docs |

## Prioritized Implementation Sequence

1. Write Aukro compliance policy and ADR for API/token strategy.
2. Add integration clients/contracts and masked logging conventions.
3. Add draft/policy data model and DTOs.
4. Implement catalog sell action and warehouse eligibility checks.
5. Implement AI suggestion service with deterministic request IDs and stored proposal metadata.
6. Implement human approval and role checks.
7. Implement publish queue with per-account rate limits and idempotency.
8. Implement order/reconciliation hardening.
9. Implement revenue analytics and cross-service recommendation events.
10. Implement operator dashboard/API aggregation.

## Metrics

| Metric | Target direction | Owner |
|---|---|---|
| Eligible catalog products with Aukro drafts | increase | Product/Ops |
| Time from catalog eligibility to draft | decrease | Engineering |
| Time from approved draft to live offer | decrease | Engineering/Ops |
| Publish policy failure rate by reason | decrease after remediation | Ops |
| Manual aukro.cz logins for routine tasks | decrease toward zero | Ops |
| Stock drift incidents | decrease | Engineering/Warehouse |
| Order-forward success rate | increase toward 99.9% | Engineering/Orders |
| Aukro gross merchandise value | increase | Business |
| Aukro contribution margin | increase | Business |
| Conversion rate per published offer | increase | Business/Marketing |
| Blocked revenue value | decrease | Product/Ops |

## Risk Register

| Risk | Mitigation |
|---|---|
| Aukro API or rules differ from assumptions | Verify official docs before code; encode stricter rule when uncertain; fail closed. |
| AI generates unsupported claims or wrong category | AI output is proposal only; backend policy gates and human approval required. |
| Overselling due to stock drift | Warehouse remains stock truth; reconcile before publish/order; notify drift. |
| Duplicate or low-quality offers damage account | local duplicate checks, category rules, approval, reconciliation. |
| Secrets or customer data leak into docs/prompts/logs | use secret references only, masked data, IPS sensitive-data scans. |
| Cross-service contract drift | contract tests and versioned clients before integration rollout. |
| Operators bypass service due to missing workflow | workbench must expose approval, recovery, and bulk workflows. |

## Required ADRs Before Code Changes

- Aukro API/OAuth/token and credential storage decision.
- Publish queue and idempotency decision.
- AI autonomy and human approval boundary decision.
- Cross-service event/contract versioning decision if new events are added.
- Analytics storage decision if marketplace performance data is persisted.

## Validation Strategy

- Documentation gates: strict audit, pre-coding gate, deployment-readiness gate.
- Contract tests: mocked ecosystem services and Aukro API responses.
- Policy tests: all allow/block states, stale evidence, duplicates, missing categories, missing media, stock zero, risky AI claims.
- Replay tests: publish attempt idempotency, queue restart, order-forward conflict handling.
- Integration tests: catalog draft creation, warehouse stock update, orders forwarding, notification failure path.
- Operational validation: reconciliation report with masked sample data.

## Next Implementation Goal

TASK-003 should implement FEAT-004 by creating the detailed Aukro compliance policy, challenge states, publish gates, and tests with no live Aukro mutation.
