---
id: EP-TASK-015
status: reviewed
source_task: ../11_tasks/TASK-015-mp-xml-feed-executor.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: draft
vision: docs/01_vision/VISION.md
constitution: docs/00_constitution/CONSTITUTION.md
feature: docs/10_features/FEAT-005-catalog-warehouse-publisher.md
features:
  - docs/10_features/FEAT-001-offer-management.md
  - docs/10_features/FEAT-005-catalog-warehouse-publisher.md
  - docs/10_features/FEAT-008-observability-reconciliation.md
goal_impact: docs/22_goal_impact/GOAL-IMPACT-TASK-015.md
---
# EP-TASK-015 MP XML Feed Executor

## Metadata

Owner: Engineering. Status: planned. Source task: TASK-015. Lifecycle state: goal-driven implementation plan for a separate Aukro Manager Prodej XML feed fallback executor. This plan does not approve live MP automatic import activation.

## Upstream Traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/04_systems/SYS-001-aukro-service.md`
- `docs/10_features/FEAT-001-offer-management.md`
- `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`
- `docs/10_features/FEAT-008-observability-reconciliation.md`
- `docs/16_operations/AUKRO_PLATFORM_RULES.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-015.md`
- `docs/11_tasks/TASK-014-official-aukro-public-api-executor.md`
- Aukro MP automatic import UI: `https://mp.aukro.cz/sm/templates/importexport/automatic`
- Aukro MP transaction export UI: `https://mp.aukro.cz/sm/transactions/importexport/export/0`

## Goal Impact

The plan creates a fallback bridge from approved local catalog products to a validated MP XML feed. It preserves the official Public API executor as the preferred live-publication lane and avoids conflating UI/feed import with WebAPI execution. The inspected transaction export page is a possible read/statistics source for a separate workstream, not a product publication mechanism.

## Project Invariants

- AUKRO-INV-001: Add the TASK-015 IPS package before runtime edits.
- AUKRO-INV-002: Never include unvalidated catalog products or products with failed policy evidence in the feed.
- AUKRO-INV-003: Keep catalog, warehouse, media, order, and marketplace ownership boundaries intact.
- AUKRO-INV-004: Keep secrets, raw customer identifiers, raw orders, and full live payload dumps out of docs/prompts/tests/logs.
- AUKRO-INV-005: Runtime feed endpoint controls remain in secret/config references, never hard-coded values.
- AUKRO-INV-006: Add validation evidence before closure or deploy.

## MP Feed Contract Plan

- Generate `ExportFromSM` -> `Templates` -> `Template` XML.
- Use `Manažer prodeje - XML` as the first target template.
- Use stable catalog-derived `ExternalId` as the primary update key.
- Map approved catalog fields to `Name`, `Description`, `Quantity`, `QuantityUnit`, `Duration`, `BuyNowPrice` or `StartingPrice`, `OfferType`, `CategoryId`, `Place`, `Shipment`, `Field`, and `Images`.
- Keep feed size below `10 MB` and product count below `10000`.
- Serve the feed only over public `https` on port `443` or `http` on port `80` where explicitly approved; prefer `https`.
- Ensure image URLs are public, stable, and not localhost/private network URLs.
- Generate deterministic XML ordering and a checksum for replay/debugging.
- Keep missing-template removal disabled unless a separate cleanup task approves it.

## Transaction Export Finding

The MP transaction export page supports manual XML export by date/section/parameter selection, automatic export by email, saved export templates, and report history. It currently shows no saved export templates and no reports for the inspected account state. This can support later orders/statistics reconciliation, but it does not provide API credentials and does not publish products.

## Contract Validation Plan

Use synthetic XML fixtures to validate buy-now and auction products, images, XML escaping, missing required evidence failures, feed-size/product-count blocking, deterministic checksum, disabled public endpoint, and masked feed statistics.

## Scope

