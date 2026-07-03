# Orders Lifecycle UI Reliability Slice - Aukro

Vision -> Orders is the central lifecycle surface for customer and admin order visibility.
Goal Impact -> Aukro dashboard and admin service panel expose central lifecycle fields with complete label coverage and visible refresh.
System -> Aukro server-rendered dashboard reads local Aukro orders enriched with central Orders read-model fields; Orders remains system of record.
Feature -> Dashboard sold-products panel and admin stats expose central lifecycle/status fields, polling, and manual Orders refresh.
Task -> Add smallest source-level dashboard improvement and verifier/spec coverage for all central lifecycle stages.
Execution Plan -> Update only UI controller/dashboard assets, add source verifier, and extend focused UI controller spec.
Coding Prompt -> Worker Frontend-B shared Alfares Orders reliability slice for Allegro, Bazos, and Aukro.
Code -> services/aukro-service/src/ui/ui.controller.ts, services/aukro-service/src/ui/ui.controller.spec.ts, scripts/verify-orders-lifecycle-ui.js.
Validation -> node scripts/verify-orders-lifecycle-ui.js passed; focused ui.controller.spec.ts passed through local ts-node binary; cd services/aukro-service && npm run build passed.

Covered central lifecycle stages: ordered_unpaid, payment_failed, paid_not_delivered, warehouse_fulfillment_requested, warehouse_collecting, warehouse_forming, warehouse_formed, handed_to_delivery, in_delivery, received, not_received, returned, cancelled.

Sensitive-data boundary: validation reports aggregate source coverage only and does not print tokens, customers, order rows, tracking values, provider payloads, or DB rows.

[MISSING: runtime browser smoke after deploy]
[UNKNOWN: whether current production bundle already contains this source change before deploy]
