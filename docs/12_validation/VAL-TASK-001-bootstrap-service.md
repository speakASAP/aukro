# VAL-TASK-001-bootstrap-service

status: validated

## Summary
Aukro is onboarded to the IPS profile with a truthful service boundary and governance evidence.

## Upstream goal
The goal is to align the repository with the central IPS adoption standard without inventing runtime ownership or claims.

## Acceptance criteria evidence
- required sections exist in the repo docs
- the repo state and integration review are complete
- the central validator passes

## Gate evidence
- python3 intent-preservation-system/scripts/validate_adoption_profile.py --root aukro --phase planning

## Integration evidence
The repo explicitly declares required and not-applicable capabilities based on actual service scope.

## Invariant evidence
The project remains truthful about catalog, stock, and order ownership and avoids fake runtime responsibilities.

## Sensitive-data evidence
This task contains no secret values.

## Replay and determinism evidence
The adoption flow is deterministic because it follows the shared validator rules and the repo’s actual service boundary.

## Issues and validation debt
No active validation debt recorded for this onboarding pass.

## Deviations
No deviations from scope were needed.

## Recommendation
Proceed with commit and retain the repository validation evidence in-place.

## Traceability confirmation
This validation report ties back to TASK-001-bootstrap-service and ../22_goal_impact/GOAL-IMPACT-TASK-001.md.
