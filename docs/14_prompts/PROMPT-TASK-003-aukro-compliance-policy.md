---
id: PROMPT-TASK-003
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/21_execution_plans/EP-TASK-002-create-ai-commerce-roadmap.md
  - docs/13_context_packages/CP-TASK-002-create-ai-commerce-roadmap.md
downstream: []
related_adrs: []
---
# PROMPT-TASK-003 Aukro Compliance Policy

## Task summary

Draft prompt for the next implementation task: create TASK-003 and EP-TASK-003, then implement FEAT-004 Aukro compliance policy with backend gates and tests.

## Execution plan link

EP-TASK-003 must be created before coding. This draft derives from docs/21_execution_plans/EP-TASK-002-create-ai-commerce-roadmap.md.

## Role

AI coding agent implementing a narrowly scoped marketplace compliance foundation for aukro-service.

## Task

Create an Aukro-specific compliance policy and backend policy gate foundation that blocks unsafe publication before any live Aukro mutation.

## Context

Use docs/13_context_packages/CP-TASK-002-create-ai-commerce-roadmap.md, docs/08_roadmap/AI_COMMERCE_ROADMAP.md, docs/10_features/FEAT-004-aukro-compliance-policy.md, docs/16_operations/INTEGRATIONS.md, and docs/17_governance/PROJECT_INVARIANTS.md.

## Required context

AGENTS.md, docs/00_constitution/CONSTITUTION.md, docs/01_vision/VISION.md, docs/17_governance/PROJECT_INVARIANTS.md, docs/08_roadmap/AI_COMMERCE_ROADMAP.md, docs/10_features/FEAT-004-aukro-compliance-policy.md, docs/16_operations/INTEGRATIONS.md, services/aukro-service/src/aukro/offers/offers.service.ts, services/aukro-service/src/aukro/orders/orders.service.ts, and shared clients.

## Allowed changes

Only files approved by TASK-003 and EP-TASK-003. Expected areas are policy docs, DTOs, service classes, unit tests, and masked validation fixtures.

## Forbidden changes

Protected files under 00_constitution and 01_vision, runtime secrets, secret values, live Aukro publishing behavior, catalog ownership, warehouse ownership, orders ownership, and unrelated refactors.

## Implementation instructions

Build fail-closed backend policy gates for draft and publish readiness. Gates should cover catalog validation, account/API readiness, category mapping, required parameters, media readiness, stock availability, price and margin floor, duplicate risk, AI risk evidence, human approval, rate-limit readiness, and idempotency readiness.

## Constraints

AI output is advisory only. Missing or stale evidence blocks publication. No live Aukro offer may be created, updated, or deleted in this task. Prompts, tests, docs, and logs must not contain secrets or raw customer/order data.

## Acceptance criteria

Policy evaluation returns allowed false with reason codes when evidence is missing or failing. Policy evaluation returns allowed true only when all required evidence is fresh and valid. Tests cover each gate and combined failure cases. No live Aukro API mutation is added.

## Validation commands

npm test or the service-specific test command selected by EP-TASK-003; python3 scripts/pre_coding_gate.py --root .; python3 scripts/deployment_readiness_gate.py --root .

## Validation

Record evidence in docs/12_validation/VAL-TASK-003-aukro-compliance-policy.md and generated gate reports.

## Expected output

Files changed, tests run, validation evidence, deviations, and remaining documentation gaps.
