---
id: PROJECT-INVARIANTS-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 00_constitution/CONSTITUTION.md
  - 01_vision/VISION.md
downstream:
  - 11_tasks/TASK-001-implement-ips-governance-baseline.md
related_adrs: []
---
# Project Invariants

## Purpose

Non-negotiable truths that aukro-service work must preserve.

## Invariants

| ID | Level | Source document | Rule | Forbidden outcome | Validation method | Gate applicability | Owner |
|---|---|---|---|---|---|---|---|
| AUKRO-INV-001 | constitutional | `00_constitution/CONSTITUTION.md` | Work must be traceable to upstream intent. | Changes without task/plan/validation. | Strict audit and pre-coding gate. | Pre-coding, deployment. | Engineering |
| AUKRO-INV-002 | vision | `01_vision/VISION.md` | Offer changes require catalog validation. | Live offers from unvalidated catalog data. | Tests and review. | Pre-coding, deployment. | Engineering |
| AUKRO-INV-003 | product | `01_vision/VISION.md` | aukro-service must not own catalog, stock or order lifecycle truth. | Domain ownership moves without ADR/amendment. | ADR review. | Pre-coding, deployment. | Engineering |
| AUKRO-INV-004 | operational | `23_documentation_contracts/SENSITIVE_DATA_POLICY.md` | Secrets/raw production data must not enter IPS artifacts. | Secret values or raw order/customer data in docs/prompts/tests/reports. | Sensitive-data scan. | Pre-coding, deployment. | Engineering |
| AUKRO-INV-005 | operational | `SYSTEM.md` | Runtime secrets belong in Vault/K8s secret management. | Hard-coded credentials in code or docs. | Secret reference review. | Pre-coding, deployment. | Engineering |
| AUKRO-INV-006 | operational | `00_constitution/CONSTITUTION.md` | Validation evidence must exist before closure. | Completed task without validation report. | Deployment-readiness gate. | Deployment. | Engineering |

## Gate usage

Gates verify this document exists and task validation names applicable invariants.
