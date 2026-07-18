---
id: EP-TASK-016
status: approved
source_task: ../11_tasks/TASK-016-orders-create-synthetic-smoke.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: complete
vision: docs/01_vision/VISION.md
constitution: docs/00_constitution/CONSTITUTION.md
feature: docs/10_features/FEAT-003-order-forwarding.md
goal_impact: docs/22_goal_impact/GOAL-IMPACT-TASK-016.md
---
# EP-TASK-016 Orders Create Synthetic Smoke

## Metadata

Owner: Engineering. Status: approved by owner request on 2026-07-01. Source task: TASK-016. Lifecycle state: bounded implementation for a non-mutating synthetic runtime smoke command.

## Upstream Traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/04_systems/SYS-001-aukro-service.md`
- `docs/10_features/FEAT-003-order-forwarding.md`
- `docs/10_features/FEAT-009-service-integration-clients.md`
- `docs/16_operations/INTEGRATIONS.md`
- `docs/12_validation/VAL-GOAL-7-2B-orders-create-auth-warehouse-readiness.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-016.md`

## Goal Impact

The plan closes the Orders Goal 7.2B smoke gap by adding an explicit runtime command that proves the create-order path is correctly wired while avoiding production writes and live downstream calls.

## Project Invariants

- AUKRO-INV-001: Create task, execution plan, prompt, goal impact, graph links, and validation report.
- AUKRO-INV-003: Keep Orders and Warehouse as downstream owners; the smoke only validates contract construction.
- AUKRO-INV-004: Use synthetic data and sanitized output only.
- AUKRO-INV-005: Check token presence by env name only; do not print values or create secrets.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: synthetic. The smoke script uses synthetic identifiers and in-memory fakes. It checks `AUKRO_INTERNAL_SERVICE_TOKEN` presence but never prints its value. It does not read raw production orders, customer identifiers, DB rows, payment data, decoded JWTs, or live downstream responses.

## Contract Validation Plan

Run the smoke command to assert the Orders create payload contains `orders.create.v1`, `channel: aukro`, stable `channelAccountId`, a Catalog product id, a Warehouse-owned `warehouseId`, and the required internal service header names.

## Replay/Determinism Plan

The smoke is deterministic. It uses a fixed synthetic order, fake Prisma create/update methods, fake Warehouse stock rows, and a fake HTTP adapter for `OrderClientService`; it performs no network call to Orders or Warehouse.

## Scope

Add a CLI smoke script and npm command, then validate it in the remote repo and inside the deployed pod.

## Non-Goals

No public route, no live order creation, no production DB writes, no live Orders or Warehouse network calls, no payment or marketplace calls, no Kubernetes or secret changes, and no protected intent document changes.

## Files to Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/17_governance/PROJECT_INVARIANTS.md`
- `docs/17_governance/AI_AGENT_RULES.md`
- `SYSTEM.md`
- `docs/10_features/FEAT-003-order-forwarding.md`
- `docs/16_operations/INTEGRATIONS.md`
- `shared/clients/order-client.service.ts`
- `services/aukro-service/src/aukro/orders/orders.service.ts`
- `services/aukro-service/package.json`

## Files to Create

- `services/aukro-service/src/aukro/orders/orders.create-smoke.spec.ts`
- `docs/11_tasks/TASK-016-orders-create-synthetic-smoke.md`
- `docs/21_execution_plans/EP-TASK-016-orders-create-synthetic-smoke.md`
- `docs/13_context_packages/CP-TASK-016-orders-create-synthetic-smoke.md`
- `docs/14_prompts/PROMPT-TASK-016-orders-create-synthetic-smoke.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-016.md`
- `docs/12_validation/VAL-TASK-016-orders-create-synthetic-smoke.md`

## Files to Modify

- `services/aukro-service/package.json`
- `TASKS.md`
- `graph/project_graph.example.yaml`

## Files That Must Not Be Modified

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- Prisma schema and migrations
- Kubernetes manifests and runtime secret refs
- Live order/customer/payment datasets

## Implementation Steps

1. Add the synthetic smoke script with in-memory fake Prisma, fake Warehouse, and fake Orders HTTP adapter.
2. Add `smoke:orders-create` npm script.
3. Add TASK-016 IPS docs and graph links.
4. Run targeted smoke with a synthetic token env value.
5. Run service tests, service build, strict audit, pre-coding gate, deployment-readiness gate, and `git diff --check`.
6. Commit validated changes.
7. Deploy Aukro if validation passes.
8. Run the smoke command inside the live pod using env-name token presence only.

## Test Plan

Run:

```bash
AUKRO_INTERNAL_SERVICE_TOKEN=synthetic-smoke-token npm --prefix services/aukro-service run smoke:orders-create
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
```

## Validation Plan

Run strict doc audit, pre-coding gate, deployment-readiness gate targeting TASK-016, `git diff --check`, deployment rollout status, public health, and the in-pod smoke command.

## Gate Commands

```bash
git diff --check
AUKRO_INTERNAL_SERVICE_TOKEN=synthetic-smoke-token npm --prefix services/aukro-service run smoke:orders-create
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-016
```

## Parallel Execution Section

This task is intentionally single-lane because it touches one module, one package script, and shared IPS graph/tracker files. Parallel work is not started to avoid conflicts in `TASKS.md` and `graph/project_graph.example.yaml`.

## Documentation Updates

Update TASK-016 docs, graph, task tracker, and validation report.

## Rollback Plan

Revert the TASK-016 commit. No database cleanup, downstream service cleanup, secret rotation, or marketplace cleanup is required because the smoke is synthetic and non-mutating.

## Agent Handoff Prompt

Implement TASK-016 by adding a non-mutating synthetic Orders create smoke command. Use production mapping/client code where possible, but fake Prisma, Warehouse, and HTTP so no production data is read or written and no live downstream service is called. Output sanitized JSON only.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
