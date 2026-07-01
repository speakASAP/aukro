---
id: CP-TASK-014
status: reviewed
source_task: ../11_tasks/TASK-014-official-aukro-public-api-executor.md
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# CP-TASK-014 Official Aukro Public API Executor

## Target task

`TASK-014` in `11_tasks/TASK-014-official-aukro-public-api-executor.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-001-offer-management.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `10_features/FEAT-008-observability-reconciliation.md`, `16_operations/AUKRO_PLATFORM_RULES.md`, `11_tasks/TASK-005-catalog-sell-action-draft-model.md`, `11_tasks/TASK-007-publish-queue-reconciliation.md`, `11_tasks/TASK-012-catalog-content-preview-drafts.md`, `11_tasks/TASK-013-dashboard-bulk-publish-candidates.md`, and `22_goal_impact/GOAL-IMPACT-TASK-014.md`.

## Included documents

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent documents, the three upstream features, TASK-005 draft behavior, TASK-007 publish-intent behavior, TASK-012 content-preview behavior, TASK-013 dashboard/bulk behavior, platform rules, account/offer/order/workbench source, deployment env/secret-reference files, and official Aukro API documentation at `https://api.aukro.cz/` and `https://api.aukro.cz/assets/openapi.yaml`.

## Excluded documents

Runtime secret values, raw `.env` values, bearer tokens, API keys, passwords, raw production orders, raw customer identifiers, full live Aukro payload dumps, browser automation flows, scraper behavior, protected intent document edits, and unrelated TASK-012/TASK-013 implementation changes.

## Constraints

Keep TASK-014 separate from TASK-007. TASK-007 publish attempts remain local record-only intent. TASK-014 may consume those records as input evidence but must write separate execution metadata and must fail closed when credentials, mappings, approval, policy, idempotency, account, category, shipping, media, stock, price, location, or rate-limit evidence is missing.

Use only the official Aukro Public API. Do not use browser automation, scraping, removed legacy endpoints, hard-coded credentials, raw production data in tests, or automatic cleanup of live offers. Live mutation requires a separately approved test listing and cleanup plan.

## Agent prompt

Implement TASK-014 as a separate official Aukro Public API executor. Add a masked official API client, executor gates, offer payload mapping, local idempotency replay, image upload flow, read-only reconciliation/statistics, and synthetic tests. Preserve existing TASK-007 record-only semantics and existing catalog/warehouse/order ownership boundaries. If production credentials or mapping evidence are missing, report the missing evidence explicitly and keep mutation disabled.

## Validation instructions

Run `git diff --check`, `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-014`. Record masked non-mutating official API connectivity checks only when credentials are present. Do not run live mutation validation without an approved test listing.
