---
id: CP-TASK-004
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 11_tasks/TASK-004-service-integration-clients.md
downstream:
  - 14_prompts/PROMPT-TASK-004-service-integration-clients.md
related_adrs: []
---
# CP-TASK-004 Service Integration Clients

## Target task

`TASK-004` in `11_tasks/TASK-004-service-integration-clients.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-009-service-integration-clients.md`, `16_operations/INTEGRATIONS.md`, and `21_execution_plans/EP-TASK-004-service-integration-clients.md`.

## Included documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, FEAT-009, INTEGRATIONS, shared clients, shared resilience utilities, env examples, and Kubernetes ConfigMap.

## Excluded documents

Secret files, raw production payloads, customer/order data, tokens, credentials, and live service logs.

## Constraints

Add optional clients and contract tests only. Do not call live services in tests, add secrets, alter source-system ownership, or wire these clients into publish/order behavior yet.

## Agent prompt

Implement missing service integration clients with documented contracts, masked failures, health checks, and synthetic tests.

## Validation instructions

Run shared tests/build, aukro-service build, strict doc audit, pre-coding gate, deployment-readiness gate, and git diff review.
