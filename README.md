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

## Intent Preservation System

This repository follows the company IPS standard. Before implementation work, read docs/00_constitution/CONSTITUTION.md, docs/01_vision/VISION.md, docs/17_governance/PROJECT_INVARIANTS.md, the relevant task under docs/11_tasks/, and its execution plan under docs/21_execution_plans/.

Core gate commands:

    python3 scripts/strict_doc_audit.py --format markdown --fail-on-issues
    python3 scripts/pre_coding_gate.py --root .
    python3 scripts/deployment_readiness_gate.py --root .

