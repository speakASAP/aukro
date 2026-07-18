---
id: PROMPT-TASK-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/21_execution_plans/EP-TASK-001.md
  - docs/13_context_packages/CP-TASK-001.md
downstream:
  - docs/12_validation/VAL-TASK-001-ips-governance-baseline.md
related_adrs: []
---
# PROMPT-TASK-001: IPS Governance Baseline

## Task summary

Implement `TASK-001` by adding IPS documentation, scripts, graph and validation evidence.

## Execution plan link

`docs/21_execution_plans/EP-TASK-001.md`

## Role

AI coding agent applying a documentation-governance baseline to a production service repository.

## Task

Create IPS governance artifacts for `TASK-001` without runtime behavior changes.

## Context

Use `docs/13_context_packages/CP-TASK-001.md`.

## Required context

`docs/11_tasks/TASK-001-implement-ips-governance-baseline.md`, `docs/21_execution_plans/EP-TASK-001.md`, `docs/13_context_packages/CP-TASK-001.md`.

## Allowed changes

IPS docs, scripts, graph, validation reports, `AGENTS.md` and `README.md` onboarding references.

## Forbidden changes

Runtime TypeScript behavior, Prisma schema, deployment manifests, `.env` files and secret values.

## Implementation instructions

Follow the execution plan and use approved docs only.

## Constraints

No runtime behavior changes, no secret values, no raw production data, no deployment manifest edits, and no protected intent changes after baseline adoption.

## Acceptance criteria

Strict audit and pre-coding gate pass; deployment-readiness gate runs and reports protected-document review state.

## Validation commands

```bash
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-001
```

## Validation

Record evidence in `docs/12_validation/VAL-TASK-001-ips-governance-baseline.md` and generated reports.

## Expected output

Changed files, docs created, markers remaining, validation evidence and deviations.
