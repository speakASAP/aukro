---
id: CP-TASK-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/11_tasks/TASK-001-implement-ips-governance-baseline.md
downstream:
  - docs/14_prompts/PROMPT-TASK-001.md
related_adrs: []
---
# CP-TASK-001: IPS Governance Baseline Context Package

## Target task

`TASK-001` in `docs/11_tasks/TASK-001-implement-ips-governance-baseline.md`.

## Upstream traceability

`docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `docs/02_business_case/BUSINESS_CASE.md`, `docs/21_execution_plans/EP-TASK-001.md`.

## Included documents

`BUSINESS.md`, `SYSTEM.md`, `README.md`, `AGENTS.md`, `TASKS.md`, `STATE.json`, `prisma/schema.prisma`.

## Excluded documents

`.env`, backup env files, raw production logs, order payloads, customer identifiers and secret values.

## Constraints

No runtime behavior changes, no invented goals, no exposed secrets, and preserve unrelated dirty deployment changes.

## Agent prompt

Apply IPS baseline using approved existing docs as source material.

## Validation instructions

Run strict audit, pre-coding gate and deployment-readiness gate with `TASK-001` target.
