# CLAUDE.md (aukro-service)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## aukro-service

**Purpose**: Aukro.cz marketplace integration — create/update offers, manage accounts, sync stock, receive and forward orders.  
**Domain**: https://aukro.alfares.cz  
**Stack**: NestJS · PostgreSQL

### Key constraints
- Never create offers without validating product exists in catalog-microservice
- Aukro API credentials in `.env` only
- All received orders forwarded to orders-microservice — not stored locally
- No direct stock writes — read from warehouse-microservice events only

### Events consumed
- `stock.updated` from warehouse-microservice → updates Aukro offer quantities

### Quick ops
```bash
docker compose logs -f
./scripts/deploy.sh
```
