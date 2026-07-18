---
id: TASK-006
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../10_features/FEAT-006-ai-human-workbench.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-006.md
execution_plan:
  - ../21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md
---
# TASK-006: Implement AI Proposal Workflow With Human Approval

## Objective

Implement the first FEAT-006 backend slice: AI listing proposal creation for local drafts and an auditable human approve/reject/edit workflow without publishing to Aukro.cz.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/10_features/FEAT-006-ai-human-workbench.md`, `docs/16_operations/INTEGRATIONS.md`, and `docs/16_operations/SERVICE_CLIENT_CONTRACTS.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-006.md`. This task lets AI suggest improved draft content while preserving human accountability and marketplace safety.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. AI proposals remain advisory, human review is recorded, catalog/warehouse/policy gates are not bypassed, and no live marketplace mutation is added.

## Sensitive-Data Classification

Classification: synthetic. Tests use synthetic offer, catalog, AI, notification, and actor records. AI inputs are minimized to draft/product fields and do not include secrets, customer data, raw orders, or live Aukro payloads.

## Contract/Schema Impact

Adds local API DTOs for AI proposal and human review actions. Proposal and review metadata are stored in `AukroOffer.rawData`. No Prisma schema, Kubernetes manifest, secret, or external service schema change is required.

## Replay/Determinism Impact

AI proposal request IDs are deterministic from offer id and proposal target. Tests use deterministic mocked AI and notification clients.

## Scope

- Add AI proposal request/response and review DTOs.
- Add `POST /offers/:id/ai-proposals`.
- Add `POST /offers/:id/ai-proposals/:proposalId/review`.
- Store AI proposal records separately from current offer fields.
- Record human actor, timestamp, decision, edited fields, and diff.
- Notify approval requests through the optional notifications client on a fail-soft basis.
- Add synthetic tests for proposal creation, approval with edits, and rejection.

## Non-Goals

- No live Aukro publish call.
- No publish queue.
- No autonomous AI approval.
- No role service expansion beyond recording actor identity.
- No Prisma migration or UI work.

## Acceptance Criteria

- [x] AI proposals are stored separately under offer metadata and do not immediately overwrite offer fields.
- [x] Human approve/reject/edit records include actor, timestamp, decision, and diff.
- [x] Low-confidence or risky proposals remain review-required and cannot auto-publish.
- [x] AI or notification service unavailability is represented safely without throwing away local review state.
- [x] No live marketplace mutation is introduced.

## Required Context

`AGENTS.md`, protected intent docs, FEAT-006, TASK-005 draft model, offer service/controller, `AiClientService`, `NotificationsClientService`, and policy gates.

## Validation Task

Create `docs/12_validation/VAL-TASK-006-ai-proposal-human-approval.md`, run service tests/build, strict audit, pre-coding gate, and deployment-readiness gate.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-006`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md` before coding.
