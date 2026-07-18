# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

---

# Agents: aukro-service

No autonomous AI agents. Offer sync and order forwarding are rule-based.

## Active Agents
<!-- Coordinator-maintained -->
None.

## Intent Preservation System

- Read docs/00_constitution/CONSTITUTION.md, docs/01_vision/VISION.md, docs/17_governance/PROJECT_INVARIANTS.md, and docs/17_governance/AI_AGENT_RULES.md before implementation work.
- Do not modify protected intent documents after baseline adoption without a human-approved amendment.
- Do not change runtime code, Prisma schema, Kubernetes manifests or secrets unless an execution plan explicitly allows it.
- Every implementation task requires upstream traceability, goal impact, execution plan, sensitive-data classification, validation criteria and gate evidence.
- Never put secrets, raw production order data, customer identifiers, live logs or unmasked production screenshots in prompts, tests, docs or reports.

Essential commands:

    python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
    python3 scripts/pre_coding_gate.py --root .
    python3 scripts/deployment_readiness_gate.py --root .

Required final report:

- Files changed.
- Documents created.
- Missing sections filled.
- Remaining MISSING or UNKNOWN markers.
- Validation evidence.
- Deviations from plan.
