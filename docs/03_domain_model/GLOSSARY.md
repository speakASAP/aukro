---
id: GLOSSARY-AUKRO-001
status: approved
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/01_vision/VISION.md
downstream:
  - docs/03_domain_model/CORE_ENTITIES.md
related_adrs: []
---
# Glossary

## Vision
Protected statement of aukro-service purpose and boundaries.
## Constitution
Governance rules controlling traceability, AI behavior, validation and protected docs.
## System
aukro-service production service, API gateway, database, integrations and deployment assets.
## Subsystem
Bounded part such as gateway routing, marketplace integration, stock sync or order forwarding.
## Feature
Capability traced to vision, such as offer management, stock sync or order forwarding.
## Task
Bounded work unit with upstream links, acceptance criteria, execution plan and validation evidence.
## Context Package
Task-specific AI-agent input package.
## ADR
Architecture Decision Record for consequential technical or governance decisions.
## Validation
Evidence that work preserves approved intent and passes checks.
## Concept Drift
Behavior or docs moving away from approved intent without amendment.
## Source of Truth
Approved docs and domain-owning services that control service facts.
