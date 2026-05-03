# CLAUDE.md (aukro-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## aukro-service

**Purpose**: Aukro.cz marketplace integration — create/update offers, manage accounts, sync stock, receive and forward orders.  
**Domain**: <https://aukro.alfares.cz>  
**Stack**: NestJS · PostgreSQL · K8s (`statex-apps`)

→ Constraints, SLA: `BUSINESS.md`  
→ Ports, integrations, secrets, deploy: `SYSTEM.md`

**Ops**: `kubectl -n statex-apps logs -l app=aukro-service -f` · `kubectl -n statex-apps rollout status deployment/aukro-service` · `./scripts/deploy.sh`
