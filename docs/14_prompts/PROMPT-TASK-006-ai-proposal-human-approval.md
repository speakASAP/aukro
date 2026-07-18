---
id: PROMPT-TASK-006-ai-proposal-human-approval
status: used
source_task: ../11_tasks/TASK-006-ai-proposal-human-approval.md
execution_plan: ../21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md
context_package: ../13_context_packages/CP-TASK-006-ai-proposal-human-approval.md
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
---
# PROMPT-TASK-006: AI Proposal Workflow With Human Approval

## Role

Act as an aukro-service backend engineer implementing a documented FEAT-006 task under IPS governance.

## Task

Implement advisory AI listing proposals and auditable human review actions for local Aukro drafts.

## Context

Use `CP-TASK-006`, `EP-TASK-006`, FEAT-006, TASK-005 draft metadata, offer service/controller, `AiClientService`, and `NotificationsClientService`. Protected intent documents remain read-only.

## Constraints

- Store AI proposals separately from current offer fields.
- Require explicit human actor input for approve/reject/edit review.
- Record actor, timestamp, decision, edited fields, and diff.
- Keep notifications fail-soft.
- Do not publish to Aukro.cz, enqueue publication, reserve stock, change Prisma schema, add secrets, or modify protected intent documents.

## Acceptance criteria

- AI proposal creation stores proposal metadata under offer rawData.
- Human review records actor, timestamp, decision, and diff.
- Approval with edits applies only human-reviewed field changes to the local offer.
- Low-confidence or risky proposals remain review-required and cannot auto-publish.
- AI/notification service unavailability is represented safely.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-006`.

## Task Summary

Create the FEAT-006 AI proposal and human review workflow without publish behavior.

## Required Context

`docs/13_context_packages/CP-TASK-006-ai-proposal-human-approval.md`, `docs/21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md`, FEAT-006, offer service/controller, AI client, notifications client, and TASK-005 draft model.

## Allowed Changes

Offer controller/service files, an AI proposal type file, synthetic offer service tests, TASK-006 IPS artifacts, task tracker, and graph links.

## Forbidden Changes

Protected constitution/vision documents, Prisma schema, runtime secrets, Kubernetes manifests, live Aukro publish behavior, warehouse reservation/decrement behavior, and UI files.

## Implementation Instructions

Add typed proposal/review contracts, route `POST /offers/:id/ai-proposals`, route `POST /offers/:id/ai-proposals/:proposalId/review`, deterministic request IDs, minimized AI payloads, rawData proposal/review persistence, fail-soft notification requests, and synthetic tests.

## Validation Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-006
```

## Expected Output

The coding agent must return:

- Files changed
- Tests run
- Validation evidence
- Deviations
- Remaining documentation gaps
