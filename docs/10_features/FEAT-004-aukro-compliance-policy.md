---
id: FEAT-004
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/09_milestones/MS-003-ai-commerce-platform.md
  - docs/08_roadmap/AI_COMMERCE_ROADMAP.md
downstream: []
related_adrs: []
---
# FEAT-004 Aukro Compliance Policy

## User or system need

aukro-service must publish only offers that comply with Aukro.cz rules, Alfares business policy, catalog truth, stock truth, and human approval boundaries.

## Goal

Create backend policy gates and explicit stop states that prevent rule-breaking publication before any live Aukro mutation.

## Goal impact

Protects account health and revenue by making safe automation possible.

## Scope

- Aukro rulebook and operational policy document.
- Policy evaluation API/service.
- Explicit states for blocked account, expired token, missing category, missing media, forbidden product, duplicate risk, stock unavailable, price missing, AI risk, and human review required.
- Testable allow/block decisions with evidence timestamps.

## Non-goals

- Do not scrape or bypass Aukro controls.
- Do not make UI warnings the only enforcement mechanism.
- Do not publish live offers in this feature before the queue and API strategy are approved.

## Acceptance criteria

- Every publish path calls backend policy evaluation.
- Policy failures return machine-readable reason codes and human-readable remediation hints.
- Missing or stale evidence blocks publication.
- AI output is treated as advisory evidence, not authority.

## Dependencies

Catalog, warehouse, auth, logging, notifications, ai, minio, and Aukro API rule research.

## Validation strategy

Unit tests for each gate, contract tests for policy API, sensitive-data scan, and IPS gates.

## Traceability

docs/09_milestones/MS-003-ai-commerce-platform.md, docs/08_roadmap/AI_COMMERCE_ROADMAP.md, and docs/04_systems/SYS-001-aukro-service.md.

## Validation

Feature changes require task-specific validation reports under docs/12_validation/ plus strict documentation audit, pre-coding gate, deployment-readiness gate, and relevant unit or contract tests.
