---
id: AUDIT-CHECKLIST-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/00_constitution/CONSTITUTION.md
downstream: []
related_adrs: []
---
# Audit Checklist

## Required checks

Required IPS documents and groups exist; tasks have traceability, goal impact and execution plans; validation reports exist for validated work; protected intent docs require human review; sensitive data is absent from IPS artifacts.

## Commands

`python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues`; `python3 scripts/pre_coding_gate.py --root .`; `python3 scripts/deployment_readiness_gate.py --root .`.

## Evidence location

`reports/validation/`.
