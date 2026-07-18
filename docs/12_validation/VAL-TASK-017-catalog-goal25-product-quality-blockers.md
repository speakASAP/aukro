---
id: VAL-TASK-017-catalog-goal25-product-quality-blockers
status: reviewed
target: ../11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md
owner: Engineering
created: 2026-07-02
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md
  - ../21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md
---
# Validation Report: TASK-017 Catalog Goal 25 Product Quality Blockers

## Summary

Aukro now consumes Catalog-owned product quality/readiness evidence for from-Catalog product selection, draft creation, and publish-adjacent policy checks. Mandatory Catalog blockers fail closed before draft creation, direct Catalog-linked offer create/update, sync-from-Catalog writes, and publish-adjacent queueing. Unavailable Catalog quality evidence is also blocking.

## Upstream goal

This validates the Aukro consumer slice for Catalog Goal 25 product quality review blockers under policy `catalog.product_quality.v1`.

## Criteria checked

| Criterion | Status | Evidence |
|---|---|---|
| Mandatory Catalog blockers block draft creation | Pass | Focused offer service spec rejects `missing_description` before draft create and create count remains zero. |
| EAN remains optional/non-blocking | Pass | Focused offer service spec includes `missing_ean` warning alongside a mandatory blocker; only `missing_description` blocks. |
| Unavailable quality evidence fails closed | Pass | Focused offer service spec rejects with `CATALOG_QUALITY_REVIEW_UNAVAILABLE` and create count remains zero. |
| Product picker surfaces and disables blocked candidates | Pass | `services/aukro-service/src/ui/ui.controller.ts` enriches paged candidates with Catalog quality blockers and disables selection when `catalogQualityCanActivate=false`. |
| Publish-adjacent policy checks include Catalog blocker evidence | Pass | Focused offer service spec blocks enqueue with `CATALOG_VALIDATION_FAILED` and records Catalog blocker `missing_title` under policy evidence. |
| Direct Catalog-linked offer mutations fail closed | Pass | Focused offer service spec rejects direct `create` on `duplicate_sku` and direct `update`/activation on `missing_image`; no Prisma create/update is called. |
| Sync-from-Catalog writes fail closed | Pass | Focused offer service spec skips create/update when readiness reports `missing_current_price` or when readiness is unavailable; `created=0`, `updated=0`, `policyBlocked=1`. |
| Forbidden ownership boundaries preserved | Pass | No Prisma schema, migrations, Kubernetes manifests, runtime secrets, Warehouse, Orders, Auth, or live Aukro executor mutation paths changed. |
| Direct API forwards Catalog auth for readiness | Pass | `POST /offers/from-catalog` now forwards the request `Authorization` header into `catalogAuthorization` when no explicit body override is supplied. |

## Command evidence

| Command | Result |
|---|---|
| `npm --prefix shared run build` | Pass |
| `cd services/aukro-service && npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/aukro/offers/offers.service.spec.ts` | Pass |
| `npm --prefix services/aukro-service run build` | Pass |
| `npm --prefix services/aukro-service test` | Pass |
| `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues` | Pass, score 100 of 100, findings 0 |
| `python3 scripts/pre_coding_gate.py --root .` | Pass, report `reports/validation/ips-pre-coding-gate.json` |
| `python3 scripts/deployment_readiness_gate.py --root . --target TASK-017` | Pass, report `reports/validation/ips-deployment-readiness-gate.json` |
| `git diff --check` | Pass |
| `cd services/aukro-service && npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/aukro/offers/offers.service.spec.ts` | Pass on 2026-07-03; added direct create/update and sync fail-closed coverage. |
| `npm --prefix services/aukro-service run build` | Pass on 2026-07-03. |
| `npm --prefix services/aukro-service test` | Pass on 2026-07-03. |
| `git diff --check` | Pass on 2026-07-03. |
| `./scripts/deploy.sh` | Pass, deployed `localhost:5000/aukro-service:4cdd671` |
| `kubectl rollout status deployment/aukro-service -n statex-apps --timeout=60s` | Pass, 1 updated / 1 available / 1 ready replica |
| `curl -i -sS -m 15 https://aukro.alfares.cz/health` | Pass, HTTP 200 `status=ok` |
| `curl -i -sS -m 15 https://catalog.alfares.cz/health` | Pass, HTTP 200 `status=healthy` |

## Issues found

No current-task validation failures remain.

2026-07-03 completion review found that `syncFromCatalog` and direct Catalog-linked create/update needed explicit pre-write quality coverage. The current code now checks Catalog quality before those mutations, and the focused spec proves the blocked/unavailable cases do not call Prisma create/update.

Strict audit initially failed because TASK-017 graph links and execution-plan template sections were incomplete. The TASK-017 graph and execution plan were completed and strict audit passed afterward.

Strict audit also reported a pre-existing false-positive path reference in `docs/12_validation/VAL-TASK-012-catalog-content-preview-drafts.md` where shorthand Kubernetes readiness text described one ready replica out of one. The line was reworded to "ready replicas one of one"; no TASK-012 behavior or evidence was changed.

## Recommendation

Accept TASK-017 for orchestrator review. After owner approval, commits `b462ffd` and `4cdd671` were pushed to the main remote branch, an obsolete orders-lifecycle branch was removed locally/remotely, and Aukro production rolled out successfully to image `localhost:5000/aukro-service:4cdd671`. The 2026-07-03 consumer completion pass did not deploy.

## Traceability confirmation

Vision -> `docs/01_vision/VISION.md` -> Feature -> `docs/10_features/FEAT-005-catalog-warehouse-publisher.md` -> Task -> `docs/11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md` -> Execution Plan -> `docs/21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md` -> Coding Prompt -> `docs/14_prompts/PROMPT-TASK-017-catalog-goal25-product-quality-blockers.md` -> Code -> Validation -> this report.
