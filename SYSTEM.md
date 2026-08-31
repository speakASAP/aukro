# SYSTEM.md

completeness_level: complete

status: validated

## Purpose
Aukro integration keeps the Aukro marketplace aligned with the shared catalog, stock, and order contracts.

## Responsibilities
- synchronize marketplace product data from the shared catalog and warehouse contracts
- consume shared event-bus updates that affect stock and marketplace states
- forward relevant order workflows into the shared orders microservice

## Non-responsibilities
- ownership of payment settlement or invoicing
- creation of a new catalog source of truth
- direct local order lifecycle management

## Inputs
- catalog and stock state from the shared ecosystem
- event-bus signals such as stock.updated
- platform monitoring and logging outputs

## Outputs
- marketplace synchronization actions
- operational health and traceability evidence
- valid repo-level governance records

## Dependencies
- catalog-microservice
- warehouse-microservice
- orders-microservice
- logging-microservice
- monitoring-microservice
- shared event bus

## Upstream traceability
This repo follows the same project governance model and shared platform contracts used across the Alfares ecosystem.

## Downstream artifacts
- README.md
- docs/06_architecture/INTEGRATION_CONTRACT.md
- STATE.json

## Validation criteria
- required integrations are explicit and truthful
- not-applicable decisions are documented honestly
- the central validator passes in the planning phase

## Open questions
- confirm exact Aukro API payload mappings for the production integration flow
