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

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/aukro-service -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```

---

## aukro-service

**Purpose**: Aukro.cz marketplace integration — create/update offers, manage accounts, sync stock, receive and forward orders.  
**Domain**: <https://aukro.alfares.cz>  
**Stack**: NestJS · PostgreSQL · K8s (`statex-apps`)

→ Constraints, SLA: `BUSINESS.md`  
→ Ports, integrations, secrets, deploy: `SYSTEM.md`

**Ops**: `kubectl -n statex-apps logs -l app=aukro-service -f` · `kubectl -n statex-apps rollout status deployment/aukro-service` · `./scripts/deploy.sh`
