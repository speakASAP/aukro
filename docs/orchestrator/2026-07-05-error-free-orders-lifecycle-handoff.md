# Error-Free Orders Lifecycle Repo Handoff

status: active
created_at: 2026-07-05
master_plan: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-05-error-free-orders-lifecycle-master-plan.md

Use the master plan as the source of truth. This repo-local handoff exists so channel/warehouse agents preserve the same Intent Preservation chain and do not invent lifecycle contracts.

Required chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

Core invariant: Orders owns order lifecycle; Warehouse owns stock/reservations/fulfillment/delivery status; this repository may only implement its assigned adapter/UI/proof slice.

Parallel status: see master plan W2-W6. If the assigned workstream is blocked by auth, provider, live token, or runtime facts, record `[MISSING: ...]` with exact missing evidence and do not substitute an unsafe fallback.

Validation minimum: run this repository's existing order lifecycle verifier if present, plus a focused source/API/browser smoke only when a safe token/session is available. Never print secrets, raw tokens, raw customer data, raw delivery address payloads, raw payment details, or raw provider tracking payloads.
