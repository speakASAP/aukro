---
id: EP-TASK-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
source_task: ../11_tasks/TASK-001-implement-ips-governance-baseline.md
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-001-offer-management.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-001.md
---
# EP-TASK-001: IPS Governance Baseline

## Metadata

Task `TASK-001`; approved for documentation-only baseline adoption.

## Upstream Traceability

`01_vision/VISION.md`, `00_constitution/CONSTITUTION.md`, `02_business_case/BUSINESS_CASE.md`, `10_features/FEAT-001-offer-management.md`.

## Goal Impact

Creates governance needed to keep future Aukro marketplace work traceable and validated. See `22_goal_impact/GOAL-IMPACT-TASK-001.md`.

## Project invariants

Applies `17_governance/PROJECT_INVARIANTS.md`.

## Sensitive-data handling

No secret values, raw orders, customer identifiers or production exports may be copied into IPS artifacts.

## Contract validation plan

No runtime contracts change; validate changed file list and documentation scope.

## Replay/determinism plan

Gate scripts run deterministically from repository files.

## Scope

Add IPS governance documents, gate scripts, graph, context package, prompt and validation report.

## Non-Goals

No service code, Prisma schema, K8s deployment behavior or secret value changes.

## Files to Inspect

`BUSINESS.md`, `SYSTEM.md`, `README.md`, `AGENTS.md`, `TASKS.md`, `STATE.json`, `package.json`, `prisma/schema.prisma`.

## Files to Create

IPS directories, `graph/project_graph.example.yaml`, gate scripts and `reports/validation/*`.

## Files to Modify

`AGENTS.md`, `README.md`, `scripts/pre_coding_gate.py` for repo-local env exclusions.

## Files That Must Not Be Modified

`BUSINESS.md`, `.env`, `.env.backup*`, runtime TypeScript files, `prisma/schema.prisma`, `k8s/deployment.yaml` and other deployment manifests.

## Implementation Steps

Read standard docs, create project-specific IPS docs, copy scripts/templates, add graph/context/prompt/validation, update onboarding references, run gates and record blockers.

## Test Plan

Run Python compile checks and IPS gate commands.

## Validation Plan

Strict audit and pre-coding gate must pass. Deployment-readiness may report protected baseline file changes until human review accepts them.

## Gate Commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-001
```

## Documentation Updates

Create and update only IPS/governance documentation and onboarding references.

## Rollback Plan

Remove added IPS files and restore `AGENTS.md`, `README.md` and scripts from Git if baseline adoption is rejected.

## Agent Handoff Prompt

Implement the IPS baseline using existing approved docs only. Do not modify runtime code, K8s behavior or secret files.

## Completion Checklist

IPS folders created; traceability chain present; graph present; strict audit run; pre-coding gate run; deployment-readiness gate run and blockers documented.