1. MP XML generator contract and test fixtures.
2. Catalog-to-MP mapping layer with fail-closed field validation.
3. Feed generation command/service that writes masked statistics and checksum metadata.
4. Disabled-by-default public feed endpoint or static-feed publication mechanism.
5. Operator readiness endpoint/report for feed URL, size, product count, blocked products, and checksum.
6. MP import activation runbook and rollback plan.
7. Separate future statistics/orders workstream for MP transaction export or official API/webhooks.
8. Validation report.

## Non-Goals

No TASK-014 Public API code changes, no TASK-007 semantic changes, no browser automation for live mutation, no automatic MP UI configuration, no raw secret values, no live offer deletion/termination, no protected intent document edits, and no deployment until feed URL/security/rollback evidence exists.

## Implementation Steps

1. Complete TASK-015 IPS docs and validation shell.
2. Add MP XML type/model contract and synthetic fixtures.
3. Add catalog-to-MP mapper with fail-closed required-field checks.
4. Add deterministic XML serializer with escaping, stable ordering, product-count and byte-size limits.
5. Add feed generation service with checksum, diff, blocked-product report, and masked statistics.
6. Add disabled-by-default public feed endpoint or publication mechanism using owner-approved host/access strategy.
7. Add operator readiness endpoint/report for feed health and activation prerequisites.
8. Add MP import activation runbook documenting exact UI settings, rollback, and approval evidence.
9. Run tests, build, strict audit, pre-coding gate, deployment-readiness gate, and `git diff --check`.
10. Activate MP import only in a separate operator-approved task with exact URL/template/settings/rollback evidence.

## Parallel Execution Section

- Workstream A, XML contract and fixtures: ready now. Owner: feed contract worker. Allowed files: new MP feed contract/test fixture files only. Forbidden: TASK-014, TASK-007, k8s, graph. Expected output: synthetic fixtures and serializer acceptance tests. Validation: targeted tests.
- Workstream B, catalog mapping and fail-closed checks: dependency-gated on A. Owner: mapper worker. Allowed files: new MP feed mapper files only. Forbidden: Prisma schema and official API client behavior. Expected output: mapper from catalog draft evidence to MP template model. Validation: mapper specs.
- Workstream C, feed publication/readiness: dependency-gated on A and public URL strategy. Owner: platform worker. Allowed files after approval: feed endpoint/config files and k8s non-secret refs. Forbidden: secret values and live MP UI changes. Expected output: disabled-by-default endpoint/readiness report. Validation: endpoint tests and manifest parse.
- Workstream D, MP activation runbook/statistics: ready as documentation, live activation blocked. Owner: operations worker. Allowed files: operations/runbook and validation report. Forbidden: runtime code and browser automation. Expected output: exact UI settings checklist, rollback, masked stats contract. Validation: doc audit.
- Workstream E, integration validation: final integration. Owner: current orchestrator. Shared files: module wiring, graph, validation report. Merge order: A, B, C, D, then E.

## Agent-Ready Prompts

### Feed Contract Worker

Implement the TASK-015 MP XML feed contract in new bounded files only. Create synthetic fixtures for buy-now and auction products, define the internal template model, and add serializer tests for `ExportFromSM` XML, escaping, stable ordering, checksum determinism, `ExternalId`, images, shipment, category, price, quantity, and limit checks. Do not edit TASK-014, TASK-007, k8s, graph, or protected docs.

### Mapper Worker

Implement the TASK-015 catalog-to-MP mapper in new MP feed files only. Map approved catalog draft evidence to the internal MP template model and fail closed on missing policy, human approval, category, shipment/pricelist, price, stock, description, public media URL, or account mapping evidence. Do not change source-system ownership or official Public API executor behavior.

### Publication Worker

Prepare the disabled-by-default public feed endpoint/readiness surface for TASK-015 after the public URL and access-control strategy are approved. Expose only XML feed bytes, checksum, product count, blocked reason counts, and readiness state. Do not put secret values in URLs, logs, docs, tests, or manifests.

### Operations Worker

Write the TASK-015 MP activation runbook and statistics checklist. Include the exact Aukro MP automatic import settings, transaction-export finding, rollback plan, missing-template removal warning, and evidence required before activation. Do not activate the UI or perform live marketplace mutation.

