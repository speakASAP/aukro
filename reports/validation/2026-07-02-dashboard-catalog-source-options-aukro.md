---
id: VAL-2026-07-02-dashboard-catalog-source-options-aukro
status: pass-with-follow-up
target: ../docs/orchestrator/2026-07-02-dashboard-catalog-source-options-plan.md
owner: Worker agent
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: complete
upstream:
  - ../docs/orchestrator/2026-07-02-dashboard-catalog-source-options-plan.md
---
# Validation Report: Aukro Dashboard Catalog Source Options

## Summary

The Aukro personal dashboard now exposes Catalog Dashboard entry points for managing products, adding a product, and source/resale settings. The Catalog candidate API and dashboard picker now support explicit `catalogSources=own,alfares,community` source filtering while preserving `catalogScope=effective` and the existing human bearer-token forwarding.

No raw offers ownership contract was changed. No local owner-only `resaleEnabled` mutation was exposed because the existing local Catalog update helper is not human-token scoped.

## Upstream goal

This validates the Aukro worker slice of `docs/orchestrator/2026-07-02-dashboard-catalog-source-options-plan.md`: personal-account Catalog source options for own products, Alfares/company products, and community resale products while keeping Catalog ownership and channel publication boundaries separate.

## Criteria checked

| Criterion | Status | Evidence |
|---|---|---|
| Manage Catalog products entry point exists | Pass | Dashboard side navigation and main dashboard panel link to `https://catalog.alfares.cz/dashboard/products`. |
| Add Catalog product entry point exists | Pass | Dashboard side navigation and main dashboard panel link to `https://catalog.alfares.cz/dashboard/products/new`. |
| Catalog source/resale settings entry point exists | Pass | Dashboard side navigation and main dashboard panel link to `https://catalog.alfares.cz/dashboard/settings`. |
| Explicit source filters exist | Pass | Dashboard picker checkboxes submit `catalogSources=own,alfares,community` to the Aukro UI catalog-products endpoint. |
| Backend query support exists | Pass | `ui.controller.ts` sanitizes source filters and forwards them to `CatalogClientService.searchProducts`. |
| Catalog client forwards source filters | Pass | `shared/clients/catalog-client.service.ts` appends sanitized `catalogSources` to Catalog product search. |
| Existing effective scope and human bearer forwarding remain | Pass | Product reads still use `catalogScope: 'effective'` and `authorization` from `humanAuthorizationOrThrow(req)`. |
| Owner-only local resale mutation | Follow-up | Local Aukro resale mutation path is not implemented; unsafe local update path was not exposed. |
| Raw offers ownership contract | Pass | No raw offers, Prisma, schema, queue, or ownership redesign was changed. |

## Command evidence

| Command | Result |
|---|---|
| `git diff --check` | Pass |
| `npm --prefix shared run build` | Pass |
| `npm --prefix services/aukro-service run build` | Pass after rebuilding shared generated declarations |
| `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues` | Pass, 100/100 |
| `python3 scripts/pre_coding_gate.py --root .` | Fail: pre-existing untracked related-products orchestrator plan matched the sensitive-data instruction scanner; current task files were not named in the finding |

## Gate evidence

Strict documentation audit passed. Pre-coding gate evidence was generated at `reports/validation/ips-pre-coding-gate.json` and currently records an unrelated finding in `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`.

## Invariant evidence

- AUKRO-INV-001 traceability: preserved through the cross-repo Catalog source plan and this validation report.
- AUKRO-INV-002 catalog validation: preserved; product selection still reads Catalog through effective scope before creating Aukro drafts.
- AUKRO-INV-003 domain ownership: preserved; Catalog remains product/source/resale owner, Aukro remains channel draft/publication owner.
- AUKRO-INV-004/AUKRO-INV-005 sensitive data and secrets: no secrets, raw production data, credentials, or deployment manifests were changed.
- AUKRO-INV-006 validation: command evidence is listed above.

## Sensitive-data scan evidence

No sensitive values were added by this task. The pre-coding gate failed on an unrelated pre-existing untracked related-products plan and should be handled by the owning plan worker or integration owner.

## Replay and determinism evidence

The change is deterministic UI/query construction and server-side query sanitization. No live marketplace mutation, database mutation, queue publication, or deployment was performed.

## Issues found

- Local Aukro resale mutation path is not implemented because `CatalogClientService.updateProduct` does not currently take a human bearer token or owner-scoped update options.
- Authorized runtime Auth token for end-to-end dashboard smoke is unknown; no browser/runtime smoke was run.
- Raw offers ownership caveat remains outside this task; channel drafts still bind to the resolved Aukro account, and raw ownership redesign was not attempted.
- Pre-coding gate is blocked by an unrelated untracked related-products plan scanner finding.

## Recommendation

Accept with follow-up. The dashboard now exposes the expected Catalog product/source entry points and source filters. Implement a local resale toggle only after Catalog exposes or documents a human-token owner-only mutation contract that Aukro can call safely.

## Traceability confirmation

Vision -> shared Catalog-backed product sourcing in every e-commerce dashboard -> Goal Impact -> larger sellable assortment without ownership loss -> System -> Catalog/Auth/channel boundary -> Feature -> dashboard source options and effective source picker -> Task -> Aukro worker slice -> Execution Plan -> `docs/orchestrator/2026-07-02-dashboard-catalog-source-options-plan.md` -> Coding Prompt -> current worker task -> Code -> `services/aukro-service/src/ui/ui.controller.ts` and `shared/clients/catalog-client.service.ts` -> Validation -> this report.
