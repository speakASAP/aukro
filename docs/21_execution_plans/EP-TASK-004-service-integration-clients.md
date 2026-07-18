---
id: EP-TASK-004
status: reviewed
source_task: ../11_tasks/TASK-004-service-integration-clients.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: docs/01_vision/VISION.md
constitution: docs/00_constitution/CONSTITUTION.md
feature: docs/10_features/FEAT-009-service-integration-clients.md
goal_impact: docs/22_goal_impact/GOAL-IMPACT-TASK-004.md
---
# EP-TASK-004 Service Integration Clients

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-004. Lifecycle state: implementation scoped for optional clients and contract tests.

## Upstream Traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/04_systems/SYS-001-aukro-service.md`
- `docs/08_roadmap/AI_COMMERCE_ROADMAP.md`
- `docs/10_features/FEAT-009-service-integration-clients.md`
- `docs/16_operations/INTEGRATIONS.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-004.md`

## Goal Impact

The plan creates the integration foundation required before AI proposals, human approval notifications, media evidence bundles, payment/supplier evidence, and revenue feedback loops can be implemented safely.

## Project Invariants

- AUKRO-INV-001: Add task, context package, prompt, execution plan, goal impact, validation, graph links, and code evidence.
- AUKRO-INV-002: Do not bypass catalog validation or publish policy gates.
- AUKRO-INV-003: Keep downstream services as their domain owners.
- AUKRO-INV-004: Use synthetic tests and masked logs.
- AUKRO-INV-005: Add env var names only, no secret values.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. Tests do not call live services and include no raw customer identifiers. Logging client masks token, secret, password, email, phone, and address-shaped fields.

## Contract Validation Plan

Mocked client contract tests validate request contract versions, health checks, graceful unavailable results, and masking. External services are not required for this task.

## Replay/Determinism Plan

Tests use deterministic mocked HTTP responses. No replay queue, idempotent mutation, or live external side effect is introduced.

## Scope

Add optional shared clients, env/config docs, contract docs, module exports, and tests.

## Non-Goals

No live calls in tests, no downstream schema changes, no client usage in offer/order flows, no new persistence, no secrets, no publish queue, and no UI.

## Files to Inspect

- `AGENTS.md`
- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/17_governance/PROJECT_INVARIANTS.md`
- `docs/10_features/FEAT-009-service-integration-clients.md`
- `docs/16_operations/INTEGRATIONS.md`
- `shared/clients/*`
- `shared/resilience/*`
- `.env.example`
- `k8s/configmap.yaml`

## Files to Create

- `docs/11_tasks/TASK-004-service-integration-clients.md`
- `docs/12_validation/VAL-TASK-004-service-integration-clients.md`
- `docs/13_context_packages/CP-TASK-004-service-integration-clients.md`
- `docs/14_prompts/PROMPT-TASK-004-service-integration-clients.md`
- `docs/16_operations/SERVICE_CLIENT_CONTRACTS.md`
- `docs/21_execution_plans/EP-TASK-004-service-integration-clients.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-004.md`
- New shared client service/type/test files under `shared/clients/`

## Files to Modify

- `shared/clients/clients.module.ts`
- `shared/clients/index.ts`
- `shared/index.ts`
- `shared/package.json`
- `shared/tsconfig.json`
- `.env.example`
- `k8s/configmap.yaml`
- `TASKS.md`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- Runtime secret files, Prisma schema, and unrelated service domains.

## Implementation Steps

1. Create TASK-004 IPS artifacts.
2. Add optional ecosystem client base, types, and service clients.
3. Register clients in `ClientsModule` and shared exports.
4. Add env/config and contract documentation.
5. Add mocked contract tests.
6. Run validation commands and update validation report.

## Test Plan

Run `npm --prefix shared test`, `npm --prefix shared run build`, and `npm --prefix services/aukro-service run build`.

## Validation Plan

Run strict doc audit, pre-coding gate, deployment-readiness gate, and inspect git diff.

## Gate Commands

```bash
npm --prefix shared test
npm --prefix shared run build
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root .
```

## Documentation Updates

Create TASK-004 docs, service client contract docs, and update task tracker plus graph.

## Rollback Plan

Revert the TASK-004 commit. No database migration, secret rotation, or queue replay cleanup is required.

## Agent Handoff Prompt

Implement optional ecosystem service clients only. Keep downstream services as owners, fail softly, mask logs, use synthetic tests, and do not wire clients into live marketplace mutations.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