## Rollback Plan

Disable the feed endpoint/publication config and keep the last generated checksum for audit. Do not remove live offers automatically. Any MP feed cleanup, running-offer update, or missing-template removal action requires explicit operator approval and a separate task.

## Files to Inspect

- `AGENTS.md`, `AGENT_OPERATIONS.md`
- `docs/16_operations/AUKRO_PLATFORM_RULES.md`
- `docs/11_tasks/TASK-005-catalog-sell-action-draft-model.md`
- `docs/11_tasks/TASK-007-publish-queue-reconciliation.md`
- `docs/11_tasks/TASK-012-catalog-content-preview-drafts.md`
- `docs/11_tasks/TASK-013-dashboard-bulk-publish-candidates.md`
- `docs/11_tasks/TASK-014-official-aukro-public-api-executor.md`
- `services/aukro-service/src/aukro/offers/*`
- `services/aukro-service/src/aukro/workbench/*`
- `services/aukro-service/src/aukro/executor/*`
- `services/aukro-service/src/aukro/public-api/*`
- `shared/clients/*`
- `prisma/schema.prisma`
- `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `k8s/deployment.yaml`

## Files to Create

- MP XML generator module files under a new bounded executor/feed namespace.
- MP XML generator fixture tests.
- Optional feed readiness/controller files after endpoint design approval.
- Optional operations runbook for MP activation settings and rollback.
- Validation report updates in `docs/12_validation/VAL-TASK-015-mp-xml-feed-executor.md`.

## Files to Modify

- `services/aukro-service/src/aukro/aukro.module.ts` only when wiring the module.
- `k8s/configmap.yaml`, `k8s/external-secret.yaml`, and `k8s/deployment.yaml` only for non-secret feed config names and owner-confirmed secret refs.
- `graph/project_graph.example.yaml` under integration-owner control.
- `docs/12_validation/VAL-TASK-015-mp-xml-feed-executor.md` during validation.

## Files That Must Not Be Modified

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- TASK-014 Public API executor behavior unless a later integration task explicitly depends on it.
- TASK-007 record-only enqueue behavior.
- Secret value files, raw `.env` values, production credential dumps, and unrelated task files.

## Test Plan

For runtime implementation:

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
```

Add targeted fixture tests for XML mapping, serialization, deterministic checksum, blocked products, disabled feed endpoint, and masked statistics. Documentation-only setup requires graph YAML parse, strict doc audit, pre-coding gate, deployment-readiness gate targeting TASK-015, and `git diff --check`.

## Validation Plan

- XML well-formedness checks against generated fixtures.
- Feed limit checks: max `10 MB`, max `10000` products.
- Public URL readiness check without exposing secret tokens.
- Strict doc audit.
- Pre-coding gate.
- Deployment-readiness gate for TASK-015.
- `git diff --check`.
- Live MP import only with separately approved settings and rollback plan.

## Documentation Updates

Update TASK-015 validation evidence as implementation progresses. Keep TASK-014 documentation intact except for cross-references that explicitly state separation. Do not modify protected intent documents.

## Agent Handoff Prompt

Implement TASK-015 as a separate MP XML feed fallback executor. Generate deterministic `Manažer prodeje - XML` from canonical catalog data using stable `ExternalId`, fail closed on missing evidence, keep the public feed disabled until approved, record masked feed statistics, treat MP transaction export as a separate read/statistics source, and do not change TASK-014 official API or TASK-007 record-only semantics.

## Completion Checklist

- [ ] TASK-015 IPS artifacts complete.
- [ ] MP XML contract and fixtures implemented.
- [ ] Catalog mapper and fail-closed gates implemented.
- [ ] Public feed endpoint/readiness disabled by default.
- [ ] Feed statistics and blocked-product report implemented.
- [ ] Transaction export statistics lane is either separated into its own task or explicitly excluded.
- [ ] Synthetic tests pass.
- [ ] Live MP import remains blocked until explicit owner-approved settings and rollback plan.
- [ ] Validation report complete.
