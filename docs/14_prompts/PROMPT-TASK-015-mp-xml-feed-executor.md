---
id: PROMPT-TASK-015-mp-xml-feed-executor
status: planned
source_task: ../11_tasks/TASK-015-mp-xml-feed-executor.md
execution_plan: ../21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md
context_package: ../13_context_packages/CP-TASK-015-mp-xml-feed-executor.md
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: draft
---
# PROMPT-TASK-015: MP XML Feed Executor

## Role

Act as an aukro-service backend worker implementing one bounded fallback publication foundation under IPS governance. Preserve existing dirty worktree changes, do not revert other agents, and keep TASK-014 official Public API and TASK-007 record-only semantics intact.

## Task

Implement a separate Aukro Manager Prodej XML feed executor for approved catalog products. The executor must generate deterministic `ExportFromSM` XML, use stable catalog-derived `ExternalId` values, enforce MP feed limits, expose masked feed statistics, and keep public feed publication disabled until explicitly approved.

## Context

Use `docs/13_context_packages/CP-TASK-015-mp-xml-feed-executor.md`, `docs/21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md`, MP automatic import at `https://mp.aukro.cz/sm/templates/importexport/automatic`, MP transaction export at `https://mp.aukro.cz/sm/transactions/importexport/export/0`, TASK-005/TASK-007/TASK-012/TASK-013 behavior, TASK-014 official API executor boundary, and the existing account/offer/workbench/media modules.

## Constraints

Do not publish through TASK-014, change TASK-014 WebAPI behavior, change TASK-007 enqueue semantics, use browser automation for live mutation, scrape Aukro, hard-code secrets, expose bearer tokens/API keys/passwords, store raw customer/order data, modify protected intent documents, enable MP automatic import, update running offers, remove missing templates, or run live mutation without an approved public feed URL/settings/rollback plan.

## Acceptance criteria

- TASK-015 executor path is separate from TASK-014 official Public API and TASK-007 record-only publish intent.
- XML generation uses canonical catalog data and stable `ExternalId` values.
- Missing policy, human approval, category, shipment/pricelist, price, stock, description, public media URL, or account mapping evidence fails closed.
- Feed generation enforces `10 MB` and `10000` product limits.
- Generated XML is well-formed, XML-escaped, deterministic, and covered by synthetic fixtures.
- Public feed endpoint/publication is disabled by default and requires explicit config/approval.
- Feed statistics expose product count, byte size, checksum, blocked reason counts, and last generated timestamp without secrets.
- Transaction export support is treated as separate read/statistics input, not as product publication.
- Live MP automatic import remains blocked until exact settings and rollback plan are approved.

## Validation

Run `git diff --check`, targeted XML fixture tests, `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-015`. If only documentation is changed, run graph YAML parse plus the IPS gates and `git diff --check`.
