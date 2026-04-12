#!/bin/bash
# =====================================================
# Build & Deploy React frontend to S3 + CloudFront
# Usage: ./scripts/deploy_frontend.sh
# =====================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Load environment variables from .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi
S3_BUCKET="${FRONTEND_S3_BUCKET:?Error: FRONTEND_S3_BUCKET env var is required}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:?Error: CLOUDFRONT_DISTRIBUTION_ID env var is required}"
REGION="${AWS_REGION:-ap-southeast-2}"

# ── Colours ───────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Build ─────────────────────────────────────────
log "Installing dependencies..."
cd "$FRONTEND_DIR"
npm ci

log "Building React app..."
npm run build

# ── Upload to S3 ──────────────────────────────────
log "Syncing to S3..."
aws s3 sync "$FRONTEND_DIR/build" "s3://$S3_BUCKET" \
  --delete \
  --region "$REGION"

# ── Invalidate CloudFront ─────────────────────────
log "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --output text --query 'Invalidation.Id' | xargs -I{} echo "Invalidation ID: {}"

log "Done."
