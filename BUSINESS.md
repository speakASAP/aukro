# BUSINESS.md

completeness_level: complete

## Problem
Aukro requires a marketplace bridge that keeps catalog and stock data aligned with the shared ecosystem without inventing new product ownership.

## Target users and stakeholders
- marketplace operations teams
- catalog domain owners
- warehouse and orders owners
- platform governance

## Value proposition
The service keeps Aukro synchronized to the canonical ecosystem data model and funnels relevant order handling through shared platform flows.

## Goals
- keep marketplace offers aligned to shared catalog state
- react to stock changes through the shared event bus
- forward relevant orders through the orders domain

## Non-goals
- local payments or invoicing ownership
- building a parallel catalog source of truth
- creating a local order management domain

## Success metrics
- catalog and stock data remain aligned with the shared platform
- order handoff follows the shared orders contract
- the repo passes IPS validation without placeholder or invented runtime claims

## Business constraints
- the repository must not claim ownership of financial or invoice flows outside the shared platform
- service decisions must stay aligned with the ecosystem contract and deployment model

## Approval
Status: approved
Approved by: project owner
Approval evidence: owner-confirmation: aukro-onboarding-approved
