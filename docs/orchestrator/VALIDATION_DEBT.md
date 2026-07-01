# Validation Debt Ledger

## Purpose

Record known validation failures that are not caused by the current task, so agents can separate existing repo debt from real regressions.

## Rules

- This ledger does not excuse current-task failures.
- Every entry needs an owner, scope, and unblock condition.
- Do not include secrets, tokens, raw production data, customer identifiers, or private evidence.
- If a failure starts affecting the current task, promote it from debt to blocker.

## Entries

| ID | Date | Command | Failure Summary | Scope | Owner | Blocks Current Task? | Unblock Condition | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VD-2026-07-01-OFFERS-QUEUE-EXPECTATION | 2026-07-01 | `npm --prefix services/aukro-service test` | `services/aukro-service/src/aukro/offers/offers.service.spec.ts` expects publish attempt status `queued`, runtime returns `blocked`. | Aukro offer publish queue/policy test drift outside Orders forwarding and runtime token alias wiring. | Aukro offers owner | no | Align offer publish policy/test expectation and rerun full service test. | Observed assertion at `offers.service.spec.ts:197`: expected `queued`, actual `blocked`. |

## Current-Task Decision Checklist

- Does the failing command touch files changed by this task?
- Does the failure mention this task ID, goal ID, or changed module?
- Is the failure already listed above with `Blocks Current Task? = no`?
- Did the failure exist before this task started?
- Is the validation command required by the current task acceptance criteria?

## Agent Reporting Format

```text
Validation debt check:
- Command:
- Result:
- Matched ledger entry:
- Current-task impact:
- Next action:
```

Next step: Keep entries current whenever validation failures are classified as out of scope.
