---
id: PROMPT-TASK-004
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 21_execution_plans/EP-TASK-004-service-integration-clients.md
  - 13_context_packages/CP-TASK-004-service-integration-clients.md
downstream: []
related_adrs: []
---
# PROMPT-TASK-004 Service Integration Clients

## Task summary

Implement FEAT-009 missing service clients and integration contracts for aukro-service.

## Execution plan link

Use `21_execution_plans/EP-TASK-004-service-integration-clients.md`.

## Role

AI coding agent implementing optional, fail-soft shared service clients for the Alfares ecosystem.

## Task

Add injectable clients for AI, leads, marketing, minio/media evidence, notifications, payments, suppliers, and logging events. Add contract tests and documentation.

## Context

Use FEAT-009, INTEGRATIONS, shared clients, shared resilience utilities, env examples, and Kubernetes ConfigMap.

## Allowed changes

TASK-004 docs, shared client code/tests, env key documentation, ConfigMap non-secret URL defaults, graph, and task tracker.

## Forbidden changes

Protected docs, secrets, live service payloads, Prisma schema, offer publish behavior, order ownership, and downstream service domain logic.

## Implementation instructions

Clients must expose contract versions, base URL env vars, timeout behavior, health checks, masked failure results, and no live calls in tests.

## Constraints

Optional revenue/AI services must degrade gracefully when unavailable. Do not create hard runtime dependency loops.

## Acceptance criteria

Shared tests pass, shared build passes, aukro-service build passes, IPS gates pass, and all client contracts are documented.

## Validation commands

`npm --prefix shared test`; `npm --prefix shared run build`; `npm --prefix services/aukro-service run build`; IPS gates.

## Validation

Record evidence in `12_validation/VAL-TASK-004-service-integration-clients.md`.
