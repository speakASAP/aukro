---
id: VALIDATION-PYRAMID-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 00_constitution/CONSTITUTION.md
  - 01_vision/VISION.md
downstream:
  - 12_validation/VAL-TASK-001-ips-governance-baseline.md
related_adrs: []
---
# Validation Pyramid

## Purpose

Define validation expectations for aukro-service work.

## Levels

Documentation validation, operational gates, unit/service validation, integration validation and deployment validation.

## Evidence

Evidence belongs in `12_validation/` and generated reports under `reports/validation/`.

## Policy

No implementation task closes without a validation report or documented human exception.
