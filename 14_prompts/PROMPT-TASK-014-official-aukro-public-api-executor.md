---
id: PROMPT-TASK-014-official-aukro-public-api-executor
status: approved
source_task: ../11_tasks/TASK-014-official-aukro-public-api-executor.md
execution_plan: ../21_execution_plans/EP-TASK-014-official-aukro-public-api-executor.md
context_package: ../13_context_packages/CP-TASK-014-official-aukro-public-api-executor.md
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
---
# PROMPT-TASK-014: Official Aukro Public API Executor

## Role

Act as an aukro-service backend worker implementing one bounded live-publication foundation under IPS governance. You are not alone in the codebase: preserve existing dirty worktree changes, do not revert other agents, and keep TASK-007 record-only semantics intact.

## Task

Implement a separate official Aukro Public API executor for live Aukro work. The executor must consume approved local publish intent as evidence, authenticate through the official API, build documented v2 offer payloads, upload images, create or update offers only when all gates pass, and record masked execution evidence. If runtime credentials or mapping evidence are missing, the executor must fail closed and expose readiness status without live mutation.

## Context

Use `13_context_packages/CP-TASK-014-official-aukro-public-api-executor.md`, `21_execution_plans/EP-TASK-014-official-aukro-public-api-executor.md`, the official Aukro docs at `https://api.aukro.cz/` and `https://api.aukro.cz/assets/openapi.yaml`, TASK-005 draft behavior, TASK-007 publish-intent behavior, TASK-012 content-preview behavior, TASK-013 dashboard bulk behavior, and the existing account/offer/order/workbench modules.

## Constraints

Do not publish through TASK-007, change TASK-007 enqueue semantics, use browser automation, scrape Aukro, use removed legacy endpoints, hard-code secrets, print tokens/API keys/passwords, store bearer tokens in local metadata, move catalog/warehouse/order ownership into aukro-service, modify protected intent documents, or run live mutation without an approved test listing and cleanup plan.

## Acceptance criteria

- New executor path is separate from TASK-007 record-only publish intent.
- Official API client authenticates with username/password plus `X-Aukro-Api-Key` and keeps bearer token in memory only.
- Protected calls include bearer and API key headers with masked logging.
- Missing credentials/config fail closed.
- Category, attributes, shipping template, media, stock, price, location, policy, approval, local idempotency, and rate-limit evidence are required before live create/update.
- Offer creation uses documented Aukro Public API v2 fields and image upload flow.
- Direct create idempotency is local because the documented direct create schema does not expose `extId`.
- Reconciliation/statistics use official read endpoints and webhook payloads with masked output.
- Synthetic tests cover success, failure, and replay paths.

## Validation

Run `git diff --check`, `npm --prefix services/aukro-service test`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/deployment_readiness_gate.py --root . --target TASK-014`. If credentials are available, run only masked non-mutating auth/read checks unless a live test listing is separately approved.
