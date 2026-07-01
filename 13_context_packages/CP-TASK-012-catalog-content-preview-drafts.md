---
id: CP-TASK-012
status: reviewed
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# CP-TASK-012 Catalog Content Preview Drafts

## Target task

`TASK-012` in `11_tasks/TASK-012-catalog-content-preview-drafts.md`.

## Upstream traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `11_tasks/TASK-005-catalog-sell-action-draft-model.md`, and `22_goal_impact/GOAL-IMPACT-TASK-012.md`.

## Included documents

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent documents, `17_governance/PROJECT_INVARIANTS.md`, `17_governance/AI_AGENT_RULES.md`, FEAT-005, TASK-005 docs, the shared Catalog client, from-catalog draft types/service/tests, and `services/aukro-service/src/ui/ui.controller.ts`.

## Excluded documents

Prisma schema and migrations, Kubernetes/deployment manifests, runtime secrets, live Aukro payloads, raw production logs, raw customer/order records, and unrelated account/policy/publish ownership docs.

## Constraints

Implement only the Catalog canonical content preview connector path for Aukro drafts. Keep Catalog as content owner, preserve draft-first behavior, avoid live marketplace mutation, do not add schema migrations, and keep tests synthetic.

## Agent prompt

Use the Catalog content-preview contract for marketplace `aukro`, store rendered plain text plus source evidence in draft metadata, show preview in the UI before draft creation, and keep the publish/account/policy surfaces unchanged.

## Validation instructions

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/deployment_readiness_gate.py --root . --target TASK-012`, and `git diff --check`.

