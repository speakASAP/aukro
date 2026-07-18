---
id: ONBOARDING-AGENT-AUKRO-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - AGENTS.md
downstream: []
related_adrs: []
---
# Agent Onboarding Package

## Project purpose

Production Aukro.cz integration for offers, stock sync and order forwarding.

## Immutable documents

Read but do not modify `docs/00_constitution/CONSTITUTION.md` and `docs/01_vision/VISION.md` after baseline adoption.

## Required workflow

Use task, goal impact, execution plan, context package and validation report artifacts before coding.

## Before starting work

Run `python3 scripts/pre_coding_gate.py --root .` for implementation tasks.

## Forbidden actions

Do not expose secrets, raw production data or deployment changes outside scope.

## Documentation gap handling

Fill mutable gaps from approved sources or mark them explicitly.

## Expected final output

Changed files, docs created, validation evidence and remaining blockers.
