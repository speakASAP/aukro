# Business: aukro-service
>
> ⚠️ IMMUTABLE BY AI.

## Goal

Aukro.cz marketplace integration: create/update offers, manage accounts, sync stock, receive and forward orders.

## Constraints

- AI must never create offers without catalog product validation
- Aukro API credentials managed in .env only
- Order data forwarded to orders-microservice

## Consumers

flipflop-service.

## SLA

- Production: <https://aukro.statex.cz>
- Events: subscribes to stock.updated
