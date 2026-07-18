---
id: EP-TASK-014
status: reviewed
source_task: ../11_tasks/TASK-014-official-aukro-public-api-executor.md
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
vision: docs/01_vision/VISION.md
constitution: docs/00_constitution/CONSTITUTION.md
feature: docs/10_features/FEAT-001-offer-management.md
features:
  - docs/10_features/FEAT-001-offer-management.md
  - docs/10_features/FEAT-005-catalog-warehouse-publisher.md
  - docs/10_features/FEAT-008-observability-reconciliation.md
goal_impact: docs/22_goal_impact/GOAL-IMPACT-TASK-014.md
---
# EP-TASK-014 Official Aukro Public API Executor

## Metadata

Owner: Engineering. Status: draft/planned. Source task: TASK-014. Lifecycle state: goal-driven implementation plan for a separate official Aukro Public API executor. This plan does not approve immediate production live mutation by itself.

## Upstream Traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/04_systems/SYS-001-aukro-service.md`
- `docs/10_features/FEAT-001-offer-management.md`
- `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`
- `docs/10_features/FEAT-008-observability-reconciliation.md`
- `docs/16_operations/AUKRO_PLATFORM_RULES.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-014.md`
- Official Aukro API docs: `https://api.aukro.cz/` and `https://api.aukro.cz/assets/openapi.yaml`

## Goal Impact

The plan creates a controlled bridge from approved local catalog publish intent to live Aukro offer operations through the official API only. It preserves the TASK-007 record-only queue as intent evidence and adds a separate executor layer with stricter gates for real marketplace mutation.

## Project Invariants

- AUKRO-INV-001: Add full TASK-014 IPS package before runtime edits.
- AUKRO-INV-002: Never publish unvalidated catalog products or products with failed policy evidence.
- AUKRO-INV-003: Keep catalog, warehouse, order, media, and marketplace ownership boundaries intact.
- AUKRO-INV-004: Keep secrets, bearer tokens, raw orders, customer identifiers, and live payload dumps out of docs/prompts/tests/logs.
- AUKRO-INV-005: Runtime secrets remain in Vault/K8s references; code uses env names only.
- AUKRO-INV-006: Add validation evidence before closure or deploy.

## Sensitive-Data Handling

Runtime credentials are production-sensitive. The executor may read username/password/API key from secret-backed env vars but must not return or log their values. Tests use synthetic credentials and mocked HTTP responses. Live validation reports may include endpoint names, HTTP status, correlation IDs, and normalized error codes only.

## Official API Contract Plan

- Base URL config: default production `https://aukro.cz/api/v2`, optional development `https://be.djp.aukro.cloud/backend-web/api/v2` for sandbox/testing.
- Auth: `POST /authenticate` with JSON username/password and `X-Aukro-Api-Key`, store bearer token in memory only.
- Protected headers: `Authorization: Bearer <token>`, `X-Aukro-Api-Key`, `Content-Type: application/json`, plus read localization headers `X-Accept-Language` and `X-Accept-Currency` where applicable.
- Offer create: `POST /offers-v2`; direct create has no documented `extId`, so executor idempotency is local and must bind source idempotency key to Aukro `offerId` after success.
- Offer update: `PATCH /offers-v2/{id}` only with state-aware restrictions.
- Reads: `GET /offers-v2/list`, `GET /offers/{id}`, `GET /categories`, `GET /categories/{id}/attributes`, `GET /shipping-templates`, webhook read endpoints.
- Images: `POST /images` or `POST /images/url` before `POST /offers-v2`; max 24 images, max 5 MB each.
- Webhooks: configure and subscribe only in a separate guarded operation; incoming webhook handler must verify `Authorization` header against configured secret and ACK quickly.
- Avoid removed endpoints: `POST /offers`, `PATCH /offers/{id}`, `POST /offers-import`, `POST /offers/list`, `POST /offers/bulk`.

## Contract Validation Plan

Use synthetic HTTP client fixtures to validate:

- missing credential refusal;
- authentication success and failure with masked output;
- category and attribute preflight;
- shipping template preflight;
- image upload URL and binary flows;
- v2 offer payload construction;
- create success and normalized failure;
- local idempotency replay before duplicate live create;
- reconciliation reads from list/detail endpoints;
- webhook authorization handling.

## Replay/Determinism Plan

TASK-007 publish attempts remain immutable intent records. TASK-014 executor records a separate execution record under offer metadata keyed by local idempotency key and executor version. If an execution record already has a successful Aukro offer id for the same idempotency key, the executor must not call `POST /offers-v2` again. If a previous execution failed before unknown remote state, reconciliation read must run before retry.

