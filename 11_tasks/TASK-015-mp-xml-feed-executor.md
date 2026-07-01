---
id: TASK-015
status: in_progress
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: partial
upstream:
  - ../10_features/FEAT-001-offer-management.md
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
  - ../10_features/FEAT-008-observability-reconciliation.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-015.md
execution_plan:
  - ../21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md
---
# TASK-015: MP XML Feed Executor

## Objective

Create a separate fallback executor lane that generates an Aukro Manager Prodej automatic import XML feed from approved catalog products. This lane is separate from TASK-014 Official Aukro Public API Executor and must not replace, extend, or weaken the official WebAPI/Public API path.

## Upstream Links

`01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-001-offer-management.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `10_features/FEAT-008-observability-reconciliation.md`, `16_operations/AUKRO_PLATFORM_RULES.md`, TASK-005/TASK-007/TASK-012/TASK-013/TASK-014 packages, and the Aukro MP automatic import UI at `https://mp.aukro.cz/sm/templates/importexport/automatic`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-015.md`. This task gives the team a controlled feed-based fallback for catalog publication while official API credentials remain blocked or incomplete.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The feed executor must preserve catalog validation, policy checks, human approval, source-system ownership, idempotency, masked evidence, and deployment validation. It must not store secrets or raw production/customer data in docs, tests, logs, or reports.

## Sensitive-Data Classification

Classification: production-sensitive for live feed URLs, marketplace responses, credentials, and seller/account state; synthetic/masked for documentation and tests. Store only feed configuration references, checksums, product ids, external ids, normalized status/error codes, and masked scheduler evidence.

## Aukro MP Contract Snapshot

Source checked on 2026-07-01 from `https://mp.aukro.cz/sm/templates/importexport/automatic` and the sample XML linked from that UI.

- Automatic import supports import templates including `Manažer prodeje - XML` and `Heureka - XML`.
- Import file URL must use `http` or `https` on port `80` or `443`.
- Maximum file size is `10 MB` and maximum product count is `10000`.
- The form supports periodic basic-template updates, daily import of new templates around `03:20`, optional update of running Aukro offers, and optional removal of missing templates when enabled by account settings.
- MP XML root shape is `ExportFromSM` -> `Templates` -> `Template`.
- Matching keys include `Id`, `Guid`, and `ExternalId`; the executor must use stable catalog-derived `ExternalId` for idempotent updates.
- Offer/template fields include `Name`, `Signature`, `ExternalId`, `CatalogId`, `CategoryId`, `Description`, `Quantity`, `QuantityUnit`, `Duration`, `StartingPrice`, `BuyNowPrice`, `OfferType`, `AutoExpose`, `PricelistId`, `TransportCostPayer`, `Highlights`, `Place`, `Shipment`, `Field`, and `Images`.
- Description may contain XML-encoded HTML. Images must resolve from public HTTP/HTTPS URLs; localhost, private network URLs, and unstable signed URLs are not acceptable for production feed validation.

## Scope

- Add an MP XML feed executor plan and implementation lane separate from TASK-014.
- Generate MP XML from canonical catalog/product draft data, not from marketplace HTML as canonical source.
- Use stable catalog SKU/product id as `ExternalId` and persist feed checksums for deterministic regeneration.
- Serve the generated XML through a guarded public HTTPS URL suitable for Aukro MP automatic import constraints.
- Add dry-run XML generation, validation, diff, and checksum reporting before any public feed URL is enabled.
- Add operator controls to enable/disable feed publication per account and environment.
- Record feed statistics: product count, byte size, checksum, blocked products, mapping gaps, last generated time, last public URL status, and last MP import evidence when available.

## Non-Goals

- No use of MP XML import as the official Public API executor.
- No changes to TASK-014 official API client/executor semantics.
- No browser automation for live offer mutation.
- No automatic activation of the MP automatic import UI.
- No exposing public feed URLs before approval, access-control strategy, product mapping validation, and rollback plan exist.
- No deletion/removal of live offers through missing-feed behavior without a separate cleanup approval.
- No protected intent document changes.

## Acceptance Criteria

- [ ] TASK-015 artifacts make the MP XML feed executor a separate fallback lane, not an extension of TASK-014.
- [ ] Executor generates deterministic `Manažer prodeje - XML` from catalog data with stable `ExternalId` values.
- [ ] Feed generation fails closed when policy, human approval, category, price, stock, shipping/pricelist, media URL, description, or account mapping evidence is missing.
- [ ] Generated feed remains under `10 MB` and `10000` products or reports explicit blocking evidence.
- [ ] Generated XML is well-formed, XML-escaped, and covered by synthetic fixtures for auction and buy-now products.
- [ ] Public feed endpoint is disabled by default and requires explicit account/environment config.
- [ ] Feed statistics and blocked-product reports are available without exposing raw secrets/customer data.
- [ ] Live MP automatic import remains unconfigured until an operator approves the exact URL, import template, update settings, and rollback plan.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `16_operations/AUKRO_PLATFORM_RULES.md`, TASK-005/TASK-007/TASK-012/TASK-013/TASK-014 packages, account/offer/workbench/media modules, product catalog and warehouse integration contracts, MP automatic import UI and sample XML evidence, and MP transaction export UI evidence.

## Current Blockers

- [MISSING: final public HTTPS feed URL host and access-control strategy]
- [MISSING: complete catalog-to-Aukro MP category/field/shipment/pricelist mapping]
- [MISSING: confirmation that the account can enable running-offer updates in MP automatic import]
- [MISSING: operator-approved MP import settings and rollback plan]
- [MISSING: production media URL readiness for all candidate products]
- [MISSING: official Public API key for TASK-014; TASK-015 is only a fallback lane while that remains blocked]

## Validation Task

Create and complete `12_validation/VAL-TASK-015-mp-xml-feed-executor.md`, run XML fixture tests, service tests/build if runtime code is added, strict doc audit, pre-coding gate, deployment-readiness gate targeting TASK-015, YAML parse if graph/config changes, and `git diff --check`. Live MP import validation requires a separately approved public feed URL and MP settings record.

## Required Gates

For documentation-only setup: `python3 -c/yaml.safe_load` for `graph/project_graph.example.yaml`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/deployment_readiness_gate.py --root . --target TASK-015`, and `git diff --check`.

For runtime implementation: add targeted XML generator tests, `npm --prefix services/aukro-service test`, and `npm --prefix services/aukro-service run build`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md` before coding. The plan does not approve live MP import activation; it only defines a safe, testable fallback lane.

## Implementation Start

Implementation started on 2026-07-01 as a separate XML generator worker lane. Initial runtime scope is limited to deterministic MP XML generation, catalog-to-MP mapping fixtures, feed statistics, and fail-closed validation. Public feed hosting, MP automatic import activation, running-offer updates, missing-template removal, and live marketplace mutation remain blocked.
