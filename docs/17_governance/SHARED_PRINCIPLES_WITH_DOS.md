---
id: SHARED-PRINCIPLES-DOS-AUKRO-001
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/00_constitution/CONSTITUTION.md
downstream: []
related_adrs: []
---
# Shared Principles With DOS

## Purpose

Document cross-repo alignment when DOS is used as a reference project.

## Relationship

DOS may be consulted as a reference project, but it is not the source of truth for aukro-service.

## Shared Principles

Preserve intent, keep traceability, validate before closure, protect sensitive data and document major decisions.

## Boundaries

aukro-service source of truth remains this repo and approved service docs. DOS is not authoritative and must not override the aukro-service vision, constitution, ADRs or ownership boundaries.

## Validation

Cross-repo work must name this boundary and pass IPS gates.
