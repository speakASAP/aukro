---
id: TASK-011
status: reviewed
owner: Engineering
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
upstream:
  - ../10_features/FEAT-004-aukro-compliance-policy.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-011.md
execution_plan:
  - ../21_execution_plans/EP-TASK-011-document-aukro-platform-rules.md
---
# TASK-011: Document Aukro Platform Rules

## Objective

Convert the official Aukro rules reviewed on 2026-06-29 into repository-owned automation boundaries so `aukro-service` can prepare and publish listings without violating Aukro terms, crawler restrictions, listing-content rules, privacy rules, or prohibited-goods policy.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-004-aukro-compliance-policy.md`, `docs/11_tasks/TASK-003-aukro-compliance-policy.md`, and official Aukro legal/rules pages listed in `docs/16_operations/AUKRO_PLATFORM_RULES.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-011.md`. This task protects account health and preserves automation viability by making platform restrictions visible to operators and backend policy gates.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The task preserves traceability, documents marketplace constraints, avoids secrets/raw production data, and keeps live mutation blocked until required evidence exists.

## Sensitive-Data Classification

Classification: public-source documentation plus synthetic validation evidence. No secrets, live Aukro tokens, raw customer/order data, production exports, or private user data are included.

## Contract/Schema Impact

No API schema, Prisma schema, Kubernetes manifest, secret file, or live Aukro integration contract is changed. Adds documentation and a policy-code comment that preserves existing behavior.

## Replay/Determinism Impact

No runtime behavior changes. The policy boundary remains deterministic for a given evidence snapshot and continues to require idempotency before publish readiness.

## Scope

- Review official Aukro terms, prohibited/conditional goods, privacy, cookies, and `robots.txt` boundaries.
- Document allowed automation, hard prohibitions, WebAPI gaps, listing-content constraints, privacy/cookie constraints, and engineering gates.
- Add a targeted code comment in `OfferPolicyService` linking platform terms to fail-closed publish evidence.
- Register the task in `TASKS.md` and the project graph.
- Record validation evidence.

## Non-Goals

- No live Aukro API mutation, browser automation, scraping, crawling, account login, or deployment.
- No legal opinion or replacement for counsel review.
- No changes to pricing, warehouse, catalog, AI proposal generation, queueing, or UI workflows.

## Acceptance Criteria

- [x] Official Aukro source URLs and review date are recorded.
- [x] Automation hard stops are documented clearly enough for future engineers and agents.
- [x] WebAPI uncertainty is documented as a concrete missing-evidence gap instead of guessed.
- [x] Listing-content, prohibited-goods, privacy, cookie, and robots boundaries are captured.
- [x] Backend policy code includes a concise source-linked guardrail comment.
- [x] Validation evidence is recorded without using secrets or live production payloads.

## Required Context

`AGENTS.md`, `docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/17_governance/PROJECT_INVARIANTS.md`, `docs/10_features/FEAT-004-aukro-compliance-policy.md`, `docs/11_tasks/TASK-003-aukro-compliance-policy.md`, `docs/16_operations/AUKRO_PLATFORM_RULES.md`, and `services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts`.

## Validation Task

Create `docs/12_validation/VAL-TASK-011-document-aukro-platform-rules.md`, run whitespace diff checks, TypeScript build, and strict documentation audit.

## Required Gates

`git diff --check`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-011-document-aukro-platform-rules.md` before future edits to this rulebook or code guardrail.
