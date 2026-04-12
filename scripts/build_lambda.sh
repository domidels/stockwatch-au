#!/bin/bash
# =====================================================
# Build & Deploy Lambda Docker images to ECR
# Usage: ./scripts/build_lambda.sh [ingestion|api|all]
# =====================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

# Resolve the AWS account ID at runtime — no hardcoded value in source control.
ECR_ACCOUNT="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REGION="${AWS_REGION:-ap-southeast-2}"
ECR_BASE="${ECR_ACCOUNT}.dkr.ecr.${ECR_REGION}.amazonaws.com"

FUNCTION_INGESTION="stockwatch-au-ingestion"
FUNCTION_API="stockwatch-au-api-handler"

# ── Colours ───────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BUILD]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── ECR Login ─────────────────────────────────────
ecr_login() {
  log "Logging in to ECR..."
  aws ecr get-login-password --region "$ECR_REGION" | \
    docker login --username AWS --password-stdin "$ECR_BASE"
}

# ── Build & deploy ingestion ───────────────────────
build_ingestion() {
  log "Building ingestion image..."
  docker build --no-cache \
    -f "$LAMBDA_DIR/Dockerfile.ingestion" \
    -t "$ECR_BASE/$FUNCTION_INGESTION:latest" \
    "$LAMBDA_DIR/"

  log "Pushing to ECR..."
  docker push "$ECR_BASE/$FUNCTION_INGESTION:latest"

  log "Updating Lambda: $FUNCTION_INGESTION"
  aws lambda update-function-code \
    --function-name "$FUNCTION_INGESTION" \
    --image-uri "$ECR_BASE/$FUNCTION_INGESTION:latest" \
    --output text --query 'FunctionName' | xargs -I{} echo "Deployed: {}"
}

# ── Build & deploy API ─────────────────────────────
build_api() {
  log "Building API image..."
  docker build --no-cache \
    -f "$LAMBDA_DIR/Dockerfile.api" \
    -t "$ECR_BASE/$FUNCTION_API:latest" \
    "$LAMBDA_DIR/"

  log "Pushing to ECR..."
  docker push "$ECR_BASE/$FUNCTION_API:latest"

  log "Updating Lambda: $FUNCTION_API"
  aws lambda update-function-code \
    --function-name "$FUNCTION_API" \
    --image-uri "$ECR_BASE/$FUNCTION_API:latest" \
    --output text --query 'FunctionName' | xargs -I{} echo "Deployed: {}"
}

# ── Main ───────────────────────────────────────────
TARGET="${1:-all}"

ecr_login

case "$TARGET" in
  ingestion) build_ingestion ;;
  api)       build_api ;;
  all)       build_ingestion && build_api ;;
  *)         fail "Unknown target '$TARGET'. Use: ingestion | api | all" ;;
esac

log "Done."
