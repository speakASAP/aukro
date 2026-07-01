---
id: CP-TASK-015
status: planned
source_task: ../11_tasks/TASK-015-mp-xml-feed-executor.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: draft
---
# CP-TASK-015 MP XML Feed Executor

## Target task

`TASK-015` in `11_tasks/TASK-015-mp-xml-feed-executor.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-001-offer-management.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `10_features/FEAT-008-observability-reconciliation.md`, `16_operations/AUKRO_PLATFORM_RULES.md`, TASK-005/TASK-007/TASK-012/TASK-013/TASK-014, and `22_goal_impact/GOAL-IMPACT-TASK-015.md`.

## Included documents

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent documents, upstream features, TASK-005 draft behavior, TASK-007 publish-intent behavior, TASK-012 content-preview behavior, TASK-013 dashboard/bulk behavior, TASK-014 official API executor boundary, platform rules, account/offer/workbench/media source, deployment env/secret-reference files, Aukro MP automatic import evidence from `https://mp.aukro.cz/sm/templates/importexport/automatic`, and Aukro MP transaction export evidence from `https://mp.aukro.cz/sm/transactions/importexport/export/0`.

## Excluded documents

Runtime secret values, raw `.env` values, bearer tokens, API keys, passwords, raw production orders, raw customer identifiers, full live Aukro payload dumps, browser automation flows, scraper behavior, protected intent document edits, and unrelated implementation changes.

## Constraints

Keep TASK-015 separate from TASK-014 and TASK-007. TASK-014 remains the official Public API executor. TASK-007 publish attempts remain local record-only intent. TASK-015 may consume approved catalog/draft records as source evidence but must generate a separate MP XML feed artifact and must fail closed when credentials, mappings, approval, policy, account, category, shipment/pricelist, media URL, stock, price, description, or feed publication evidence is missing.

Do not activate MP automatic import, update running offers, or remove missing templates without a separate operator-approved task. Treat MP transaction export as a read/statistics source, not a product publication path.

## Agent prompt

Implement TASK-015 as a separate Aukro Manager Prodej XML feed fallback executor. Generate deterministic `ExportFromSM` XML from canonical catalog data, use stable `ExternalId` values, enforce feed limits, expose masked feed statistics, keep the public feed disabled by default, and preserve TASK-014 official API and TASK-007 record-only semantics. If public URL strategy, mapping evidence, or approval is missing, report the concrete blocker and keep live activation blocked.

## Validation instructions

Run `git diff --check`, targeted XML fixture tests, `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-015` when runtime code is added. For documentation-only setup, run YAML parse, strict doc audit, pre-coding gate, deployment-readiness gate targeting TASK-015, and `git diff --check`.
