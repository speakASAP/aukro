---
id: FEAT-006
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
# FEAT-006 AI And Human Workbench

## User or system need

Operators need AI help to prepare higher-converting Aukro offers while keeping humans accountable for approval.

## Goal

Integrate ai-microservice recommendations into draft workflows with auditable human review and role-based approval.

## Scope

- AI title, description, category, parameter, image-quality, price, and policy-risk proposals.
- Proposal versioning with model/version metadata and deterministic request IDs.
- Human approve/reject/edit workflow.
- Role checks from auth-microservice.
- Notifications for approval requests and blocked revenue.

## Non-goals

- AI must not publish directly.
- AI prompts must not include secrets, raw customer data, or unnecessary production payloads.
- AI must not override catalog, warehouse, or policy gates.

## Acceptance criteria

- AI proposals are stored separately from approved offer fields.
- Human actor, timestamp, and diff are recorded for approval.
- Low-confidence or risky AI proposals require review and cannot auto-publish.

## Dependencies

ai-microservice, auth-microservice, notifications-microservice, logging-microservice, catalog-microservice.

## Validation strategy

Proposal contract tests, approval workflow tests, sensitive-data scan, and IPS gates.

## Traceability

docs/09_milestones/MS-003-ai-commerce-platform.md, docs/08_roadmap/AI_COMMERCE_ROADMAP.md, and docs/04_systems/SYS-001-aukro-service.md.

## Validation

Feature changes require task-specific validation reports under docs/12_validation/ plus strict documentation audit, pre-coding gate, deployment-readiness gate, and relevant unit or contract tests.
