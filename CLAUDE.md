# CLAUDE.md (aukro-service)

Ecosystem defaults: [`../CLAUDE.md`](../CLAUDE.md) · [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md)

Read order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## aukro-service

**Purpose**: Aukro.cz marketplace integration — create/update offers, manage accounts, sync stock, receive and forward orders.  
**Domain**: <https://aukro.alfares.cz>  
**Stack**: NestJS · PostgreSQL · K8s (`statex-apps`)

→ Constraints, SLA: `BUSINESS.md`  
→ Ports, integrations, secrets, deploy: `SYSTEM.md`

### Quick ops

```bash
# Logs
kubectl -n statex-apps logs -l app=aukro-service -f

# Deploy
./scripts/deploy.sh

# Rollout status
kubectl -n statex-apps rollout status deployment/aukro-service
```
