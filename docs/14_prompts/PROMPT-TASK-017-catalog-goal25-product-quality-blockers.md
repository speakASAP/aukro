---
id: PROMPT-TASK-017-catalog-goal25-product-quality-blockers
status: used
source_task: ../11_tasks/TASK-017-catalog-goal25-product-quality-blockers.md
execution_plan: ../21_execution_plans/EP-TASK-017-catalog-goal25-product-quality-blockers.md
context_package: ../13_context_packages/CP-TASK-017-catalog-goal25-product-quality-blockers.md
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: complete
---
# PROMPT-TASK-017: Catalog Goal 25 Product Quality Blockers

## Role

Act as the Aukro channel consumer worker for Catalog Goal 25 Product Quality Review blockers.

## Task

Consume Catalog product-quality blockers and fail closed before Aukro draft creation, product preparation, or publish-adjacent flows when mandatory Catalog blockers remain.

## Context

Use Catalog policy `catalog.product_quality.v1`, Catalog readiness/quality evidence, FEAT-005, TASK-005, TASK-012, shared Catalog client, offers controller/service/types/tests, offer policy, and dashboard UI controller.

## Constraints

Remote-only Alfares work. No deploy without approval. Do not print secrets. Keep Catalog as product truth; keep Aukro account, draft, compliance, and marketplace publication ownership in Aukro. EAN is optional and non-blocking.

## Acceptance criteria

Mandatory Catalog blockers block draft creation; unavailable quality evidence fails closed; product picker surfaces blockers and disables blocked products; publish policy evidence includes Catalog blocker details; focused tests and build pass.

## Validation

`git diff --check`, focused `offers.service.spec.ts`, `npm --prefix services/aukro-service run build`, and IPS gates.
