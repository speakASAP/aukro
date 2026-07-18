#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

SERVICE_NAME="aukro-service"
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"
# Tag describes the WORKING TREE that is actually built, not just git HEAD:
# a tag derived from HEAD alone repeats itself when files changed without a
# commit, which makes `kubectl set image` a no-op and silently keeps the old
# image running.
compute_default_tag() {
  local head dirty root
  root="${PROJECT_ROOT:-$(pwd)}"
  head="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    echo "build-$(date -u +%Y%m%d%H%M%S)"
    return
  fi
  dirty="$(git -C "$root" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "${head}-wt$(date -u +%Y%m%d%H%M%S)"
  else
    echo "$head"
  fi
}

IMAGE_TAG="${IMAGE_TAG:-$(compute_default_tag)}"
IMAGE="localhost:5000/$SERVICE_NAME:$IMAGE_TAG"
LATEST_IMAGE="localhost:5000/$SERVICE_NAME:latest"

# shellcheck disable=SC1091
source "$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" 2>/dev/null \
  || source "$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" \
  || { echo "Error: deploy timing library not found" >&2; exit 1; }
deploy_timing_init "$SERVICE_NAME"

preflight_service_health() {
  echo -e "${YELLOW}Preflight: checking Kubernetes and current service health...${NC}"

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}Namespace not found: $NAMESPACE${NC}"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    echo -e "${RED}kubectl cannot reach cluster${NC}"
    exit 1
  fi

  BAD_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3 ~ /Error|CrashLoopBackOff|ImagePullBackOff|CreateContainerConfigError|CreateContainerError|ErrImagePull/ {print $1}')
  if [ -n "$BAD_PODS" ]; then
    echo -e "${RED}Service has unhealthy pods before deploy:${NC}"
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
    for pod in $BAD_PODS; do
      echo -e "${YELLOW}--- describe pod/$pod ---${NC}"
      kubectl describe pod -n "$NAMESPACE" "$pod" || true
      echo -e "${YELLOW}--- logs pod/$pod (tail 80) ---${NC}"
      kubectl logs -n "$NAMESPACE" "$pod" --tail=80 || true
    done
    echo -e "${RED}Fix pod errors first, then redeploy.${NC}"
    exit 1
  fi

  echo -e "${GREEN}Preflight passed${NC}"
}

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Aukro Service - Kubernetes Deployment${NC}"
echo -e "${BLUE}==========================================================${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

deploy_timing_run_phase "Preflight" preflight_service_health

build_image() {
  echo -e "${YELLOW}Building image $IMAGE...${NC}"
  docker build -f "$PROJECT_ROOT/services/aukro-service/Dockerfile" -t "$IMAGE" -t "$LATEST_IMAGE" "$PROJECT_ROOT"
}

push_image() {
  echo -e "${YELLOW}Pushing image $IMAGE...${NC}"
  docker push "$IMAGE"
  docker push "$LATEST_IMAGE"
}

deploy_timing_run_phase "Build image" build_image
deploy_timing_run_phase "Push image" push_image

deploy_timing_phase_start "Apply Kubernetes manifests"
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
for manifest in configmap.yaml external-secret.yaml deployment.yaml service.yaml ingress.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done
echo -e "${GREEN}OK Kubernetes manifests applied${NC}"
deploy_timing_phase_end "Apply Kubernetes manifests"

deploy_timing_phase_start "Set deployment image"
echo -e "${YELLOW}Setting deployment image to $IMAGE...${NC}"
kubectl set image deployment/"$SERVICE_NAME" app="$IMAGE" -n "$NAMESPACE"
kubectl annotate deployment/"$SERVICE_NAME" -n "$NAMESPACE" deployment.kubernetes.io/restartedAt="$(date -Iseconds)" --overwrite
echo -e "${GREEN}OK Deployment image set to $IMAGE${NC}"
deploy_timing_phase_end "Set deployment image"

deploy_timing_phase_start "Wait for rollout"
echo -e "${YELLOW}Waiting for rollout...${NC}"
deploy_timing_k8s_rollout_wait kubectl "$SERVICE_NAME" "$NAMESPACE"
echo -e "${GREEN}OK Rollout complete${NC}"
deploy_timing_phase_end "Wait for rollout"

deploy_timing_phase_start "Post-deploy status"
echo -e "${YELLOW}Current pods:${NC}"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"
deploy_timing_phase_end "Post-deploy status"

deploy_timing_finish_success "Aukro Service"
DEPLOY_TIMING_FINISHED=1
exit 0
