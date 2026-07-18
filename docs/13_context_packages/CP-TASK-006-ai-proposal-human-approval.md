---
id: CP-TASK-006
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/11_tasks/TASK-006-ai-proposal-human-approval.md
downstream:
  - docs/14_prompts/PROMPT-TASK-006-ai-proposal-human-approval.md
related_adrs: []
---
# CP-TASK-006 AI Proposal Workflow With Human Approval

## Target task

`TASK-006` in `docs/11_tasks/TASK-006-ai-proposal-human-approval.md`.

## Upstream traceability

`docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`, `docs/10_features/FEAT-006-ai-human-workbench.md`, and `docs/21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md`.

## Included documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, FEAT-006, INTEGRATIONS, SERVICE_CLIENT_CONTRACTS, offer service/controller, TASK-005 draft model, AI client, and notifications client.

## Excluded documents

Secret files, raw production orders, customer data, live Aukro payloads, tokens, credentials, and live service logs.

## Constraints

Implement advisory AI proposal and human review records only. Do not publish, enqueue publication, reserve stock, add secrets, change Prisma schema, or let AI override policy gates.

## Agent prompt

Implement `POST /offers/:id/ai-proposals` and `POST /offers/:id/ai-proposals/:proposalId/review` with proposal metadata, actor/diff review records, fail-soft notifications, and synthetic tests.

## Validation instructions

Run service tests/build, strict doc audit, pre-coding gate, deployment-readiness gate, and git diff review.
