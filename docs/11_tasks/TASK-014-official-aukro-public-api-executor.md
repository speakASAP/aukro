---
id: TASK-014
status: reviewed
owner: Engineering
created: 2026-06-30
last_updated: 2026-07-01
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-offer-management.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../10_features/FEAT-008-observability-reconciliation.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-014.md
execution_plan:
  - ../21_execution_plans/EP-TASK-014-official-aukro-public-api-executor.md
---
# TASK-014: Official Aukro Public API Executor

## Objective

Implement a separate official Aukro Public API executor that consumes approved local publish intent and performs live marketplace work through Aukro API v2 only. Do not extend the TASK-007 record-only mutation path.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-001-offer-management.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/10_features/FEAT-008-observability-reconciliation.md`, `docs/16_operations/AUKRO_PLATFORM_RULES.md`, and the official Aukro documentation at `https://api.aukro.cz/` / `https://api.aukro.cz/assets/openapi.yaml`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-014.md`. This task turns approved local publish requests into controlled live Aukro offer operations while keeping catalog, warehouse, order, policy, human approval, idempotency, and observability boundaries intact.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. Live mutation must require traceability, catalog validation, policy pass, human approval, official API credentials, idempotency, and validation evidence. Secrets and raw production data must stay out of docs, prompts, tests, reports, and logs.

## Sensitive-Data Classification

Classification: production-sensitive for runtime credentials and live marketplace responses; synthetic/masked for tests and documentation. Store only secret references, masked token state, Aukro ids, status codes, and normalized error codes in artifacts. Do not store bearer tokens, passwords, API key values, raw customer data, raw production orders, or full live payload dumps.

## Official API Contract Snapshot

Source checked on 2026-06-30 from `https://api.aukro.cz/assets/openapi.yaml`.

- API title/version: Aukro Public API `2.0`.
- Production base URL: `https://aukro.cz/api/v2`.
- Development base URL: `https://be.djp.aukro.cloud/backend-web/api/v2`.
- Authentication: `POST /authenticate` with username/password and `X-Aukro-Api-Key`, returns bearer token. Protected endpoints require both `Authorization: Bearer <token>` and `X-Aukro-Api-Key`.
- Current offer creation endpoint: `POST /offers-v2`.
- Current offer update endpoint: `PATCH /offers-v2/{id}`.
- Current offer list endpoint: `GET /offers-v2/list`.
- Current image endpoints: `POST /images` and `POST /images/url` before offer creation.
- Required metadata endpoints: `GET /categories`, `GET /categories/{id}/attributes`, and `GET /shipping-templates`.
- Webhook management endpoints cover settings, subscriptions, failed-event count, and failed-event replay operations.
- Deprecated/removed endpoints must not be used for new publishing: legacy `POST /offers`, `PATCH /offers/{id}`, `POST /offers-import`, and `POST /offers/list` were removed from the documented flow.

## Scope

- Add an official Aukro API client with auth token acquisition, masked logging, timeout handling, retry-safe read calls, and fail-closed mutation calls.
- Add an executor contract that consumes existing approved publish attempt records without changing TASK-007 record-only semantics.
- Build offer payloads from local draft/catalog/media/warehouse evidence into `OfferV2Request`.
- Upload or import images through official image endpoints before offer creation.
- Create live offers through `POST /offers-v2` only after policy, approval, rate-limit, idempotency, account, category, shipping template, media, stock, and price gates pass.
- Store live Aukro offer id and normalized response evidence in local offer metadata.
- Add read-only reconciliation through `GET /offers-v2/list` and `GET /offers/{id}`.
- Add webhook ingestion/subscription planning for statistics and order/event state, with separate guarded mutation for webhook settings.

## Non-Goals

- No browser automation or scraping of Aukro pages.
- No live marketplace mutation through TASK-007 record-only enqueue path.
- No live mutation without official credentials and explicit executor gate evidence.
- No storage of secret values or bearer tokens in Prisma rawData, logs, docs, tests, or validation reports.
- No warehouse stock reservation/decrement or order ownership transfer outside existing domain services.
- No changing protected intent documents.

## Acceptance Criteria

- [ ] New executor code path is separate from `mutation.enabled: false` TASK-007 records.
- [ ] Executor authenticates through official API and masks token/key/password values.
- [ ] Executor refuses to run when API key, username/password, base URL, account readiness, category attributes, shipping template, media, rate-limit evidence, policy pass, human approval, or idempotency evidence is missing.
- [ ] `POST /offers-v2` payload uses documented v2 fields: `name`, `language`, `description`, price object, `quantity`, `categoryId`, `shippingTemplateId`, `duration`, `location`, `attributes`, and image ids/URLs.
- [ ] Live success records Aukro offer id, status, timestamps, request correlation, and normalized response metadata without raw token or raw customer data.
- [ ] Failures record normalized status/error codes and leave retry decisions explicit and idempotent.
- [ ] Reconciliation and statistics read official API/webhook data and expose masked operational metrics.
- [ ] Synthetic tests cover auth failure, missing credentials, blocked policy, payload mapping, image upload failure, create success, create conflict, idempotent replay, and reconciliation read paths.
- [ ] No deprecated Aukro endpoints are used.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `docs/16_operations/AUKRO_PLATFORM_RULES.md`, TASK-005/TASK-007/TASK-012/TASK-013 packages, offer/account/order/workbench services, Prisma account/offer/order models, k8s secret refs, and official Aukro OpenAPI.

## Current Blockers

- [MISSING: production Aukro API username/password/API key values in the external secret backend; k8s env and secret refs are wired]
- [RESOLVED: executor-specific production base URL and prod selection config are wired in `.env.example` and `k8s/configmap.yaml`]
- [MISSING: official numeric rate-limit contract or owner-approved local request budget]
- [MISSING: product-to-Aukro category/attribute mapping completeness for live offers]
- [MISSING: account shipping template selection evidence]
- [UNKNOWN: whether current Aukro account feature flags allow video uploads]

## Validation Task

Create and complete `docs/12_validation/VAL-TASK-014-official-aukro-public-api-executor.md`, run service tests, build, strict audit, pre-coding gate, deployment-readiness gate targeting TASK-014, and non-mutating connectivity checks. Live mutation validation must use a separately approved test product/account and must record only masked evidence.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-014`; `git diff --check`.


## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-014-official-aukro-public-api-executor.md` before coding. The plan is reviewed for fail-closed executor implementation, but it does not approve live marketplace mutation until credential refs, mapping evidence, rate-limit evidence, and an approved test listing exist.
