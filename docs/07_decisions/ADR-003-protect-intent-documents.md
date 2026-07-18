---
id: ADR-003
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/00_constitution/CONSTITUTION.md
downstream:
  - docs/11_tasks/TASK-001-implement-ips-governance-baseline.md
related_adrs: []
---
# ADR-003: Protect Intent Documents

## Context

aukro-service needs auditable governance that preserves production marketplace intent and aligns future AI-assisted work.

## Decision

Protect `docs/00_constitution/CONSTITUTION.md` and `docs/01_vision/VISION.md` after baseline adoption.

## Alternatives considered

External-only tracking and casual mutable docs were rejected because local gates require repository artifacts and protected intent.

## Consequences

Future work must keep docs current, use existing boundaries, and treat major changes as ADR-worthy.

## Validation

Run strict audit and operational gates.
