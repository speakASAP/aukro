---
id: VAL-TASK-015-mp-xml-feed-executor
status: reviewed
target: ../11_tasks/TASK-015-mp-xml-feed-executor.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: partial
upstream:
  - ../11_tasks/TASK-015-mp-xml-feed-executor.md
  - ../21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md
---
# Validation Report: TASK-015 MP XML Feed Executor

## Summary

Validation report for the first TASK-015 runtime slice. The MP XML generator, mapper evidence types, synthetic fixtures, deterministic checksum/statistics, duplicate `ExternalId` guard, and service test integration are implemented. Public feed endpoint, MP activation, transaction export ingestion, and live marketplace mutation are not implemented.

## Upstream goal

TASK-015 supports `GOAL-AUKRO-001` by defining a separate fallback lane for approved catalog products to become a validated MP XML feed while preserving TASK-014 official Public API and TASK-007 record-only boundaries.

## Criteria checked

| Criterion | Result | Evidence |
|---|---|---|
| MP XML lane is separate from TASK-014 official API executor | Pass | New code is isolated under `services/aukro-service/src/aukro/mp-feed/`. |
| MP XML lane preserves TASK-007 record-only publish intent | Pass | No TASK-007/offers enqueue files were changed. |
| XML uses stable catalog-derived `ExternalId` | Pass | Mapper normalizes catalog product id to stable `catalog-*` `ExternalId`. |
| Duplicate `ExternalId` is blocked | Pass | Generator throws `MP_FEED_DUPLICATE_EXTERNAL_ID`; synthetic test covers it. |
| Missing policy, approval, category, shipment, price, stock, media, or account evidence fails closed | Pass | Mapper throws typed `MpFeedValidationError` for missing/failed evidence. |
| Feed limits `10 MB` and `10000` products are enforced | Pass | Generator enforces byte and product limits; synthetic tests cover both. |
| Generated XML is deterministic, escaped, and well-formed by construction | Pass | Synthetic tests cover escaped text, stable ordering, checksum determinism, auction and buy-now fixtures. |
| Public feed is disabled by default | Pass for current slice | No public endpoint or activation path was added. |
| Transaction export is classified as read/statistics source only | Pass | Docs separate it from product publication. |
| Live MP automatic import remains blocked | Pass | No MP UI activation, public URL, running-offer update, or missing-template removal was implemented. |
| No secrets/raw production data/customer identifiers in TASK-015 artifacts | Pass | Tests use synthetic fixtures only. |

## Gate evidence

TASK-015 documentation passed strict audit, graph YAML parse, and diff whitespace checks. Runtime targeted test, TypeScript noEmit, full service test, and service build passed. Repository-level pre-coding and deployment-readiness gates pass for the current TASK-015 state.

## Sensitive-data scan evidence

Current TASK-015 planning docs and runtime fixtures include no secret values, bearer tokens, raw customer data, or raw production orders. API access request was sent by the user, but returned API keys must remain outside repository documents and logs.

## Command evidence

| Command | Result |
|---|---|
| `python3 -c/yaml.safe_load` for `graph/project_graph.example.yaml` | Pass |
| `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues` | Pass, score 100/100, findings 0 |
| `git diff --check` | Pass |
| `python3 scripts/pre_coding_gate.py --root .` | Pass |
| `python3 scripts/deployment_readiness_gate.py --root . --target TASK-015` | Pass |
| `services/aukro-service/node_modules/.bin/ts-node --compiler-options '{"types":["node"]}' services/aukro-service/src/aukro/mp-feed/mp-feed.spec.ts` | Pass |
| `cd services/aukro-service && npx tsc --noEmit --incremental false --pretty false` | Pass |
| `LOGGING_SERVICE_URL=http://127.0.0.1:9999 npm --prefix services/aukro-service test` | Pass, includes `services/aukro-service/src/aukro/mp-feed/mp-feed.spec.ts` |
| `npm --prefix services/aukro-service run build` | Pass |

## Live Mutation Gate

Live MP automatic import is blocked until the owner approves the exact public feed URL, `Manažer prodeje - XML` template selection, update-running-offers behavior, missing-template removal behavior, rollback plan, and validation evidence. Official Public API work remains blocked until Aukro support provides or confirms `X-Aukro-Api-Key` and credential flow.

## Traceability Confirmation

Vision -> `docs/01_vision/VISION.md` -> System -> `docs/04_systems/SYS-001-aukro-service.md` -> Features -> `docs/10_features/FEAT-001-offer-management.md`, `docs/10_features/FEAT-005-catalog-warehouse-publisher.md`, `docs/10_features/FEAT-008-observability-reconciliation.md` -> Task -> `docs/11_tasks/TASK-015-mp-xml-feed-executor.md` -> Execution Plan -> `docs/21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md` -> Coding Prompt -> `docs/14_prompts/PROMPT-TASK-015-mp-xml-feed-executor.md` -> Code -> `services/aukro-service/src/aukro/mp-feed/` -> Validation -> `docs/12_validation/VAL-TASK-015-mp-xml-feed-executor.md`.

## Issues found

- Public HTTPS feed URL host and access-control strategy has not been selected.
- Complete production catalog-to-Aukro MP category/field/shipment/pricelist mapping is not verified.
- MP activation runbook with exact settings and rollback plan is not written.
- Production media URL readiness for candidate products is not verified.
- A separate transaction export ingestion/statistics task is needed if MP export is selected as a data source.
- Official MP XML field contract/schema still needs confirmation against Aukro before live activation.

## Recommendation

Accept the first TASK-015 runtime slice as a fallback XML generator foundation. Next implementation should add a disabled-by-default feed publication/readiness surface and a separate MP activation runbook, but live MP import must remain blocked until URL/security/mapping/rollback evidence exists.
