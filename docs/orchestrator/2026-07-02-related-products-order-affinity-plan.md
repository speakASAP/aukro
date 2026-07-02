# Ecosystem Related Products And Order-Affinity Plan

```yaml
id: ECOSYSTEM-RELATED-PRODUCTS-ORDER-AFFINITY
status: active
owner: ecosystem commerce orchestration
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: implementation-started
upstream:
  - owner request on 2026-07-02
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system
chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation
```

## Vision

Every Alfares sales channel should learn which products are bought together or bought by the same buyer over time, then use that evidence to show related products, build buy-together sets, improve campaign targeting, and prepare marketplace-specific product bundles without copying customer, payment, address, or marketplace credential data across services.

## Goal Impact

- Increase average order value through related products and buy-together sets.
- Use real purchase evidence instead of hand-written guesses as the first ranking signal.
- Keep Catalog as product truth, Orders as purchase truth, Marketing as campaign/segment owner, Warehouse as stock authority, Payments as payment truth, and channel services as publication/storefront owners.
- Make FlipFlop the first customer-facing implementation surface.
- Keep Allegro, Aukro, and Bazos as operator/channel publication surfaces until a real customer checkout surface exists there.

## System Ownership

| System | Ownership |
| --- | --- |
| Orders | Canonical order records, order items, lifecycle events, idempotent create-order contract. |
| Catalog | Product identity, product relation scores, bundle definitions, product metadata, pricing metadata, marketplace profile metadata. |
| Marketing | Campaigns, segments, post-purchase/cross-sell usage of approved product refs, no raw order/customer/payment truth. |
| FlipFlop | Customer storefront, product detail related-products UI, display-only buy-together set, cart add actions. |
| Allegro/Aukro/Bazos | Operator-facing channel publishing, draft/product suggestion surfaces, no customer bundle checkout unless later implemented. |
| Warehouse | Stock/availability/reservation truth for all real sellable bundles. |
| Payments | Payment totals and payment-provider reconciliation. |

## Contract Decisions

1. Orders emits bounded purchase-item evidence on `orders.order.created.v1`.
   - Approved additive payload: `payload.items[]` with `productId`, optional `sku`, `quantity`, optional `unitPrice`, optional `totalPrice`, and optional `payload.currency`.
   - Forbidden: customer/contact/address/payment/tracking/provider/warehouse reservation details.
   - This is event evidence, not permission to mutate Catalog, checkout totals, stock, or payment totals.

2. Catalog owns durable relation and bundle metadata.
   - Product relation rows should store `sourceProductId`, `targetProductId`, `relationType`, `score`, `confidence`, `source`, `evidence`, and timestamps.
   - Product bundles should be separate Catalog aggregates until Orders/Warehouse/Payments/channel checkout contracts support real bundle selling.
   - Do not overload `tags`, `seoData`, marketplace profile JSON, pricing rows, or ordinary products for relation storage.

3. Marketing consumes product refs only after contract compatibility.
   - Marketing may accept `catalog:product:<id>` refs from Orders events.
   - Marketing must not persist raw order-item truth in the lifecycle table unless a separate aggregate contract is approved.
   - Campaign execution remains governed by existing approval/consent/suppression contracts.

4. Selling sets above free-shipping threshold is a pricing/checkout contract, not only a UI label.
   - Display-only set previews are allowed.
   - Real discounts, free-shipping application, payment amount changes, or order total changes require Orders + Payments + Warehouse + channel validation.

## Data Model Plan

### Orders Event Evidence

```json
{
  "type": "orders.order.created.v1",
  "payload": {
    "orderId": "order-1001",
    "channel": "flipflop",
    "items": [
      {
        "productId": "catalog-product-1001",
        "sku": "SKU-1001",
        "quantity": 1,
        "unitPrice": 490,
        "totalPrice": 490
      }
    ],
    "currency": "CZK"
  }
}
```

### Catalog Product Relations

Recommended table:

```text
product_relation_scores
- id uuid primary key
- source_product_id uuid not null
- target_product_id uuid not null
- relation_type text not null
- score numeric not null
- confidence numeric not null
- source text not null
- evidence jsonb null
- created_at timestamp not null
- updated_at timestamp not null
```

Rules:

- `source_product_id != target_product_id`.
- Store directional rows even when evidence is symmetric, so storefronts can ask for `sourceProductId`.
- `score` is ranking strength; `confidence` is evidence quality.
- `source` examples: `manual`, `orders_copurchase`, `same_buyer`, `category_fallback`, `marketplace_operator`.
- `evidence` must be aggregate and non-sensitive; no order IDs if avoidable, no customer data, no addresses, no payment refs.

### Catalog Bundles

Recommended future tables:

```text
product_bundles
- id uuid primary key
- title text not null
- status text not null
- source text not null
- pricing_policy jsonb null
- evidence jsonb null

product_bundle_items
- bundle_id uuid not null
- product_id uuid not null
- quantity integer not null
- role text null
```

