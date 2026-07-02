# E-Commerce Dashboard Catalog Source Options - Cross-Repo Plan

```yaml
id: CROSS-REPO-ECOM-DASHBOARD-CATALOG-SOURCES-2026-07-02
status: audit-and-source-integration
created: 2026-07-02
owner: Catalog integration/orchestration owner
repositories:
  in_scope:
    - catalog-microservice
    - bazos
    - heureka
    - allegro
    - aukro
    - flipflop
  candidate_or_dependency_review:
    - shop-assistant
    - chytrakoupe
    - rent-a-box
source_request: user personal-account catalog options across Bazosh/Bazos, Evrika/Heureka, Allegro, Aukro, FlipFlop, and adjacent e-commerce projects
```

## Vision

Every registered seller/customer account in Alfares e-commerce surfaces can work from the dashboard with a unified Catalog-backed product source model: own products, Alfares/company products, and products that other users explicitly publish for resale.

## Goal Impact

The platform becomes a shared commerce network instead of isolated channel tools. Users can add their own goods, opt selected goods into shared resale, and build assortments from their own products, Alfares products, and community products while marketplace publication remains bound to the current user's channel account and compliance gates.

## System

- Auth owns registration, hosted login/callback, token validation, and user identity.
- Catalog owns product truth, ownership, source settings, resale visibility, source-scoped reads, and Catalog-side publication eligibility.
- Channel services own marketplace accounts, local drafts, external publication, policy checks, pacing, and marketplace-specific status.
- FlipFlop storefront owns public browsing/cart/checkout; user product source management must remain separate from anonymous storefront browsing.
- Warehouse remains stock authority. Orders and Payments are outside this source-options audit unless a publish flow explicitly depends on them.

## Feature Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| R1 | User can work with Alfares/company catalog products from the personal account | Dashboard exposes a visible option or enabled source path to include/select Alfares catalog products, backed by Catalog human-token scope. |
| R2 | User can upload/manage own product data | Dashboard has create/import/edit product flow that creates Catalog products owned by the authenticated user. |
| R3 | User can publish own products for common resale | Owner UI exposes a resale/public-sharing option, backed by `resaleEnabled`/equivalent owner-only mutation. |
| R4 | User can load/select own, other users' shared products, and company products | Product picker/list uses Catalog effective source scope or explicit source checkboxes for own + Alfares + community products. |
| R5 | Non-owned products remain read-only in Catalog | Users can publish/select eligible shared products but cannot mutate another seller's or Alfares canonical product record. |
| R6 | Channel publication remains user-owned | Drafts/listings are created under the current user's marketplace identity/account, not a global account unless an approved service-owned path already exists. |

## Intent Preservation Chain

- Vision: shared Catalog-backed product sourcing in every e-commerce dashboard.
- Goal Impact: increase sellable assortment and resale reach without losing ownership, stock, or channel-compliance boundaries.
- System: Catalog/Auth/channel/warehouse boundaries above.
- Feature: dashboard source options, own-product creation, owner resale publication, effective source picker.
- Task: inspect each personal cabinet, fill missing UI/API wiring, and validate evidence per repo.
- Execution Plan: parallel workstreams below with disjoint repo ownership and Catalog as integration owner.
- Coding Prompt: each worker must use this document plus repo AGENTS.md/STATE, touch only allowed files, and preserve dirty worktree changes.
- Code: source changes only inside the owning repo/workstream after audit confirms a gap.
- Validation: static source evidence, focused tests/builds, and runtime smoke only when approved token/deploy gates exist.

## Current Shared Catalog Evidence To Verify

- Catalog exposes `POST /api/catalog/access/provision`, `GET/PATCH/PUT /api/catalog/settings`.
- Catalog product reads support `catalogScope=own|effective|alfares|community|all` and `catalogSources=own,alfares,community`.
- Catalog products include `owner_user_id` and `resale_enabled` source semantics.
- Catalog frontend has source checkboxes for Alfares and community products and product forms expose resale publishing.
- Channel dashboards must forward the human bearer token and request effective source scope where they provide personal-account product pickers.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Expected output | Validation evidence |
|---|---|---|---|---|---|---|---|
| WS-CATALOG | ready now / integration owner | Catalog backend+frontend verifier | Confirm source settings, effective scope, resale flag, dashboard controls, and docs consistency. | `catalog-microservice/src/catalog-access/**`, `src/products/**`, `services/frontend/**`, docs/reports if needed | Auth JWT shape, Warehouse/Orders/Payments, secrets, production DB mutation | Matrix proving R1-R5 at shared source. | focused Catalog tests/build or exact blocker. |
| WS-BAZOS-HEUREKA | running read-only audit | Channel UI verifier | Bazos and Heureka dashboards/product pickers. | read-only first; code only after orchestrator assigns disjoint files | dirty unrelated files, deploy scripts, secrets | Present/missing/unknown matrix. | file evidence and commands. |
| WS-ALLEGRO-AUKRO | running read-only audit | Channel UI verifier | Allegro and Aukro dashboards/product pickers. | read-only first; code only after orchestrator assigns disjoint files | dirty unrelated files, deploy scripts, secrets | Present/missing/unknown matrix. | file evidence and commands. |
| WS-FLIPFLOP-CANDIDATES | running read-only audit | Channel/storefront classifier | FlipFlop plus shop-assistant, chytrakoupe, rent-a-box classification. | read-only first; code only after orchestrator assigns disjoint files | active unrelated FlipFlop GOAL-12 files, deploy scripts, secrets | In-scope/out-of-scope decision and matrix. | file evidence and commands. |
| WS-INTEGRATION | final integration | Orchestrator | Merge audit results, update plan/status, decide if code changes/deploys are needed. | docs/orchestrator, validation reports, narrowly assigned code gaps | uncoordinated shared schema/contract edits | Final status, blockers, validation summary. | cross-repo git status and validation results. |

## Merge And Deployment Order

1. Catalog contract/source verification.
2. Per-channel dashboard UI/API verification or small disjoint fixes.
3. Integration documentation update across affected repos.
4. Validation gates per repo.
5. Deploy only after repo preflight, validation evidence, and deploy gate. No deploy is implied by this initial audit plan.

## Known Dirty Worktree Caveats At Plan Creation

- `bazos`: branch ahead by one commit and `services/aukro-service/src/ui/ui.assets.ts` is dirty; do not overwrite unless owning that exact UI fix.
- `heureka`, `allegro`, `aukro`: branch ahead by one commit; inspect before new commits or deploys.
- `flipflop`: active unrelated GOAL-12 upsell/product-detail edits are present; do not touch or revert them.
- `catalog-microservice`: clean at initial preflight.
- Adjacent candidates are classified before code changes.

## Validation Matrix

| Case | Expected result |
|---|---|
| New authenticated user opens dashboard | Own product source is available; source settings can be provisioned. |
| User creates/imports product | Product is owned by current Auth subject. |
| User toggles product resale | Only owner/admin can set product available for resale. |
| User enables Alfares source | Company products appear/select in effective product picker. |
| User enables community source | Other users' `resaleEnabled=true` products appear/select in effective product picker. |
| User edits non-owned product | Forbidden or UI hides mutation controls. |
| User publishes selected product | Channel-specific draft/listing binds to current user's channel account. |

## Open Items

- `[UNKNOWN: exact runtime Auth token for authorized end-to-end smoke in every dashboard]`
- `[UNKNOWN: final localized dashboard copy for every language]`
- `[UNKNOWN: whether shop-assistant, chytrakoupe, and rent-a-box have personal-account product-source obligations in this first wave]`
- `[MISSING: sub-agent audit results for each channel dashboard]`
