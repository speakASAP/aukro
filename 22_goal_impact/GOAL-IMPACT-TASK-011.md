---
id: GOAL-IMPACT-TASK-011
artifact_type: task
artifact_id: TASK-011
artifact_path: ../11_tasks/TASK-011-document-aukro-platform-rules.md
primary_goal: GOAL-AUKRO-001
secondary_goals:
  - FEAT-004
  - VISION-AUKRO-001 key outcomes
impact_level: high
impact_description: Documents official Aukro platform rules as enforceable automation boundaries so compliant offer preparation can continue without scraping, bypassing controls, or guessing missing WebAPI contracts.
success_metric: Future Aukro automation work can identify allowed use, hard prohibitions, missing WebAPI evidence, and fail-closed policy gates from repository documentation before implementation.
upstream_links:
  - 01_vision/VISION.md
  - 10_features/FEAT-004-aukro-compliance-policy.md
  - 11_tasks/TASK-011-document-aukro-platform-rules.md
downstream_links:
  - 16_operations/AUKRO_PLATFORM_RULES.md
  - services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts
validation_method: Source review, diff review, TypeScript build, strict documentation audit, and validation report.
status: reviewed
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
---
# Goal Impact: TASK-011 Document Aukro Platform Rules

## Explanation

TASK-011 supports safe Aukro automation by converting official platform rules into explicit repository-owned constraints. It protects the account and product goal by making scraping, robot/crawler content reproduction, disruptive scripts, off-platform trading language, prohibited goods, privacy/cookie misuse, and unknown WebAPI/rate-limit state visible as publish-blocking risks.

## Evidence

The task adds `16_operations/AUKRO_PLATFORM_RULES.md`, TASK-011 IPS artifacts, graph/task tracker links, validation evidence, and a source-linked comment in `OfferPolicyService`. It does not add live Aukro mutation, browser automation, crawler code, WebAPI calls, schema changes, secrets, or deployment changes.

## Validation

Validate with `git diff --check`, `npm --prefix services/aukro-service run build`, strict documentation audit, and diff review confirming the code change is comment-only and the source-rule gaps remain explicit.

## Goal Chain

Vision -> `01_vision/VISION.md` -> Feature -> `10_features/FEAT-004-aukro-compliance-policy.md` -> Task -> `11_tasks/TASK-011-document-aukro-platform-rules.md` -> Execution Plan -> `21_execution_plans/EP-TASK-011-document-aukro-platform-rules.md` -> Coding Prompt -> `14_prompts/PROMPT-TASK-011-document-aukro-platform-rules.md` -> Code comment -> Validation -> `12_validation/VAL-TASK-011-document-aukro-platform-rules.md`.
