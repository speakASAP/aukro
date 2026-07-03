# Goal 24 Aukro Bundle Publication Policy

```yaml
id: GOAL24-AUKRO-BUNDLE-PUBLICATION-POLICY
status: source-complete-validated
owner_role: aukro worker
repository: /home/ssf/Documents/Github/aukro
scope: Aukro-owned docs/verifier/source-policy for Catalog catalog.bundle.v1
live_marketplace_mutation: not run
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: aukro-service safely manages Aukro offer publication only from validated Catalog, Warehouse, policy, and operator evidence.
- Goal Impact: Goal 24 bundle discovery can proceed without accidentally making Aukro sell a multi-product Catalog bundle as one external listing before channel policy exists.
- System: Catalog owns `catalog.bundle.v1`; Aukro owns channel-specific draft, publish, and marketplace policy gates; Warehouse, Orders, and Payments remain authoritative for reservation, fulfillment, and money movement.
- Feature: Aukro offer policy fail-closed gate for Catalog bundle-shaped publication evidence.
- Task: address `[MISSING: channel-specific external marketplace bundle publication policies]` for Aukro without live publish, provider state mutation, or cross-repo edits.
- Execution Plan: change only Aukro-owned policy/types/tests/docs, keep `catalog.bundle.v1` single-listing publication blocked, and validate with focused specs, build/doc gates, and diff check.
- Coding Prompt: do not edit Catalog, Orders, Warehouse, Payments, Allegro, Bazos, Kubernetes manifests, deploy scripts, migrations, secrets, or unrelated work. Do not run live Aukro publish/queue/confirmation.
- Code: `OfferPolicyService` adds optional bundle-specific evidence that is enforced when detected and caller-supplied passing evidence cannot override an Aukro-derived bundle blocker.
- Validation: focused policy/offers specs, service build, IPS docs gates, and `git diff --check`.
- State Update: source policy documents that `catalog.bundle.v1` cannot be published as one external Aukro listing under current rules.

## Policy Decision

Aukro cannot publish a Catalog `catalog.bundle.v1` aggregate as one external listing under current rules. The current Catalog bundle model is `pricePolicy=checkout_authoritative` and does not provide Aukro-owned evidence for all external-listing requirements:

- authoritative bundle price and discount/free-shipping policy for the Aukro listing;
- component stock reservation and availability semantics owned by Warehouse;
- shipping template/package semantics for multiple component products;
- mapping from one external Aukro offer/order back to component Catalog products and downstream Orders/Payments behavior;
- owner-approved marketplace compliance policy for bundled goods and prohibited/conditional category combinations.

Therefore Aukro must fail closed for `publicationMode=single_external_listing` when Catalog input is bundle-shaped (`contractVersion=catalog.bundle.v1`, `productKind=catalog_bundle`, or equivalent source snapshot evidence). Normal component products remain governed by existing catalog/account/category/parameter/media/stock/price/duplicate/AI/human/rate-limit/idempotency gates.

## Catalog Handoff Resolution

- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff]`
- Aukro-owned policy reference: `16_operations/AUKRO_PLATFORM_RULES.md#catalog-bundle-publication-boundary`.
- Aukro-owned validation reference: `reports/validation/2026-07-03-goal24-aukro-bundle-publication-policy.md`.
- Runtime policy reference: `aukro.catalog_bundle_publication.v1` emits `CATALOG_BUNDLE_PUBLICATION_FAILED` for `publicationMode=single_external_listing` until a future owner-approved implementation contract exists.
- Allowed current scope: ordinary component listings may proceed only through existing Aukro product policy gates; `catalog.bundle.v1` may be used only as read-only/operator context and must not publish, queue, regenerate, confirm, mutate, or sync an external Aukro offer/listing/feed row as one bundle listing.

## Parallel Execution

No parallel worker is started for this Aukro lane because the safe change set is a single shared policy surface. Parallel downstream work remains dependency-gated:

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aukro policy gate | ready now | Aukro worker | Block `catalog.bundle.v1` as one external Aukro listing | Aukro offer policy/types/tests/docs | Catalog, Orders, Warehouse, Payments, provider state | Catalog bundle contract reviewed | focused specs, build, docs gates, diff |
| Catalog bundle publish contract | blocked | Catalog/integration owner | Define if bundles can be exposed to channels with stable policy evidence | Catalog bundle contract docs/source | Aukro source | `[MISSING: approved external marketplace bundle publication contract]` | Catalog contract validation |
| Orders/Warehouse/Payments integration | blocked | commerce integration owner | Define reservation, checkout/order/payment behavior for one listing with multiple components | [MISSING: approved files] | Aukro live publish | `[MISSING: bundle reservation/order/payment contract]` | end-to-end non-live contract tests |
| Aukro live executor enablement | blocked | Aukro owner | Allow bundle live publish only after all bundle evidence exists | future Aukro executor policy files | current provider state, secrets | all blockers resolved and owner-approved test listing | masked dry-run/live approval evidence |

Integration owner: original Goal 24 orchestrator. Validation owner: Aukro worker for this branch. Merge order: Aukro fail-closed policy first, shared bundle contract later, live executor enablement last.

## Blockers

- `[MISSING: approved external marketplace bundle publication contract for catalog.bundle.v1]`
- `[MISSING: Warehouse bundle reservation and availability contract for a single external listing]`
- `[MISSING: Orders bundle create-order and component allocation contract for Aukro orders]`
- `[MISSING: Payments/totals/refund behavior for bundled external marketplace orders]`
- `[MISSING: Aukro shipping template/package policy for multi-component bundles]`
- `[MISSING: owner-approved live Aukro bundle test listing and cleanup plan]`
