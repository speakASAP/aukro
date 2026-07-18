---
id: VAL-TASK-001
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/11_tasks/TASK-001-implement-ips-governance-baseline.md
  - docs/21_execution_plans/EP-TASK-001.md
downstream: []
related_adrs: []
---
# VAL-TASK-001: IPS Governance Baseline

## Artifact validated

`TASK-001` and `docs/21_execution_plans/EP-TASK-001.md`.

## Validation scope

Documentation-only IPS baseline adoption.

## Summary

Checks required IPS artifacts, traceability, local gates and runtime-file scope.

## Upstream goal

`docs/01_vision/VISION.md`: safe Aukro.cz marketplace integration for offers, stock and order forwarding.

## Evidence

Generated reports are written to `reports/validation/` when gates run.

## Gate evidence

Run strict audit, pre-coding gate and deployment-readiness gate with target `TASK-001`.

## Invariant evidence

`docs/17_governance/PROJECT_INVARIANTS.md` defines traceability, protected intent, execution-plan-before-code, validation evidence, sensitive-data handling and marketplace boundary invariants.

## Sensitive-data scan evidence

The pre-coding gate scans text artifacts while excluding existing runtime `.env` and backup env files. IPS artifacts contain no secret values or raw production order/customer data.

## Replay and determinism evidence when applicable

Gate scripts are deterministic repository-file checks. No runtime replay behavior changes.

## Criteria checked

Required docs, metadata, graph links and runtime-scope boundaries.

## Passed criteria

Strict audit and pre-coding results are captured in generated reports after command execution.

## Failed criteria

Deployment-readiness may flag protected baseline document creation until human review accepts it.

## Issues found

No strict-audit or pre-coding issue is expected after remediation.

## Deviations

Project-local gate excludes existing `.env` and `.env.backup*` files because runtime secret files predate IPS and must not be copied into IPS artifacts.

## Recommendation

Accept the IPS baseline after human review of protected documents, then require amendments for future protected changes.

## Traceability confirmation

`TASK-001` traces to vision, business case, features, goal impact, execution plan, context package, prompt and graph.
