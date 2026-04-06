# System: aukro-service

## Architecture

NestJS + PostgreSQL. Aukro REST API integration.

- Create/update offers from catalog products
- Multi-account support
- Subscribes to stock.updated → updates Aukro stock
- Receives Aukro orders → forwards to orders-microservice

## Integrations

| Service | Usage |
|---------|-------|
| database-server:5432 | PostgreSQL |
| logging-microservice:3367 | Logs |
| catalog-microservice:3200 | Product data |
| warehouse-microservice:3201 | Stock sync |
| orders-microservice:3203 | Forward orders |

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None
