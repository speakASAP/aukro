---
id: CP-TASK-010
status: reviewed
owner: Engineering
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: complete
upstream:
  - docs/11_tasks/TASK-010-workbench-bulk-preview.md
downstream:
  - docs/14_prompts/PROMPT-TASK-010-workbench-bulk-preview.md
related_adrs: []
---
# CP-TASK-010 Workbench Bulk Preview API

## Target Task

`TASK-010` in `docs/11_tasks/TASK-010-workbench-bulk-preview.md`.

## Upstream Traceability

`docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/09_milestones/MS-003-ai-commerce-platform.md`, Stage 6 roadmap section, TASK-009 docs and validation report, and local workbench review queue contracts.

## Included Documents

AGENTS.md, AGENT_OPERATIONS.md, protected intent docs, PROJECT_INVARIANTS, AI_AGENT_RULES, roadmap Stage 6, workbench controller/service/types/tests, publish observability types, revenue analytics types, AI proposal types, catalog draft types, and existing synthetic tests.

## Excluded Documents

Secret files, raw production orders, buyer/customer identifiers, buyer messages, live Aukro payloads, tokens, credentials, live service logs, protected intent document edits, and UI assets.

## Constraints

Implement read-only preview only. Do not publish to Aukro.cz, approve/reject AI proposals, change live prices, write to catalog/marketing/supplier/payment services, reserve stock, forward orders, add schema migrations, change secrets, or change Kubernetes manifests.

## Agent Prompt

Implement `GET /workbench/bulk-preview` with optional account, item type, minimum-priority, and limit filters over existing safe workbench review items.

## Validation Instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, inspect git diff, and update the TASK-010 validation report with evidence.
