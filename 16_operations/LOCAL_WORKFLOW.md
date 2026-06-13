---
id: LOCAL-WORKFLOW-AUKRO-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 00_constitution/CONSTITUTION.md
downstream: []
related_adrs: []
---
# Local Workflow

## Before implementation

Read `AGENTS.md`, protected intent docs, relevant task, execution plan, context package and validation criteria. Run the pre-coding gate.

## During implementation

Stay inside execution-plan scope and do not use raw production data or secrets in prompts, tests, logs or reports.

## Before deployment or closure

Run strict audit, pre-coding gate and deployment-readiness gate. Reference generated reports.
