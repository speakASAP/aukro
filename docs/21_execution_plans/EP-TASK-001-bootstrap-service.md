# EP-TASK-001-bootstrap-service

completeness_level: complete

status: closed

## Upstream traceability
- ../11_tasks/TASK-001-bootstrap-service.md
- ../22_goal_impact/GOAL-IMPACT-TASK-001.md
- ../12_validation/VAL-TASK-001-bootstrap-service.md

## Scope
- complete the repo onboarding profile
- validate the repo with the central adopter script
- keep the docs honest about real service ownership

## Non-goals
- deploy runtime services
- modify the shared rollout plan
- invent missing platform responsibilities

## Project invariants
- keep project ownership truthful
- preserve traceability across the IPS docs
- avoid fake runtime capability claims

## Sensitive-data handling
No secret values are introduced.

## Contract validation plan
The integration contract is checked for required vs not-applicable decisions and real ecosystem alignment.

## Replay and determinism plan
The task is deterministic because it depends on the repo’s actual boundaries and the central validation script.

## Files to inspect
- README.md
- BUSINESS.md
- SYSTEM.md
- AGENTS.md
- TASKS.md
- STATE.json

## Files to create
- docs/00_constitution/CONSTITUTION.md
- docs/01_vision/VISION.md
- docs/06_architecture/INTEGRATION_CONTRACT.md
- docs/11_tasks/TASK-001-bootstrap-service.md
- docs/12_validation/VAL-TASK-001-bootstrap-service.md
- docs/17_governance/PROJECT_INVARIANTS.md
- docs/21_execution_plans/EP-TASK-001-bootstrap-service.md
- docs/22_goal_impact/GOAL-IMPACT-TASK-001.md
- docs/orchestrator/VALIDATION_DEBT.md

## Files to modify
- root project docs and state files as needed

## Files that must not be modified
- /home/ssf/Documents/Github/shared/config/ecosystem-repositories.json
- the master rollout plan in the IPS repo

## Implementation steps
1. confirm real service boundary
2. align doc sections to the actual project scope
3. validate with the central IPS script

## Parallel execution
This task is single-repo and no deployment or runtime work is required.

## Blockers
- approval evidence must remain explicit and current

## Test plan
- run the IPS validation script in planning mode

## Validation plan
- python3 intent-preservation-system/scripts/validate_adoption_profile.py --root aukro --phase planning

## Gate commands
- python3 intent-preservation-system/scripts/validate_adoption_profile.py --root aukro --phase planning

## Documentation updates
- project docs are updated to reflect the actual service scope and governance boundaries

## Rollback plan
Revert the onboarding docs to the last clean commit if validation fails and re-run the fix.

## Handoff
The repo is left with a valid onboarding profile and clear next steps.

## Completion checklist
- [x] repository scope documented
- [x] required adoption artifacts present
- [x] validation evidence recorded
- [x] traceability links included
