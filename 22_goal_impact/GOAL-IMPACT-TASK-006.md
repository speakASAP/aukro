---
id: GOAL-IMPACT-TASK-006
artifact_type: task
artifact_id: TASK-006
artifact_path: ../11_tasks/TASK-006-ai-proposal-human-approval.md
primary_goal: FEAT-006
secondary_goals:
  - VISION-AUKRO-001 key outcomes
  - ROADMAP-AUKRO-AI-COMMERCE-001
impact_level: high
impact_description: Adds advisory AI proposal storage and human review records for safer draft optimization.
success_metric: Operators can request AI proposals and approve, reject, or edit them with auditable actor and diff metadata.
upstream_links:
  - 10_features/FEAT-006-ai-human-workbench.md
  - 08_roadmap/AI_COMMERCE_ROADMAP.md
downstream_links:
  - services/aukro-service/src/aukro/offers
validation_method: Synthetic service tests, TypeScript build, IPS gates, and validation report.
status: reviewed
---
# GOAL-IMPACT-TASK-006 AI Proposal Workflow With Human Approval

## Explanation

TASK-006 advances FEAT-006 by adding an advisory AI proposal workflow for local drafts. It preserves human control by requiring explicit review before approved field changes and by recording actor, timestamp, decision, edited fields, and diff metadata.

## Evidence

- `10_features/FEAT-006-ai-human-workbench.md`
- `services/aukro-service/src/aukro/offers/ai-proposal.types.ts`
- `services/aukro-service/src/aukro/offers/offers.service.ts`
- `services/aukro-service/src/aukro/offers/offers.service.spec.ts`

## Validation

Validate with synthetic service tests, service build, strict documentation audit, pre-coding gate, and deployment-readiness gate.
