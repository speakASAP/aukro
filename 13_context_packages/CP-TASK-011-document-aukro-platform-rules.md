---
id: CP-TASK-011
status: reviewed
owner: Engineering
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
upstream:
  - 11_tasks/TASK-011-document-aukro-platform-rules.md
downstream:
  - 14_prompts/PROMPT-TASK-011-document-aukro-platform-rules.md
related_adrs: []
---
# CP-TASK-011 Aukro Platform Rules

## Target Task

`TASK-011` in `11_tasks/TASK-011-document-aukro-platform-rules.md`.

## Upstream Traceability

`00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `04_systems/SYS-001-aukro-service.md`, `10_features/FEAT-004-aukro-compliance-policy.md`, `11_tasks/TASK-003-aukro-compliance-policy.md`, and official Aukro rules sources recorded in `16_operations/AUKRO_PLATFORM_RULES.md`.

## Included Documents

AGENTS.md, protected intent docs, PROJECT_INVARIANTS, FEAT-004, TASK-003, EP-TASK-003, VAL-TASK-003, `16_operations/AUKRO_PLATFORM_RULES.md`, `OfferPolicyService`, official Aukro terms, official prohibited/conditional goods page, official privacy page, official cookies page, and `robots.txt`.

## Excluded Documents

Secret files, WebAPI keys, account credentials, raw customer/order data, buyer messages, live Aukro payloads, production logs, screenshots containing personal data, Kubernetes secrets/manifests, and protected intent document edits.

## Constraints

Document rules only. Do not publish to Aukro.cz, scrape or crawl Aukro, automate login/payment/cart/reporting/selling browser flows, infer missing WebAPI contracts, change runtime behavior, change schemas, change secrets, or deploy.

## Agent Prompt

Document current Aukro platform rules and add only the minimal source-linked code comment needed to preserve fail-closed publish readiness.

## Validation Instructions

Run `git diff --check`, `npm --prefix services/aukro-service run build`, strict doc audit, inspect git diff, and update the TASK-011 validation report with evidence.
