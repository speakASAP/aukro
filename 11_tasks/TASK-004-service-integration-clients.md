---
id: TASK-004
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-009-service-integration-clients.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-004.md
execution_plan:
  - ../21_execution_plans/EP-TASK-004-service-integration-clients.md
---
# TASK-004: Implement Service Integration Clients

## Objective

Add missing optional Alfares ecosystem clients and contract tests needed by FEAT-009 without changing live Aukro offer, stock, order, or payment behavior.

## Upstream Links

`01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-009-service-integration-clients.md`, and `16_operations/INTEGRATIONS.md`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-004.md`. This task prepares safe future AI selling, approval, media, lead, marketing, payment, supplier, notification, and logging integrations.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The clients preserve source-system ownership, avoid secrets, use masked logging, and degrade gracefully when optional services are unavailable.

## Sensitive-Data Classification

Classification: synthetic. Contract tests use synthetic product IDs, event names, and masked notification/log payloads. No raw customer data, tokens, secrets, or live service responses are included.

## Contract/Schema Impact

Adds internal client contract wrappers and documentation for optional downstream endpoints. No database schema, external service implementation, secret value, or live marketplace contract is changed.

## Replay/Determinism Impact

Client contract tests are deterministic with mocked HTTP responses. No queue replay or idempotent mutation path is implemented.

## Scope

- Add optional clients for AI, leads, marketing, minio/media, notifications, payments, suppliers, and logging events.
- Register clients in `ClientsModule` and shared exports.
- Add mocked contract tests for success, unavailable service fallback, health checks, and log masking.
- Document env vars, default URLs, timeout behavior, and contract versions.
- Add non-secret env keys to `.env.example` and Kubernetes ConfigMap defaults.

## Non-Goals

- No domain logic migration from downstream services.
- No live external calls in tests.
- No secret values or credential storage changes.
- No publish queue, AI proposal workflow, or UI.

## Acceptance Criteria

- [x] Each missing ecosystem service has an injectable client and documented base URL env var.
- [x] Optional clients return masked unavailable results instead of throwing on downstream failure.
- [x] Contract tests cover successful payload shape, health check, graceful failure, and masking.
- [x] Shared module exports include the new clients.

## Required Context

`AGENTS.md`, protected intent docs, `10_features/FEAT-009-service-integration-clients.md`, `16_operations/INTEGRATIONS.md`, `shared/clients/*`, and `shared/resilience/*`.

## Validation Task

Create `12_validation/VAL-TASK-004-service-integration-clients.md`, run shared tests/build, service build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix shared test`; `npm --prefix shared run build`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root .`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-004-service-integration-clients.md` before coding.
