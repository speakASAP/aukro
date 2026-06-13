---
id: EP-TASK-003
status: reviewed
source_task: ../11_tasks/TASK-003-aukro-compliance-policy.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-004-aukro-compliance-policy.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-003.md
---
# EP-TASK-003 Aukro Compliance Policy

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-003. Lifecycle state: implementation scoped for backend policy gates and tests.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `09_milestones/MS-003-ai-commerce-platform.md`
- `10_features/FEAT-004-aukro-compliance-policy.md`
- `22_goal_impact/GOAL-IMPACT-TASK-003.md`

## Goal Impact

The plan creates the fail-closed policy layer needed before catalog-to-Aukro publishing can become automated, protecting revenue and account standing while keeping human control explicit.

## Project Invariants

- AUKRO-INV-001: Create traceable task, goal-impact, execution-plan, validation, and code links.
- AUKRO-INV-002: Keep catalog validation required before offer readiness can pass.
- AUKRO-INV-003: Read catalog and warehouse evidence without moving ownership into aukro-service.
- AUKRO-INV-004: Use synthetic test data and no raw customer/order data.
- AUKRO-INV-005: Do not introduce credentials or secret values.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. Tests use synthetic evidence timestamps, product IDs, and masked actor strings. Policy logs and return values contain reason codes and remediation hints only, not secrets or raw production payloads.

## Contract Validation Plan

Add a deterministic `POST /offers/:id/policy-check` response contract with `mode`, `allowed`, `reasonCodes`, `reasons`, and `evaluatedAt`. Validate with service policy tests and TypeScript build. No external service contract is changed.

## Replay/Determinism Plan

Policy decisions are deterministic for the same mode, evidence, and `now` timestamp. Tests inject fixed timestamps. Publish readiness requires idempotency evidence but does not enqueue or replay live mutations in this task.

## Scope

Implement policy evaluation types, service, controller endpoint, Nest provider wiring, response snapshots on local offer create/update/sync, and tests.

## Non-Goals

No live Aukro mutations, queue, persistent policy table, schema migration, UI, K8s changes, secret changes, or official Aukro API/OAuth implementation.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `08_roadmap/AI_COMMERCE_ROADMAP.md`
- `10_features/FEAT-004-aukro-compliance-policy.md`
- `14_prompts/PROMPT-TASK-003-aukro-compliance-policy.md`
- `16_operations/INTEGRATIONS.md`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.module.ts`

## Files to Create

- `11_tasks/TASK-003-aukro-compliance-policy.md`
- `21_execution_plans/EP-TASK-003-aukro-compliance-policy.md`
- `22_goal_impact/GOAL-IMPACT-TASK-003.md`
- `12_validation/VAL-TASK-003-aukro-compliance-policy.md`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.types.ts`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.service.spec.ts`

## Files to Modify

- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.controller.ts`
- `services/aukro-service/src/aukro/offers/offers.module.ts`
- `services/aukro-service/package.json`
- `TASKS.md`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Secret files, runtime `.env` files, Prisma schema, Kubernetes manifests, and unrelated service domains.

## Implementation Steps

1. Create task, goal-impact, execution-plan, and validation skeleton.
2. Add policy types and pure evaluation service with reason codes and remediation hints.
3. Wire policy evaluation into offer create/update/sync response snapshots and expose `POST /offers/:id/policy-check`.
4. Add deterministic policy tests for missing, stale, failing, draft-allowed, publish-allowed, and publish-specific gates.
5. Update task tracker and graph.
6. Run service tests, build, strict doc audit, pre-coding gate, deployment-readiness gate, and inspect diff.

## Test Plan

Run `npm --prefix services/aukro-service test` for policy gate coverage and `npm --prefix services/aukro-service run build` for TypeScript integration.

## Validation Plan

Record command outcomes in `12_validation/VAL-TASK-003-aukro-compliance-policy.md`; generated IPS gate JSON files remain under `reports/validation/`.

## Gate Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root .
```

## Documentation Updates

Create TASK-003, EP-TASK-003, GOAL-IMPACT-TASK-003, VAL-TASK-003, and update `TASKS.md` plus graph traceability.

## Rollback Plan

Revert the task documents, policy files, offer service/controller/module changes, package script changes, and task/graph updates. No database rollback, secret rotation, or deployment manifest rollback is required.

## Agent Handoff Prompt

Implement only the FEAT-004 backend policy foundation. Keep all live Aukro mutation behavior unchanged, fail closed on missing/stale evidence, use synthetic tests, and run the listed validation commands.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
