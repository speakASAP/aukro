---
id: CP-TASK-008
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 11_tasks/TASK-008-revenue-analytics-events.md
downstream:
  - 14_prompts/PROMPT-TASK-008-revenue-analytics-events.md
related_adrs: []
---
# CP-TASK-008 Revenue Analytics And Cross-Service Events

## Target Task

`TASK-008` in `11_tasks/TASK-008-revenue-analytics-events.md`.

## Upstream Traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-007-ecosystem-revenue-optimization.md`, `21_execution_plans/EP-TASK-008-revenue-analytics-events.md`, TASK-004 service clients, TASK-006 AI/human approval, and TASK-007 publish/reconciliation metadata.

## Included Documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, AI_AGENT_RULES, FEAT-007, FEAT-008, INTEGRATIONS, SERVICE_CLIENT_CONTRACTS, offer service/controller, TASK-007 publish observability types, shared logging client, and synthetic offer service tests.

## Excluded Documents

Secret files, raw production orders, buyer/customer identifiers, buyer messages, live Aukro payloads, tokens, credentials, live service logs, and protected intent document edits.

## Constraints

Record local analytics metadata and masked recommendation events only. Do not publish to Aukro.cz, change live price, write to catalog/marketing/supplier/payment services, add a BI warehouse, add schema migrations, change secrets, or change Kubernetes manifests.

## Agent Prompt

Implement `POST /offers/:id/revenue-analytics` with masked metric snapshots, blocked revenue evidence, explainable recommendation events, optional logging delivery, rawData persistence, and synthetic tests.

## Validation Instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, inspect git diff, and update the TASK-008 validation report with evidence.
