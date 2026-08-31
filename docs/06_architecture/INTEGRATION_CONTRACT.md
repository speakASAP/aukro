# Integration Contract

## Purpose
This document records the required and not-applicable integration decisions for the Aukro marketplace bridge.

## Capability decisions
- auth: required — identity enforcement is required
- postgres: required — shared database access is required
- redis: not-applicable — no Redis dependency is required
- logging: required — structured logs are required
- notifications: required — notifications are part of the supported workflow
- ai: not-applicable — no AI capability is required
- payments: not-applicable — payment handling is out of scope
- catalog: required — shared catalog validation is required
- orders: required — order forwarding uses the shared orders service
- warehouse: required — stock.updated is required for synchronization
- invoices: not-applicable — invoicing is out of scope
- object-storage: not-applicable — no object-storage ownership
- event-bus: required — the repo consumes shared event-bus messages such as stock.updated
- docs-rag: required — repository discoverability is required
- monitoring: required — monitoring is required
- backups: not-applicable — no backup ownership here

## Data ownership
The repository owns the marketplace integration logic and operational evidence. It does not claim ownership of product pricing, invoicing, or payment settlement outside the shared ecosystem.

## Authentication and authorization
Project access follows the shared ecosystem authorization model before marketplace work is accepted.

## Synchronous dependencies
- catalog-microservice
- warehouse-microservice
- orders-microservice
- logging-microservice
- monitoring-microservice

## Asynchronous dependencies
- stock.updated event-bus messages

## Degraded operation
If required dependencies are unavailable, the repo must fail safely and report the real condition without claiming success.

## Validation
The project validates its integration contract using the central IPS adoption profile script.
