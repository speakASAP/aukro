---
id: GOAL-IMPACT-TASK-015
artifact_type: task
artifact_id: TASK-015
artifact_path: ../11_tasks/TASK-015-mp-xml-feed-executor.md
primary_goal: GOAL-AUKRO-001
secondary_goals:
  - FEAT-001
  - FEAT-005
  - FEAT-008
impact_level: medium
impact_description: Adds a separate MP XML feed fallback lane so approved catalog products can be prepared for Aukro Manager Prodej automatic import while official Public API access remains pending.
success_metric: Approved catalog products can be rendered into deterministic, validated MP XML with stable ExternalId values, masked feed statistics, and no automatic live import activation.
upstream_links:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-aukro-service.md
  - ../10_features/FEAT-001-offer-management.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../10_features/FEAT-008-observability-reconciliation.md
downstream_links:
  - ../21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md
validation_method: Synthetic XML fixtures, XML well-formedness checks, feed size and product count gates, strict IPS gates, and separately approved MP import evidence before live activation.
status: planned
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: draft
---
# Goal Impact: TASK-015 MP XML Feed Executor

## Explanation

TASK-015 exists because Aukro Manager Prodej exposes an automatic import path, but that path must remain separate from the official Public API executor in TASK-014. TASK-014 remains the preferred WebAPI/Public API lane for live publication and statistics. TASK-015 is a fallback lane that can generate a validated XML feed from canonical catalog data when official API credentials are not yet available or when MP import is deliberately chosen for a bounded product batch.

The task advances the product goal by reducing manual marketplace data entry while preserving catalog ownership, policy gates, human approval, idempotency, and masked observability. It does not approve live MP import activation by itself.

## Evidence

- Vision: `01_vision/VISION.md` requires safe Aukro account, offer, stock, and order integration.
- System boundary: `04_systems/SYS-001-aukro-service.md` identifies Aukro, catalog, warehouse, media, and secrets as integration boundaries.
- Offer management: `10_features/FEAT-001-offer-management.md` requires offer operations within marketplace boundaries.
- Catalog publisher: `10_features/FEAT-005-catalog-warehouse-publisher.md` requires draft-first catalog publication.
- Observability: `10_features/FEAT-008-observability-reconciliation.md` requires mutation attempt traceability, reconciliation, and alertable failures.
- Existing publish intent: `11_tasks/TASK-007-publish-queue-reconciliation.md` records publish intent but forbids live mutation.
- Official API lane: `11_tasks/TASK-014-official-aukro-public-api-executor.md` remains separate and preferred for WebAPI/Public API live mutation.
- MP import source: `https://mp.aukro.cz/sm/templates/importexport/automatic` documents the automatic feed-import UI and constraints.
- MP transaction export source: `https://mp.aukro.cz/sm/transactions/importexport/export/0` exposes transaction XML export and automatic email export, useful for a later statistics/orders source but not for product publication.

## Validation

Success will be validated by synthetic XML fixtures, XML well-formedness checks, feed-size and product-count checks, TypeScript build/tests when runtime code is added, strict documentation audit, pre-coding gate, deployment-readiness gate targeting TASK-015, `git diff --check`, and separately approved MP import evidence before any live feed activation.

## Traceability

Vision -> `01_vision/VISION.md` -> System -> `04_systems/SYS-001-aukro-service.md` -> Features -> `10_features/FEAT-001-offer-management.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `10_features/FEAT-008-observability-reconciliation.md` -> Task -> `11_tasks/TASK-015-mp-xml-feed-executor.md` -> Execution Plan -> `21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md` -> Coding Prompt -> `14_prompts/PROMPT-TASK-015-mp-xml-feed-executor.md` -> Code -> Validation -> `12_validation/VAL-TASK-015-mp-xml-feed-executor.md`.
