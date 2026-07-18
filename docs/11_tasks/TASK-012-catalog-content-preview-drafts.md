---
id: TASK-012
status: reviewed
owner: Engineering
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
upstream:
  - ../10_features/FEAT-005-catalog-warehouse-publisher.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-012.md
execution_plan:
  - ../21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md
---
# TASK-012: Catalog Content Preview Drafts

## Objective

Integrate the Catalog canonical content preview connector into Aukro from-catalog draft creation and the operator UI preview path without changing Aukro account, policy, publish, warehouse, order, Prisma, deployment, or secret ownership.

## Upstream Links

`docs/01_vision/VISION.md`, `docs/04_systems/SYS-001-aukro-service.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/11_tasks/TASK-005-catalog-sell-action-draft-model.md`, and `docs/16_operations/INTEGRATIONS.md`.

## Goal Impact

See `docs/22_goal_impact/GOAL-IMPACT-TASK-012.md`. This task improves draft review quality by storing Catalog-rendered Aukro content evidence while keeping the draft-first marketplace safety model intact.

## Project Invariant Impact

Applies AUKRO-INV-001 through AUKRO-INV-006. The implementation is traceable, keeps Catalog as the content source system, stores only rendered preview evidence, avoids secrets/raw production data, changes no protected intent documents, and requires validation evidence before closure.

## Sensitive-Data Classification

Classification: synthetic and catalog-derived product content. Tests use synthetic product and preview payloads. The lane stores title, rendered plain text, source hash/version metadata, fallback flags, and warnings. It does not store secrets, tokens, customer identifiers, raw orders, or live Aukro payloads.

## Contract/Schema Impact

Adds a shared Catalog client method for protected `GET /api/products/:productId/content-previews/:marketplace` using marketplace key `aukro`. Extends the local draft metadata snapshot under `AukroOffer.rawData`. No Prisma schema, migration, Kubernetes manifest, secret, account, policy, or publish contract changes are required.

## Replay/Determinism Impact

From-catalog draft creation remains idempotent by `(accountId, productId)`. Repeated calls refresh the local draft snapshot from current Catalog preview, pricing, media, and warehouse evidence. The UI preview is read-only until the operator confirms draft creation.

## Scope

- Add a typed Catalog content-preview client method.
- Use `aukro` content preview plain text and source evidence in from-catalog draft snapshots.
- Prefer rendered plain text over raw `product.description` for draft descriptions, with a documented fallback.
- Add a UI preview step before draft creation in `ui.controller.ts`.
- Add synthetic tests for canonical preview and fallback behavior.
- Create/update required IPS task, plan, prompt, context, goal-impact, validation, and graph artifacts.

## Non-Goals

- No live Aukro publish call or publish queue ownership change.
- No account linking, account policy, compliance policy, AI approval, or human approval ownership change.
- No writeback to Catalog, Warehouse, Orders, Auth, AI, Logging, or Notifications.
- No Prisma schema, migration, deployment, Kubernetes, or secret change.
- No raw HTML persistence requirement; the draft snapshot stores rendered plain text and source evidence.

## Acceptance Criteria

- [x] `CatalogClientService` exposes a protected content-preview fetch method for marketplace `aukro`.
- [x] `createFromCatalog` stores preview plain text and source evidence in draft snapshot metadata.
- [x] Draft description uses preview plain text before falling back to raw product description.
- [x] The dashboard UI fetches and displays content preview before draft creation.
- [x] Synthetic tests cover canonical preview use and fallback.
- [x] No forbidden Prisma, deployment, Kubernetes, secret, account, policy, or publish files are modified.

## Required Context

`AGENTS.md`, `AGENT_OPERATIONS.md`, protected intent docs, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, TASK-005 docs and validation, shared Catalog client, from-catalog offer service/controller/types/tests, and `services/aukro-service/src/ui/ui.controller.ts`.

## Validation Task

Create `docs/12_validation/VAL-TASK-012-catalog-content-preview-drafts.md`, run the service tests/build, strict audit, pre-coding gate, deployment-readiness gate for TASK-012, and `git diff --check`.

## Required Gates

`npm --prefix services/aukro-service test`; `npm --prefix services/aukro-service run build`; `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root . --target TASK-012`; `git diff --check`.

## Execution Plan Requirement

Use `docs/21_execution_plans/EP-TASK-012-catalog-content-preview-drafts.md` before coding.