## Scope

1. Official API client module.
2. Executor service and types.
3. Offer payload mapper from local draft/content/media/stock/category/shipping evidence.
4. Account credential readiness and masked auth status.
5. Executor endpoint or worker entrypoint behind explicit operator/admin guard.
6. Reconciliation/statistics read path from official API/webhooks.
7. Synthetic tests and validation docs.

## Non-Goals

No scraping, no browser automation, no live mutation through TASK-007 path, no unapproved production offer creation, no secret changes without owner-provided secret refs, no Prisma migration until a separate schema plan is approved, and no protected intent document changes.

## Files to Inspect

- `AGENTS.md`, `AGENT_OPERATIONS.md`
- `docs/16_operations/AUKRO_PLATFORM_RULES.md`
- `docs/11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `docs/11_tasks/TASK-007-publish-queue-reconciliation.md`
- `docs/11_tasks/TASK-012-catalog-content-preview-drafts.md`
- `docs/11_tasks/TASK-013-dashboard-bulk-publish-candidates.md`
- `services/aukro-service/src/aukro/offers/*`
- `services/aukro-service/src/aukro/accounts/*`
- `services/aukro-service/src/aukro/orders/*`
- `services/aukro-service/src/aukro/workbench/*`
- `prisma/schema.prisma`
- `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `k8s/deployment.yaml`
- Official OpenAPI from `https://api.aukro.cz/assets/openapi.yaml`

## Files to Create

- Official Aukro Public API client module files under the Aukro service source tree.
- Official API type definitions based on the OpenAPI v2 contract.
- Executor module files for gates, payload mapping, execution metadata, and synthetic tests.
- Optional read-only reconciliation/statistics normalizer files when implementation reaches that workstream.

## Files to Modify

- `services/aukro-service/src/aukro/aukro.module.ts` for final module wiring.
- `services/aukro-service/package.json` only if the test script needs explicit inclusion.
- `k8s/configmap.yaml` for non-secret env names only.
- `k8s/external-secret.yaml` and `k8s/deployment.yaml` only after owner confirms secret names and refs.
- `TASKS.md` and `graph/project_graph.example.yaml` only under integration-owner control because current TASK-012/TASK-013 work also touches tracker files.
- `docs/12_validation/VAL-TASK-014-official-aukro-public-api-executor.md` during validation.

## Files That Must Not Be Modified

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- Secret value files, raw `.env` values, production credential dumps, and unrelated task files.
- TASK-007 implementation semantics that mark publish intent as record-only.

## Implementation Steps

1. Resolve dirty-tree coordination for current TASK-012/TASK-013 changes and avoid shared tracker edits until integration owner clears them.
2. Add TASK-014 IPS docs and validation shell.
3. Add official API type contracts from OpenAPI v2 and a masked client with auth/token-in-memory behavior.
4. Add config reader for `AUKRO_PUBLIC_API_BASE_URL`, `AUKRO_PUBLIC_API_USERNAME`, `AUKRO_PUBLIC_API_PASSWORD`, `AUKRO_PUBLIC_API_KEY`, `AUKRO_PUBLIC_API_LANGUAGE`, `AUKRO_PUBLIC_API_CURRENCY`, `AUKRO_PUBLIC_API_LOCATION_*`, and webhook secret ref names.
5. Add read-only connectivity/preflight endpoint: auth status, categories ETag status, shipping template availability, and list/detail read capability. Values masked.
6. Add payload mapper from local draft/sourceSnapshot/rawData into `OfferV2Request`, including limited Aukro HTML description wrapper, price currency object, leaf category, attributes, shipping template, duration, quantity, location, and images.
7. Add executor gate that consumes queued approved publish attempt records but writes separate execution metadata.
8. Add image upload step and create-offer step with local idempotency replay guard.
9. Add reconciliation/statistics read path and webhook ingestion planning; webhook settings/subscriptions remain separate guarded operations.
10. Add synthetic tests for all gates and failure modes.
11. Run validation gates and record evidence.
12. Deploy only after credentials/config and live-mutation test plan are owner-approved.

## Test Plan

Run targeted executor tests first, then full service suite:

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
```

If shared client/build output is stale, run `npm --prefix shared run build` before service tests and record this as validation setup.

## Validation Plan

- Strict doc audit.
- Pre-coding gate.
- Deployment-readiness gate for TASK-014.
- `git diff --check`.
- Non-mutating official API connectivity check with masked status only.
- Optional live create/update test only with separately approved test listing and cleanup/termination plan.

## Parallel Execution Section

- Workstream A, API client and official contract types: ready after TASK-014 docs exist. Owner: API worker. Allowed files: new official API client module files only. Forbidden: offers service, Prisma, k8s, trackers. Expected output: masked client with synthetic tests/mocks if owned locally. Validation: targeted TypeScript build or service test.
- Workstream B, executor mapper and gates: dependency-gated on A. Owner: executor worker. Allowed files: new executor module files only. Forbidden: TASK-007 semantics, Prisma schema, k8s. Expected output: payload mapper, gate model, execution records, synthetic tests. Validation: executor spec.
- Workstream C, config/secrets/readiness: ready now as read-only planning, implementation dependency-gated on owner-provided secret refs. Owner: platform worker. Allowed files after approval: `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `k8s/deployment.yaml`. Forbidden: secret values and raw `.env`. Expected output: env-name patch and masked readiness docs. Validation: manifest diff and pre-coding/deployment gate.
- Workstream D, reconciliation/webhooks/statistics: dependency-gated on API client. Owner: observability worker. Allowed files: new reconciliation/statistics modules or executor subfiles. Forbidden: order ownership changes and webhook settings mutation unless explicitly scoped. Expected output: read-only metrics and webhook event normalization plan/code. Validation: synthetic webhook/read tests.
- Workstream E, integration validation: final integration. Owner: current orchestrator. Shared files: Aukro module wiring, package test script if needed, `TASKS.md`, `graph/project_graph.example.yaml`, and validation report. Merge order: A, B, D, C, then E.

## Agent-Ready Prompts

### API Client Worker

Implement the official Aukro Public API client for TASK-014 in new official API client module files only. Use official OpenAPI v2 endpoints. Authenticate with `POST /authenticate` using `X-Aukro-Api-Key`, store bearer token in memory only, require both bearer and API key on protected calls, mask all secrets/tokens in errors/logs, and add typed methods for categories, category attributes, shipping templates, images/url upload, offer create/update/list/detail, webhook reads, and failed webhook count. Do not edit TASK-007, offers service, Prisma, k8s, trackers, or protected docs.

### Executor Worker

Implement TASK-014 executor gates and payload mapping in new executor module files only, depending on the public API client contract. Consume existing record-only publish attempt metadata as input evidence but preserve TASK-007 semantics. Build `OfferV2Request` from draft/catalog evidence, require policy/human approval/idempotency/category/shipping/media/location/rate-limit evidence, record separate execution metadata, and prevent duplicate live create by local idempotency replay.

### Config Worker

Prepare a config/secrets patch for TASK-014 without secret values. Add only env names and secret refs needed for official Aukro Public API credentials and base URL after owner confirms the external secret keys. Do not read or print secret values. Validate manifests and document missing refs with `[MISSING: ...]`.

### Observability Worker

Implement TASK-014 read-only reconciliation/statistics normalization from official `GET /offers-v2/list`, `GET /offers/{id}`, and webhook payloads. Keep customer/order raw data masked and do not change order lifecycle ownership. Webhook settings/subscription mutation remains outside this lane unless separately scoped.

## Documentation Updates

Update TASK-014 validation evidence as implementation progresses. Update `TASKS.md` and `graph/project_graph.example.yaml` only under integration-owner control after resolving current tracker changes from TASK-012 and TASK-013. Do not modify protected intent documents.

## Rollback Plan

Disable executor endpoint/worker by config flag and stop scheduling it. Because successful live offer creation is external, rollback must not delete or terminate offers automatically. Any live cleanup requires an explicit operator-approved terminate/update plan using official API and recorded Aukro offer ids.

## Agent Handoff Prompt

Implement TASK-014 as a separate official Aukro Public API executor. Preserve TASK-007 record-only publish intent, use only official Aukro Public API v2 endpoints, mask credentials and bearer tokens, keep direct-create idempotency local, fail closed on missing credentials or mapping evidence, and validate with synthetic tests plus IPS gates. Do not run live mutation without an approved test listing and cleanup plan.

## Completion Checklist

- [ ] TASK-014 IPS artifacts complete.
- [ ] Official API client implemented.
- [ ] Executor gates and payload mapping implemented.
- [ ] Credential/config refs present without secret values.
- [ ] Synthetic tests pass.
- [ ] Non-mutating connectivity check recorded.
- [ ] Live mutation remains disabled until explicit owner-approved test plan.
- [ ] Validation report complete.
