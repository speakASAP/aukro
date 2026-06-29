---
id: EP-TASK-011
status: reviewed
source_task: ../11_tasks/TASK-011-document-aukro-platform-rules.md
owner: Engineering
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
vision: 01_vision/VISION.md
constitution: 00_constitution/CONSTITUTION.md
feature: 10_features/FEAT-004-aukro-compliance-policy.md
goal_impact: 22_goal_impact/GOAL-IMPACT-TASK-011.md
---
# EP-TASK-011 Document Aukro Platform Rules

## Metadata

Owner: Engineering. Status: reviewed. Source task: TASK-011. Lifecycle state: completed documentation and policy-comment guardrail for Aukro platform automation boundaries.

## Upstream Traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-aukro-service.md`
- `10_features/FEAT-004-aukro-compliance-policy.md`
- `11_tasks/TASK-003-aukro-compliance-policy.md`
- `11_tasks/TASK-011-document-aukro-platform-rules.md`
- `22_goal_impact/GOAL-IMPACT-TASK-011.md`

## Goal Impact

This plan protects compliant Aukro automation by turning official platform rules into source-controlled guardrails. It preserves the existing fail-closed policy model and blocks live publication when WebAPI, rate-limit, category, content, privacy, or human-approval evidence is missing.

## Project Invariants

- AUKRO-INV-001: Maintain task, execution plan, context package, prompt, goal impact, validation, graph, and task tracker links.
- AUKRO-INV-002: Do not publish or mutate Aukro offers.
- AUKRO-INV-003: Preserve catalog, warehouse, order, payment, supplier, marketing, AI, logging, and marketplace boundaries.
- AUKRO-INV-004: Use public-source documentation and synthetic validation evidence only.
- AUKRO-INV-005: Add no secret values or runtime secret changes.
- AUKRO-INV-006: Record validation evidence before closure.

## Sensitive-Data Handling

Classification: public-source documentation plus synthetic validation evidence. The task excludes secrets, WebAPI keys, account credentials, raw customer/order data, buyer messages, production payloads, and screenshots containing personal data.

## Contract Validation Plan

No API contract, Prisma schema, Kubernetes manifest, secret, or live Aukro integration contract changes. Validate the TypeScript project still builds after the comment-only backend change.

## Replay/Determinism Plan

No runtime behavior changes and no replay path. The documented policy keeps publish readiness deterministic for a given evidence snapshot and continues to require idempotency evidence before live mutation.

## Scope

Create and register the Aukro platform-rules document, TASK-011 IPS package, validation report, project graph entries, and one source-linked policy-code comment.

## Non-Goals

No live Aukro API call, deployment, browser automation, scraping, crawling, account login, payment/cart/reporting flow, schema change, secret change, UI change, queue change, or publish behavior change.

## Files to Inspect

- `AGENTS.md`
- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `10_features/FEAT-004-aukro-compliance-policy.md`
- `11_tasks/TASK-003-aukro-compliance-policy.md`
- `12_validation/VAL-TASK-003-aukro-compliance-policy.md`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts`
- Official Aukro source URLs listed in `16_operations/AUKRO_PLATFORM_RULES.md`

## Files to Create

- `16_operations/AUKRO_PLATFORM_RULES.md`
- `11_tasks/TASK-011-document-aukro-platform-rules.md`
- `12_validation/VAL-TASK-011-document-aukro-platform-rules.md`
- `13_context_packages/CP-TASK-011-document-aukro-platform-rules.md`
- `14_prompts/PROMPT-TASK-011-document-aukro-platform-rules.md`
- `21_execution_plans/EP-TASK-011-document-aukro-platform-rules.md`
- `22_goal_impact/GOAL-IMPACT-TASK-011.md`

## Files to Modify

- `TASKS.md`
- `graph/project_graph.example.yaml`
- `services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts`
- `12_validation/VAL-TASK-011-document-aukro-platform-rules.md`

## Files That Must Not Be Modified

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- Runtime secret files, Kubernetes secrets/manifests, Prisma schema, protected intent documents, live credential configuration, UI controllers, and unrelated pending user changes.

## Implementation Steps

1. Review current official Aukro terms, prohibited/conditional goods page, privacy page, cookies page, and `robots.txt`.
2. Document allowed use, hard prohibitions, WebAPI gaps, listing-content limits, prohibited/conditional goods, privacy/cookie rules, robots limits, and policy evidence gates.
3. Create the TASK-011 IPS package and context package.
4. Update `TASKS.md` and `graph/project_graph.example.yaml` with TASK-011 chain links.
5. Add a concise source-linked comment in `OfferPolicyService` without changing runtime behavior.
6. Run validation commands and update the validation report.

## Test Plan

Run `npm --prefix services/aukro-service run build`. No unit test is required because the only backend change is a comment.

## Validation Plan

Run `git diff --check`, `npm --prefix services/aukro-service run build`, `python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`, and inspect the diff for absence of live mutation, scraping, secrets, production data, and unrelated source changes.

## Gate Commands

```bash
git diff --check
npm --prefix services/aukro-service run build
python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
```

No deployment-readiness gate or deploy command is required because this task changes documentation and a code comment only.

## Documentation Updates

Create TASK-011 documentation package and update `TASKS.md`, `graph/project_graph.example.yaml`, and `16_operations/AUKRO_PLATFORM_RULES.md`.

## Parallel Execution Section

- Workstream A, source research: complete, read official Aukro public sources only, no repo edits.
- Workstream B, documentation chain: complete, edits TASK-011 docs, context package, validation, task tracker, and graph.
- Workstream C, code guardrail comment: complete, edits only `OfferPolicyService` comment text.
- Workstream D, validation and final integration: complete, current thread owns command evidence and final report.

Shared files are `TASKS.md`, `graph/project_graph.example.yaml`, and `services/aukro-service/src/aukro/offers/policy/offer-policy.service.ts`. No separate Codex threads were started because the active edit set was small and completed in one integration pass.

## Rollback Plan

Remove the TASK-011 documentation package, remove the TASKS/graph entries, and remove the policy comment. No database, secret, deployment, live Aukro, downstream service, queue, stock, or order cleanup is required.

## Agent Handoff Prompt

Maintain the Aukro platform-rules rulebook and the linked policy comment only. Re-check official Aukro sources before changing live automation behavior, preserve fail-closed policy evidence, do not infer missing WebAPI contracts, and do not add scraping, browser bypass, or live mutation code.

## Completion Checklist

- [x] IPS artifacts complete
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
