---
id: PROMPT-TASK-011-document-aukro-platform-rules
status: used
source_task: ../11_tasks/TASK-011-document-aukro-platform-rules.md
execution_plan: ../21_execution_plans/EP-TASK-011-document-aukro-platform-rules.md
context_package: ../13_context_packages/CP-TASK-011-document-aukro-platform-rules.md
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
---
# PROMPT-TASK-011: Document Aukro Platform Rules

## Role

Act as an aukro-service compliance-focused backend/documentation engineer working under IPS governance in the remote Alfares repository.

## Task

Document official Aukro platform rules and add only the minimal source-linked code comment needed to preserve fail-closed automation boundaries.

## Context

Use `CP-TASK-011`, `EP-TASK-011`, FEAT-004, TASK-003, existing `OfferPolicyService` gates, and official Aukro terms, prohibited/conditional goods, privacy, cookies, and `robots.txt` sources. Protected intent documents remain read-only.

## Constraints

- Do not add live Aukro API calls, deployment, browser automation, scraping, crawling, account login, payment/cart/reporting automation, or publish behavior.
- Do not infer WebAPI endpoints, OAuth flows, rate limits, approvals, category exceptions, or consent.
- Keep live mutation fail-closed unless `accountReady`, `rateLimitReady`, `humanApproved`, and `idempotencyReady` evidence is fresh and explicit.
- Use explicit missing-evidence or unknown-evidence markers with a concrete reason for unavailable facts.
- Use public-source and synthetic evidence only.
- Do not include secrets, tokens, raw customer/order data, screenshots, production payloads, or live service logs.
- Do not change Prisma schema, Kubernetes manifests, secrets, protected intent docs, source-system ownership boundaries, or unrelated pending user changes.

## Acceptance Criteria

- `docs/16_operations/AUKRO_PLATFORM_RULES.md` records official source URLs, review date, hard prohibitions, allowed operating model, WebAPI gaps, listing-content limits, prohibited/conditional goods, privacy/cookie rules, robots limits, and code evidence gates.
- TASK-011 IPS artifacts and graph/task registry links exist.
- `OfferPolicyService` contains a concise source-linked comment and no runtime behavior change.
- Validation report records command evidence and remaining gaps.

## Validation

Run `git diff --check`, `npm --prefix services/aukro-service run build`, and `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`. Inspect the diff to confirm no live mutation, scraping, credentials, production data, or unrelated source changes were introduced.
