# aukro

## Status
Status: active

## Documentation authority
This repository follows the shared IPS onboarding standard and keeps project-level traceability in the repo itself.

## Capabilities
- auth: required
- postgres: required
- redis: not-applicable — no Redis dependency is required for this repo
- logging: required
- notifications: required
- ai: not-applicable — no AI workflow is required
- payments: not-applicable — no payment capture in scope
- catalog: required
- orders: required
- warehouse: required
- invoices: not-applicable — not owned here
- object-storage: not-applicable — not used here
- event-bus: required
- docs-rag: required
- monitoring: required
- backups: not-applicable — no backup owner here

## Interfaces
- GitHub: https://github.com/speakASAP/aukro
- IPS standard: https://github.com/speakASAP/intent-preservation-system
- Runtime boundary: marketplace integration for Aukro data synchronization and order forwarding

## Development
- Validate with the central IPS adoption script before changes are considered complete.

## Configuration
- This repository uses repo-local configuration and shared platform configuration only.

## Deployment
- Deployment follows the shared ecosystem deployment conventions.

## Health and observability
- Health checks must remain truthful to the runtime scope owned by the repo.
