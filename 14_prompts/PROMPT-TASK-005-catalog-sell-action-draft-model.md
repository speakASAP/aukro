---
id: PROMPT-TASK-005-catalog-sell-action-draft-model
status: used
source_task: ../11_tasks/TASK-005-catalog-sell-action-draft-model.md
execution_plan: ../21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md
context_package: ../13_context_packages/CP-TASK-005-catalog-sell-action-draft-model.md
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
---
# PROMPT-TASK-005: Catalog Sell Action And Draft Model

## Role

Act as an aukro-service backend engineer implementing a documented FEAT-005 task under IPS governance.

## Task

Implement `POST /offers/from-catalog` so a catalog product and Aukro account can create or reuse one local Aukro draft with policy evidence and blockers.

## Context

Use `CP-TASK-005`, `EP-TASK-005`, FEAT-005, `services/aukro-service/src/aukro/offers/*`, the offer policy service, catalog client, and warehouse client. Protected intent documents and project invariants remain read-only.

## Constraints

- Add local draft creation and reuse only.
- Store draft/source/policy metadata in `AukroOffer.rawData`.
- Keep catalog and warehouse as source systems.
- Use synthetic tests only.
- Do not publish to Aukro.cz, enqueue publication, reserve stock, change Prisma schema, add secrets, or modify protected intent documents.

## Acceptance criteria

- `POST /offers/from-catalog` creates a local inactive draft from one catalog product/account.
- Repeated calls for the same account/product reuse and refresh the existing local offer.
- Zero stock, missing price, missing media, category gaps, parameter gaps, and missing AI risk evidence surface as policy blockers.
- The response includes draft status, blockers, source snapshot, and policy evaluation.
- No live marketplace mutation is introduced.

## Validation

Run `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-005`.

## Task Summary

Create a draft-first catalog sell action for FEAT-005 without adding publish behavior.

## Required Context

`13_context_packages/CP-TASK-005-catalog-sell-action-draft-model.md`, `21_execution_plans/EP-TASK-005-catalog-sell-action-draft-model.md`, FEAT-005, offer service/controller, policy service, and shared catalog/warehouse clients.

## Allowed Changes

Offer controller/service files, a catalog draft type file, synthetic offer service tests, TASK-005 IPS artifacts, task tracker, and graph links.

## Forbidden Changes

Protected constitution/vision documents, Prisma schema, runtime secrets, Kubernetes manifests, live Aukro publish behavior, warehouse reservation/decrement behavior, and UI files.

## Implementation Instructions

Add typed request/response contracts, route `POST /offers/from-catalog`, deterministic create-or-refresh logic keyed by `(accountId, productId)`, policy evidence collection from catalog/warehouse snapshots, and synthetic tests for creation, reuse, and blocked drafts.

## Validation Commands

```bash
npm --prefix services/aukro-service test
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root . --target TASK-005
```

## Expected Output

The coding agent must return:

- Files changed
- Tests run
- Validation evidence
- Deviations
- Remaining documentation gaps
