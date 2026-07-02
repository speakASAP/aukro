# W4c Availability Propagation - Aukro

Date: 2026-07-02
Role: W4c Bazos/Aukro/Heureka Consumer Foundation worker
Repo: `/home/ssf/Documents/Github/aukro`

## Intent Chain

Vision -> Aukro offers are created/updated only from validated Catalog products and synchronized with Warehouse stock.
Goal Impact -> Catalog non-sellability and Warehouse zero-stock must remove linked Aukro offers from local offerable surfaces.
System -> `aukro-service` RabbitMQ consumers.
Feature -> Availability propagation for Catalog lifecycle and Warehouse stock events.
Task -> Add local fail-closed consumers without external Aukro mutation.
Execution Plan -> Reuse `AukroOffer.productId`, `isActive`, `stockQuantity`, and `rawData` evidence.
Coding Prompt -> W4c option 2 product availability propagation.
Code -> Catalog consumer plus zero-stock-safe Warehouse stock consumer.
Validation -> focused subscriber specs, shared build, service build, `git diff --check`.

## Runtime Behavior

- Warehouse `stock.out` and zero `stock.updated` set linked `AukroOffer.stockQuantity=0` and `isActive=false`.
- Positive `stock.updated` refreshes local stock cache only and does not reactivate offers.
- Catalog product archived/deleted/inactive and sellability false events set linked offers inactive with stock zero.
- Replayed events are idempotent via `rawData.warehouseStockSync.eventId` or `rawData.catalogProductAvailabilitySync.eventId`.

## Blockers

- `[MISSING: approved Aukro external de-listing endpoint/policy]`
- `[MISSING: safe catalog-event refresh policy]` for sellable `updated`, `upserted`, or `category_changed` events.
- `[UNKNOWN: live Catalog RabbitMQ exchange/routing configuration]`; defaults are documented in `.env.example`.

## External Mutation

No Aukro Public API endpoint is called. The handler only changes local `AukroOffer` state and records blockers in `rawData`.
