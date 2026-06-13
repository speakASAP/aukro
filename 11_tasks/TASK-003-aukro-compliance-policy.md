---
id: TASK-003
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-004-aukro-compliance-policy.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-003.md
execution_plan:
  - ../21_execution_plans/EP-TASK-003-aukro-compliance-policy.md
---
# TASK-003: Implement Aukro Compliance Policy

## Objective

Create the FEAT-004 backend compliance policy foundation that evaluates Aukro offer draft and publish readiness before any live marketplace mutation.

## Upstream Links

`01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `09_milestones/MS-003-ai-commerce-platform.md`, and `10_features/FEAT-004-aukro-compliance-policy.md`.

## Goal Impact

See `22_goal_impact/GOAL-IMPACT-TASK-003.md`. This task protects account health and enables future automation by making marketplace publication decisions explicit, auditable, and fail-closed.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation preserves traceability, keeps catalog and warehouse as source systems, avoids secrets/raw production data, and adds validation evidence before closure.

## Sensitive-Data Classification

Classification: synthetic. Tests and examples use synthetic offer IDs, policy evidence, and masked actor references only. No secrets, live tokens, raw customer/order data, or production payload exports are used.

## Contract/Schema Impact

Adds a backend policy-check API contract and service DTOs. No Prisma schema, Kubernetes manifest, secret file, or live Aukro API contract is changed.

## Replay/Determinism Impact

Policy evaluation is deterministic for a given evidence snapshot and clock. Publish readiness requires idempotency evidence, but this task does not create a publish queue or live mutation path.

## Scope

- Add backend offer policy DTOs/types, policy service, and Nest module wiring.
- Add `POST /offers/:id/policy-check` for draft or publish readiness evaluation.
- Attach draft-readiness policy snapshots to create, update, and sync responses.
- Add unit-style policy tests with synthetic fixtures.
- Add validation and traceability documents.

## Non-Goals

- No live Aukro offer create, update, delete, or publish behavior.
- No Prisma migration or persistent policy table.
- No UI work, scraping, bypassing marketplace controls, or ownership changes for catalog, warehouse, orders, or secrets.

## Acceptance Criteria

- [x] Policy evaluation returns `allowed: false` with machine-readable reason codes when required evidence is missing, stale, or failing.
- [x] Policy evaluation returns `allowed: true` only when all required evidence is fresh and passing.
- [x] Draft readiness covers catalog, account/API, category, required parameters, media, stock, price/margin, duplicate, and AI-risk evidence.
- [x] Publish readiness additionally requires human approval, rate-limit readiness, and idempotency readiness.
- [x] Tests cover every gate family and combined failure cases.
- [x] No live Aukro API mutation is added.

## Required Context

`AGENTS.md`, `00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `17_governance/PROJECT_INVARIANTS.md`, `08_roadmap/AI_COMMERCE_ROADMAP.md`, `10_features/FEAT-004-aukro-compliance-policy.md`, `14_prompts/PROMPT-TASK-003-aukro-compliance-policy.md`, `16_operations/INTEGRATIONS.md`, and the existing offer service/controller files.

## Validation Task

Create `12_validation/VAL-TASK-003-aukro-compliance-policy.md`, run the policy tests, TypeScript build, strict doc audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root .`.

## Execution Plan Requirement

Use `21_execution_plans/EP-TASK-003-aukro-compliance-policy.md` before coding.
