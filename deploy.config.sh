# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase C) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.

SERVICE_NAME="aukro-service"
PORT="3700"

IMAGES=(
  "aukro-service|.|services/aukro-service/Dockerfile|"
)

DEPLOYMENTS=(
  "aukro-service|app|aukro-service"
)

# MANIFESTS left at the runner default (configmap, external-secret, deployment,
# service, ingress) — matches the real script's manifest loop exactly.
