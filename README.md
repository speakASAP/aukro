# aukro-service

Aukro.cz marketplace integration — offers, accounts, stock sync, order forwarding.

**Domain**: <https://aukro.alfares.cz> · **Stack**: NestJS · PostgreSQL · K8s

## Docs

| File | Purpose |
|------|---------|
| [`BUSINESS.md`](BUSINESS.md) | Goals, constraints, SLA |
| [`SYSTEM.md`](SYSTEM.md) | Ports, integrations, secrets, K8s deploy |
| [`AGENTS.md`](AGENTS.md) | Agent boundaries |
| [`TASKS.md`](TASKS.md) | Task backlog |
| [`CLAUDE.md`](CLAUDE.md) | AI read order + quick ops |

## API (base: `https://aukro.alfares.cz/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List Aukro accounts |
| POST | `/accounts` | Add account |
| GET | `/offers` | List offers |
| POST | `/offers` | Create offer |
| POST | `/offers/sync` | Sync catalog → Aukro |
| GET | `/orders` | List orders |
| POST | `/orders/webhook` | Aukro order webhook |

→ Secrets: Vault `secret/prod/aukro-service` (see [`SYSTEM.md`](SYSTEM.md))  
→ Ecosystem: [`../shared/ECOSYSTEM_MAP.md`](../shared/ECOSYSTEM_MAP.md)
