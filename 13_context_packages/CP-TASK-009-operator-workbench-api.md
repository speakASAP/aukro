---
id: CP-TASK-009
status: reviewed
owner: Engineering
created: 2026-06-14
last_updated: 2026-06-14
completeness_level: complete
upstream:
  - 11_tasks/TASK-009-operator-workbench-api.md
downstream:
  - 14_prompts/PROMPT-TASK-009-operator-workbench-api.md
related_adrs: []
---
# CP-TASK-009 Operator Workbench API

## Target Task

`TASK-009` in `11_tasks/TASK-009-operator-workbench-api.md`.

## Upstream Traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `09_milestones/MS-003-ai-commerce-platform.md`, Stage 6 roadmap section, TASK-005 through TASK-008 docs and validation reports, and local rawData contracts.

## Included Documents

AGENTS.md, AGENT_OPERATIONS.md, protected intent docs, PROJECT_INVARIANTS, AI_AGENT_RULES, roadmap Stage 6, offer/order/account service files, publish observability types, revenue analytics types, AI proposal types, catalog draft types, and existing synthetic tests.

## Excluded Documents

Secret files, raw production orders, buyer/customer identifiers, buyer messages, live Aukro payloads, tokens, credentials, live service logs, protected intent document edits, and UI assets.

## Constraints

Implement read-only aggregation only. Do not publish to Aukro.cz, approve/reject AI proposals, change live prices, write to catalog/marketing/supplier/payment services, reserve stock, forward orders, add schema migrations, change secrets, or change Kubernetes manifests.

## Agent Prompt

Implement `GET /workbench/summary`, `GET /workbench/review-queue`, and `GET /workbench/offers/:id` with safe local aggregation over accounts, offers, orders, and offer rawData metadata.

## Validation Instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, inspect git diff, and update the TASK-009 validation report with evidence.