Bundle selling remains blocked until Warehouse reservation, Orders create-order, Payments total, shipping/free-delivery, and channel publication contracts are approved.

## Parallel Execution

| Workstream | Status | Owner | Scope | Allowed files | Forbidden files | Validation | Handoff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 Orders event evidence | implementation-started | Orders producer owner | Add bounded `items[]` to `orders.order.created.v1` | `src/orders/*`, event fixtures, `scripts/verify-event-contracts.js`, Orders docs | DB schema, secrets, customer/payment/address/tracking fields | `npm run build`, `npm run verify:event-contracts`, `git diff --check` | Deploy only after Marketing compatibility is present. |
| W2 Marketing compatibility | implementation-started | Marketing consumer owner | Accept bounded product refs without persisting raw item truth | `src/order-lifecycle-events.ts`, tests, Marketing contract docs | Campaign execution changes, raw order/customer/payment persistence | focused node test, `npm run build`, `git diff --check` | Enables safe Orders deploy. |
| W3 Catalog product relations | ready now | Catalog product metadata owner | Add relation score storage/API/docs | Catalog relation module, migration, docs, focused tests | Orders/Marketing/channel repos, live DB/deploy | focused Jest, `npm run build`, frontend build if touched | Integration owner maps Orders-derived future scorer into Catalog. |
| W4 Catalog bundles | dependency-gated | Catalog commerce owner | Add bundle definition model/API | Catalog bundle module/docs/migration | Checkout/payment/warehouse mutations | build + focused tests | Wait for W3 API and bundle ownership decision. |
| W5 FlipFlop storefront | dependency-gated/partially active | Storefront owner | Product detail related UI and display-only buy-together set | Existing GOAL-12 files | Checkout totals/payment/discount mutation | product-service build, frontend build, smoke | Reconcile existing dirty GOAL-12 lane first. |
| W6 Marketplace operator suggestions | dependency-gated | Channel owners | Show related products/bundle candidates in operator publication tools | channel UI/API docs | live marketplace mutation, checkout bundles | service/frontend builds | Start after Catalog relation read API exists. |
| W7 Real bundle selling | blocked | Integration owner | Cart/order/payment/warehouse shipping policy | [MISSING: approved files] | unapproved total changes | end-to-end checkout/payment tests | Needs explicit pricing/free-shipping contract. |

## Merge Order

1. Orders additive event contract and verifier.
2. Marketing compatibility with new event shape.
3. Catalog product relation storage/read API.
4. FlipFlop read-only storefront recommendations from Catalog relation API or local fallback.
5. Channel operator suggestion surfaces.
6. Catalog bundle definitions.
7. Real bundle selling after checkout/payment/warehouse/free-shipping contract approval.

## Validation Gates

- Contract fixtures must contain no PII/secrets/payment/address/tracking fields.
- Event consumers must accept both old created events without `items[]` and new created events with bounded `items[]`.
- Catalog relation APIs must validate access scope and deterministic ordering.
- Storefront UI must not claim real discounts or free shipping unless checkout/order/payment contracts apply them.
- Marketplace channels must not publish external bundle offers without channel policy validation.

## Current Implementation Evidence

- Orders producer contract update is started in `/home/ssf/Documents/Github/orders-microservice`.
- Marketing compatibility update is started in `/home/ssf/Documents/Github/marketing-microservice`.
- Catalog implementation is delegated as an independent Catalog-only product-relations lane.
- FlipFlop already has dirty GOAL-12 backend upsell work; frontend integration remains unresolved.

## Blockers

- `[MISSING: approved durable ownership for automated affinity scorer]`
- `[MISSING: Catalog bundle ownership decision: standalone aggregate vs product-like SKU]`
- `[MISSING: Warehouse bundle reservation contract]`
- `[MISSING: Orders bundle create-order contract]`
- `[MISSING: Payments/free-shipping/discount total contract]`
- `[MISSING: channel-specific external marketplace bundle publication policies]`
- `[UNKNOWN: live DB migration state for each service unless separately verified]`

## Coding Prompt

Implement only the workstream assigned to this repository. Preserve service ownership boundaries. Do not copy raw customer, address, payment, tracking, provider, or credential data into related-products artifacts. Keep all new contracts additive where possible, use focused validation, and record remaining blockers with `[MISSING: ...]` or `[UNKNOWN: ...]`.

## Next Validation

- Orders: `npm run build && npm run verify:event-contracts && git diff --check`.
- Marketing: `npx tsx --test --test-concurrency=1 test/order-lifecycle-events.test.ts && npm run build -- --pretty false && git diff --check`.
- Catalog: focused product-relations tests, `npm run build`, `git diff --check`.
- FlipFlop: reconcile GOAL-12 dirty files, then product-service and frontend builds.
