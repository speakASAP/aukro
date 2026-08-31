# TASK-001-bootstrap-service

completeness_level: complete

status: validated

## Objective
Create the initial IPS adoption profile for Aukro and validate that it matches the repo’s actual marketplace integration scope.

## Upstream links
- ../22_goal_impact/GOAL-IMPACT-TASK-001.md
- ../21_execution_plans/EP-TASK-001-bootstrap-service.md
- ../12_validation/VAL-TASK-001-bootstrap-service.md

## Goal impact
The repository gains a clear, reviewable project profile and governance traceability.

## Project invariant impact
This task aligns with the repo invariant to preserve truthful ownership and avoid invented service responsibilities.

## Sensitive-data classification
No secret values are introduced.

## Contract and schema impact
This task modifies the repository adoption profile only; it does not change shared platform contracts.

## Replay and determinism impact
The onboarding flow is deterministic and based on the repo reality and central IPS rules.

## Scope
- align repo docs to actual Aukro integration scope
- complete required onboarding artifacts
- validate the onboarding profile

## Non-goals
- deployment activity
- shared standard changes
- invented runtime claims

## Acceptance criteria
- all required sections exist in each artifact
- no placeholder or fabricated evidence remains
- the central validator passes in planning phase

## Required context
- project repo reality and existing docs
- shared IPS standard and validation script

## Validation task
Run the central validator for the repo.

## Required gates
- python3 intent-preservation-system/scripts/validate_adoption_profile.py --root aukro --phase planning

## Parallel workstream context
This task is single-repo and does not include runtime implementation or deploy work.
