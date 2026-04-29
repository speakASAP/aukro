# Business: aukro-service

> ⚠️ IMMUTABLE BY AI.

## Goal

Aukro.cz marketplace integration: create/update offers, manage accounts, sync stock, receive and forward orders.

## Constraints

- AI must never create offers without catalog product validation
- Aukro API credentials in Vault (`secret/prod/aukro-service`)
- Order data forwarded to orders-microservice

## Consumers

flipflop-service.

## SLA

- Production: <https://aukro.alfares.cz>
- Events: subscribes to stock.updated
