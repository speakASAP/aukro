---
id: EP-TASK-006
status: reviewed
source_task: ../11_tasks/TASK-006-ai-proposal-human-approval.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-006-ai-human-workbench.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-006.md
---
# EP-TASK-006 AI Proposal Workflow With Human Approval

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-006. Lifecycle state: implementation scoped to advisory AI proposals and local human review records.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-006-ai-human-workbench.md`
- `16_operations/INTEGRATIONS.md`
- `16_operations/SERVICE_CLIENT_CONTRACTS.md`
- `22_goal_impact/GOAL-IMPACT-TASK-006.md`

## Goal Impact

The plan gives operators AI support for listing preparation while ensuring all AI output remains advisory until a human actor approves, rejects, or edits the proposal.

## Project Invariants

- AUKRO-INV-001: Add task, execution plan, context package, prompt, goal impact, validation, and graph/task tracker links.
- AUKRO-INV-002: Do not bypass catalog validation or policy gates.
- AUKRO-INV-003: Keep catalog, stock, order, AI, notification, and approval ownership boundaries explicit.
- AUKRO-INV-004: Use synthetic tests and minimized AI payloads.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. The AI request payload is built from local offer and draft source metadata only. It excludes raw orders, customer data, secrets, tokens, and live Aukro payloads.

## Contract Validation Plan

Synthetic service tests validate AI proposal creation, fail-soft notification behavior, approval with edits, rejection, and diff recording with mocked Prisma, AI, notification, catalog, warehouse, policy, and logger dependencies.

## Replay/Determinism Plan

Request IDs are deterministic from offer id and proposal target. Review records append to rawData history and do not trigger live marketplace mutations.

## Scope

Add local AI proposal and review endpoints plus rawData metadata persistence.

## Non-Goals

No live Aukro mutation, publish queue, stock reservation, Prisma migration, UI, or autonomous AI approval.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `10_features/FEAT-006-ai-human-workbench.md`
- `services/aukro-service/src/aukro/offers/*`
- `shared/clients/ai-client.service.ts`
- `shared/clients/notifications-client.service.ts`

## Files to Create

- `11_tasks/TASK-006-ai-proposal-human-approval.md`
- `12_validation/VAL-TASK-006-ai-proposal-human-approval.md`
- `13_context_packages/CP-TASK-006-ai-proposal-human-approval.md`
- `14_prompts/PROMPT-TASK-006-ai-proposal-human-approval.md`
- `21_execution_plans/EP-TASK-006-ai-proposal-human-approval.md`
- `22_goal_impact/GOAL-IMPACT-TASK-006.md`
- `services/aukro-service/src/aukro/offers/ai-proposal.types.ts`

## Files to Modify

- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`
- `TASKS.md`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, and Prisma schema.

## Implementation Steps

1. Create TASK-006 IPS artifacts.
2. Add AI proposal and review types.
3. Inject AI and notifications clients into offers service.
4. Add proposal and review endpoints.
5. Store proposal and review records in `rawData.aiProposals` and `rawData.humanReviews`.
6. Add synthetic tests.
7. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix services/aukro-service test` and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict documentation audit, pre-coding gate, deployment-readiness gate for TASK-006, and inspect git diff.

## Gate Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-006
```

## Documentation Updates

Create TASK-006 docs and update the task tracker plus graph.

## Rollback Plan

Revert the TASK-006 commit. No database migration, secret rotation, queue replay, or warehouse cleanup is required.

## Agent Handoff Prompt

Implement advisory AI proposal and human review workflow only. Store AI output separately from offer fields until human review, record actor/diff metadata, notify fail-soft, and do not publish.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
