---
id: VAL-TASK-015-mp-xml-feed-executor
status: reviewed
target: ../11_tasks/TASK-015-mp-xml-feed-executor.md
owner: Engineering
created: 2026-07-01
last_updated: 2026-07-01
completeness_level: complete
upstream:
  - ../11_tasks/TASK-015-mp-xml-feed-executor.md
  - ../21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md
---
# Validation Report: TASK-015 MP XML Feed Executor

## Summary

Validation report for the separate Aukro Manager Prodej XML feed fallback executor planning package. Runtime XML generation, public feed endpoint, transaction export ingestion, and live MP import activation are not implemented yet.

## Upstream goal

TASK-015 supports `GOAL-AUKRO-001` by defining a separate fallback lane for approved catalog products to become a validated MP XML feed while preserving TASK-014 official Public API and TASK-007 record-only boundaries.

## Criteria checked

| Criterion | Result | Evidence |
|---|---|---|
| MP XML lane is separate from TASK-014 official API executor | Pass | TASK-015 docs explicitly forbid modifying TASK-014 behavior. |
| MP XML lane preserves TASK-007 record-only publish intent | Pass | TASK-015 docs require separate feed artifacts and do not alter enqueue semantics. |
| XML uses stable catalog-derived `ExternalId` | Planned | Runtime mapper/serializer not implemented yet. |
| Missing policy, approval, category, shipment, price, stock, media, or account evidence fails closed | Planned | Runtime gates are planned and required before implementation closure. |
| Feed limits `10 MB` and `10000` products are enforced | Planned | Runtime generator is planned and must enforce these MP limits. |
| Generated XML is deterministic, escaped, and well-formed | Planned | Fixture tests are required before runtime closure. |
| Public feed is disabled by default | Planned | Endpoint/publication strategy is planned as disabled-by-default. |
| Transaction export is classified as read/statistics source only | Pass | Docs separate it from product publication. |
| Live MP automatic import remains blocked | Pass | Documentation states live import requires separate operator approval, exact settings, and rollback plan. |
| No secrets/raw production data/customer identifiers in TASK-015 artifacts | Pass | TASK-015 docs contain no secret values or raw customer/order data. |

## Gate evidence

TASK-015 documentation passed strict audit, graph YAML parse, and diff whitespace checks. Repository-level pre-coding and deployment-readiness gates remain blocked by an unrelated TASK-016 sensitive-data marker in `11_tasks/TASK-016-orders-create-synthetic-smoke.md`.

## Sensitive-data scan evidence

Current TASK-015 planning docs include no secret values, bearer tokens, raw customer data, or raw production orders. The only sensitive-data finding from the gate is outside TASK-015.

## Command evidence

| Command | Result |
|---|---|
| `python3 -c/yaml.safe_load` for `graph/project_graph.example.yaml` | Pass |
| `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues` | Pass, score 100/100, findings 0 |
| `git diff --check` | Pass |
| `python3 scripts/pre_coding_gate.py --root .` | Fail, unrelated TASK-016 marker `include raw customer` |
| `python3 scripts/deployment_readiness_gate.py --root . --target TASK-015` | Fail because pre-coding gate fails on unrelated TASK-016 marker; TASK-015 validation report target exists |

## Live Mutation Gate

Live MP automatic import is blocked until the owner approves the exact public feed URL, `Manažer prodeje - XML` template selection, update-running-offers behavior, missing-template removal behavior, rollback plan, and validation evidence.

## Traceability Confirmation

Vision -> `01_vision/VISION.md` -> System -> `04_systems/SYS-001-aukro-service.md` -> Features -> `10_features/FEAT-001-offer-management.md`, `10_features/FEAT-005-catalog-warehouse-publisher.md`, `10_features/FEAT-008-observability-reconciliation.md` -> Task -> `11_tasks/TASK-015-mp-xml-feed-executor.md` -> Execution Plan -> `21_execution_plans/EP-TASK-015-mp-xml-feed-executor.md` -> Coding Prompt -> `14_prompts/PROMPT-TASK-015-mp-xml-feed-executor.md` -> Code -> Validation -> `12_validation/VAL-TASK-015-mp-xml-feed-executor.md`.

## Issues found

- Public HTTPS feed URL host and access-control strategy has not been selected.
- Complete catalog-to-Aukro MP mapping is not implemented.
- Runtime XML generator and fixture tests are not implemented.
- MP activation runbook with exact settings and rollback plan is not written.
- Production media URL readiness for candidate products is not verified.
- A separate transaction export ingestion/statistics task is needed if MP export is selected as a data source.
- Repository-level pre-coding/deployment gates are blocked by unrelated TASK-016 documentation text.

## Recommendation

Use this planning package to launch separate implementation workers. Do not activate MP automatic import until runtime validation, public URL readiness, exact MP settings, and rollback evidence are complete. Resolve the unrelated TASK-016 gate marker before relying on repository-level deployment-readiness status.
