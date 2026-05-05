#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

SERVICE_NAME="aukro-service"
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"

ts() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log_info() {
  echo -e "[$(ts)] ${BLUE}INFO${NC} $1"
}

log_warn() {
  echo -e "[$(ts)] ${YELLOW}WARN${NC} $1"
}

log_error() {
  echo -e "[$(ts)] ${RED}ERROR${NC} $1"
}

diagnose_unhealthy_pods() {
  local bad_pods
  bad_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3 ~ /Error|CrashLoopBackOff|ImagePullBackOff|CreateContainerConfigError|CreateContainerError|ErrImagePull|RunContainerError/ {print $1}')
  if [ -n "$bad_pods" ]; then
    log_warn "Detected unhealthy pods during rollout diagnostics"
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
    for pod in $bad_pods; do
      log_warn "--- describe pod/$pod ---"
      kubectl describe pod -n "$NAMESPACE" "$pod" || true
      log_warn "--- logs pod/$pod (tail 120) ---"
      kubectl logs -n "$NAMESPACE" "$pod" --tail=120 || true
      log_warn "--- previous logs pod/$pod (tail 120) ---"
      kubectl logs -n "$NAMESPACE" "$pod" --previous --tail=120 || true
    done
  fi
}

preflight_service_health() {
  log_info "Preflight: checking Kubernetes and current service health..."

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    log_error "Namespace not found: $NAMESPACE"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    log_error "kubectl cannot reach cluster"
    exit 1
  fi

  BAD_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3 ~ /Error|CrashLoopBackOff|ImagePullBackOff|CreateContainerConfigError|CreateContainerError|ErrImagePull/ {print $1}')
  if [ -n "$BAD_PODS" ]; then
    log_warn "Service has unhealthy pods before deploy. Continuing with rollout to recover."
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
    for pod in $BAD_PODS; do
      log_warn "--- describe pod/$pod ---"
      kubectl describe pod -n "$NAMESPACE" "$pod" || true
      log_warn "--- logs pod/$pod (tail 80) ---"
      kubectl logs -n "$NAMESPACE" "$pod" --tail=80 || true
    done
  fi

  echo -e "[$(ts)] ${GREEN}OK${NC} Preflight passed"
}


echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Aukro Service - Kubernetes Deployment${NC}"
echo -e "${BLUE}==========================================================${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

preflight_service_health

log_info "[1/4] Applying Kubernetes manifests..."
for manifest in configmap.yaml external-secret.yaml deployment.yaml service.yaml ingress.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done
echo -e "[$(ts)] ${GREEN}OK${NC} Kubernetes manifests applied"

log_info "[2/4] Triggering rollout restart..."
kubectl rollout restart deployment/"$SERVICE_NAME" -n "$NAMESPACE"
echo -e "[$(ts)] ${GREEN}OK${NC} Rollout restart triggered"

log_info "[3/4] Waiting for rollout..."
if ! kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout=120s; then
  log_warn "Rollout did not complete in time. Diagnosing pods and rollout state..."
  kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
  kubectl describe deployment -n "$NAMESPACE" "$SERVICE_NAME" || true
  diagnose_unhealthy_pods
  TERMINATING_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3=="Terminating"{print $1}')
  if [ -n "$TERMINATING_PODS" ]; then
    log_warn "Force deleting stuck terminating pods..."
    for pod in $TERMINATING_PODS; do
      kubectl delete pod -n "$NAMESPACE" "$pod" --grace-period=0 --force || true
    done
  fi
  kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout=120s
fi
echo -e "[$(ts)] ${GREEN}OK${NC} Rollout complete"

log_info "[4/4] Current pods:"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"

echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}  Aukro Service Deployment successful${NC}"
echo -e "${GREEN}==========================================================${NC}"
