---
id: FEAT-005
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/09_milestones/MS-003-ai-commerce-platform.md
  - docs/08_roadmap/AI_COMMERCE_ROADMAP.md
downstream: []
related_adrs: []
---
# FEAT-005 Catalog And Warehouse Publisher

## User or system need

Catalog and warehouse workflows need a safe way to create Aukro drafts and request publication without manual aukro.cz login.

## Goal

Create a draft-first sell pipeline that converts eligible catalog products with available stock into reviewed Aukro publication requests.

## Scope

- Catalog sell action endpoint.
- Draft reuse for existing product/account combinations.
- Stock and price eligibility checks.
- Category and parameter mapping with human-review fallback.
- Warehouse stock updates reflected in local Aukro drafts/offers.
- Explicit approval before publish queue entry.

## Non-goals

- Do not duplicate catalog product storage.
- Do not reserve or decrement stock outside warehouse/order policies.
- Do not publish when catalog, stock, price, media, or category data is incomplete.

## Acceptance criteria

- POST /offers/from-catalog creates or reuses a local draft.
- Zero stock, missing price, missing media, and ambiguous category block publication.
- Draft status and blockers are queryable by catalog or operator UI.

## Dependencies

catalog-microservice, warehouse-microservice, minio-microservice, auth-microservice, notifications-microservice.

## Validation strategy

Mocked catalog/warehouse contract tests, draft idempotency tests, policy integration tests, and IPS gates.

## Traceability

docs/09_milestones/MS-003-ai-commerce-platform.md, docs/08_roadmap/AI_COMMERCE_ROADMAP.md, and docs/04_systems/SYS-001-aukro-service.md.

## Validation

Feature changes require task-specific validation reports under docs/12_validation/ plus strict documentation audit, pre-coding gate, deployment-readiness gate, and relevant unit or contract tests.
