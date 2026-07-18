# Agent Gap Filling Rules

## Purpose

Apply company IPS documentation, gap, sensitive-data and gate rules to aukro-service.

## Core rules

Major docs include metadata, upstream/downstream links, meaningful sections and validation criteria. Agents fill mutable gaps only from approved sources, never invent goals or approvals, and never place secrets/raw production data in prompts, tests, docs, logs or reports.

## Gate behavior

Pre-coding and deployment-readiness gates produce evidence under `reports/validation/` and block unresolved traceability, validation, protected-document or sensitive-data issues.
