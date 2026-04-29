# System: aukro-service

## Architecture

NestJS + PostgreSQL + Prisma. Aukro REST API integration.

- Create/update offers from catalog products
- Multi-account support
- Subscribes to `stock.updated` via RabbitMQ → updates Aukro offer quantities
- Receives Aukro orders → forwards to orders-microservice

## Service Ports

| Role | Port |
|------|------|
| aukro-service (app) | 3700 |
| api-gateway | 3701 |
| gateway-proxy | 3704 |

## Integrations

| Service | Port | Usage |
|---------|------|-------|
| database-server | 5432 | PostgreSQL (`aukro_db`) |
| logging-microservice | 3367 | Structured logs |
| auth-microservice | 3370 | JWT validation |
| catalog-microservice | 3200 | Product data (validation before offer creation) |
| warehouse-microservice | 3201 | Stock sync via RabbitMQ |
| orders-microservice | 3203 | Forward received Aukro orders |
| notifications-microservice | 3368 | Order alerts |

## Events

| Event | Direction | Action |
|-------|-----------|--------|
| `stock.updated` | subscribe | Update Aukro offer quantities |
| `order.created` / `order.updated` | subscribe | Sync order state |

## Database

DB name: `aukro_db`

| Table | Purpose |
|-------|---------|
| `AukroAccount` | Aukro account credentials |
| `AukroOffer` | Offers linked to catalog products |
| `AukroOrder` | Orders received from Aukro (transit — forwarded to orders-microservice) |

## Secrets

All secrets in Vault at `secret/prod/aukro-service`, synced to K8s via ESO → K8s Secret `aukro-service-secret` in namespace `statex-apps`.

Synced secrets: `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_API_KEY`, `PAYMENT_APPLICATION_ID`, `PAYMENT_WEBHOOK_API_KEY`.

→ See `k8s/external-secret.yaml` for full mapping.

## Deployment

K8s (primary): `statex-apps` namespace, rolling update (maxUnavailable=0).

```bash
# Build + push + roll
./scripts/deploy.sh

# Check status
kubectl -n statex-apps rollout status deployment/aukro-service

# Logs
kubectl -n statex-apps logs -l app=aukro-service -f
```

→ K8s manifests: `k8s/`  
→ Ecosystem deploy standard: `../shared/docs/DEPLOY_STANDARD.md`

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None
