---
id: ADR-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - 00_constitution/CONSTITUTION.md
downstream:
  - 11_tasks/TASK-001-implement-ips-governance-baseline.md
related_adrs: []
---
# ADR-001: Use Markdown and Git as Source of Truth

## Context

aukro-service needs auditable governance that preserves production marketplace intent and aligns future AI-assisted work.

## Decision

Use Markdown documents in Git for intent, traceability, tasks, plans, context and validation evidence.

## Alternatives considered

External-only tracking and casual mutable docs were rejected because local gates require repository artifacts and protected intent.

## Consequences

Future work must keep docs current, use existing boundaries, and treat major changes as ADR-worthy.

## Validation

Run strict audit and operational gates.
