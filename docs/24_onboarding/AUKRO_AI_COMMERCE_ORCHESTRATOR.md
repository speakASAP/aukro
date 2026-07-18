---
id: ONBOARDING-AUKRO-AI-COMMERCE-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/08_roadmap/AI_COMMERCE_ROADMAP.md
  - docs/17_governance/AI_AGENT_RULES.md
downstream:
  - docs/11_tasks/TASK-002-create-ai-commerce-roadmap.md
related_adrs: []
---
# Aukro AI Commerce Orchestrator

## Mission

Coordinate implementation of the Aukro AI commerce roadmap through IPS-governed goals, scoped execution plans, validation reports, and commits.

## Required First Steps For Future Agents

1. Work in the remote repository /home/ssf/Documents/Github/aukro-service on alfares.
2. Read AGENTS.md, docs/00_constitution/CONSTITUTION.md, docs/01_vision/VISION.md, docs/17_governance/PROJECT_INVARIANTS.md, and docs/08_roadmap/AI_COMMERCE_ROADMAP.md.
3. Run git status before editing.
4. Select the next task from TASKS.md or the roadmap sequence.
5. Create or update goal impact, execution plan, context package, coding prompt, and validation plan before runtime code changes.
6. Preserve protected documents and source-system ownership.
7. Run IPS gates and task tests.
8. Commit and deploy only after validation evidence exists.

## Implementation Order

1. TASK-003: implement FEAT-004 Aukro compliance policy and gate tests.
2. TASK-004: implement FEAT-009 missing service clients and integration contracts.
3. TASK-005: implement FEAT-005 catalog sell action and draft model.
4. TASK-006: implement FEAT-006 AI proposal workflow with human approval.
5. TASK-007: implement FEAT-008 publish queue, attempt records, and reconciliation.
6. TASK-008: implement FEAT-007 revenue analytics and cross-service events.
7. TASK-009: implement operator workbench API or frontend route if product owner approves UI scope.

## Non-Negotiable Runtime Rules

- AI suggestions never publish directly.
- Live Aukro mutation requires catalog validation, stock validation, policy pass, human approval where required, actor identity, and idempotency key.
- Secrets remain in Vault and Kubernetes secret references only.
- Orders are forwarded to orders-microservice and not locally owned.
- Warehouse remains stock truth.
- Missing or stale evidence blocks publication.

## Final Report Shape

Future implementation agents must report:

- Goal and task ID.
- Goal impact.
- Files changed.
- Tests and gates run.
- Validation evidence.
- Protected documents untouched confirmation.
- Remaining blockers.
- Commit, push, and deploy status when applicable.
