---
source_document: ../../01_vision/VISION.md
compression_level: summary
last_updated: 2026-06-13
compression_owner: Engineering
fidelity_status: ai-draft
must_read_full_document_when:
  - Changing service purpose, offer creation, stock sync, order forwarding, secrets or AI governance.
---
# VISION Summary

aukro-service safely integrates Aukro.cz with catalog, warehouse and order systems.
It requires catalog validation before offer creation or updates.
It syncs warehouse stock to linked Aukro offers.
It forwards Aukro orders to orders-microservice rather than owning the lifecycle.
Credentials remain in Vault/K8s secret management.
AI-assisted changes require traceability, execution plans and validation evidence.
