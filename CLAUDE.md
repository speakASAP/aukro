# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# CLAUDE.md (aukro-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

## aukro-service

**Purpose**: Aukro.cz marketplace integration — create/update offers, manage accounts, sync stock, receive and forward orders.  
**Domain**: <https://aukro.alfares.cz>  
**Stack**: NestJS · PostgreSQL · K8s (`statex-apps`)

→ Constraints, SLA: `BUSINESS.md`  
→ Ports, integrations, secrets, deploy: `SYSTEM.md`

**Ops**: `kubectl -n statex-apps logs -l app=aukro-service -f` · `kubectl -n statex-apps rollout status deployment/aukro-service` · `./scripts/deploy.sh`
