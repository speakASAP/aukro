---
id: CONST-AUKRO-001
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - BUSINESS.md
downstream:
  - docs/01_vision/VISION.md
related_adrs:
  - docs/07_decisions/ADR-003-protect-intent-documents.md
---
# Project Constitution

Status: Immutable except by human-approved amendment. AI write access is forbidden after baseline adoption.

## Purpose

Apply the company Intent Preservation System to aukro-service so production marketplace work remains traceable, validated and safe for AI-assisted delivery.

## Constitutional principles

### 1. Intent preservation
All work must preserve the approved purpose: Aukro.cz marketplace integration for account/offer management, stock synchronization and order forwarding.

### 2. Immutable source of truth
This constitution and `docs/01_vision/VISION.md` are protected. AI may read and cite them but must not change them after baseline adoption without a human-approved amendment.

### 3. Human-controlled change
Changes to purpose, marketplace behavior, order ownership, data handling, deployment ownership or AI autonomy require review in `docs/17_governance/amendments/` or `docs/01_vision/VISION_EVOLUTION.md`.

### 4. Traceability
Minimum chain: Vision Goal -> System -> Subsystem -> Feature -> Task -> Execution Plan -> Validation Report.

### 5. Documentation before implementation
Code changes require a task, execution plan, validation criteria, sensitive-data classification, invariant impact and gate evidence.

### 6. Small AI execution units
AI tasks must have one goal, limited files, explicit constraints, input context, acceptance criteria and validation steps.

### 7. Context minimization
Agents receive only task-relevant context. Production secrets, raw orders, customer identifiers and live exports are never agent context.

### 8. Validation at every level
Task, feature, subsystem, system and vision validation evidence is required before closure.

### 9. Decision memory
Major architecture, integration, schema, marketplace, security and deployment decisions require ADRs.

### 10. Auditability
Audits must reveal missing docs, weak requirements, broken traceability, unresolved decisions, sensitive data and intent drift.

## Amendment process

Create an amendment, identify affected docs, explain reason and impact, obtain human approval, merge through review, and run IPS gates.

## Non-negotiable rules for AI agents

Do not modify protected intent documents after baseline adoption, invent goals or approvals, remove validation criteria, ignore ADRs, change architecture without ADR coverage, expand scope without traceability, or place secrets/raw production data in prompts, tests, docs, logs or reports.
