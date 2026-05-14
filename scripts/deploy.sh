#!/usr/bin/env bash
# Deploy workshop.salt-nexus.com
#
# What this does:
#   1. pnpm build (writes dist/public/)
#   2. aws s3 sync to s3://workshop-salt-nexus-com/, deleting orphans
#   3. CloudFront invalidation on / and /index.html (asset URLs are hash-
#      versioned, so they bust naturally; only the HTML needs invalidation)
#
# Requires AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION
# in the shell. Easiest: `set -a; source .env.local; set +a` first.

set -euo pipefail

BUCKET="workshop-salt-nexus-com"
DIST_ID="E3BZK6LL6YD55I"

echo "[1/3] building…"
pnpm build

echo "[2/3] syncing to s3://$BUCKET/"
aws s3 sync dist/public/ "s3://$BUCKET/" --delete

echo "[3/3] invalidating CloudFront cache"
INVALIDATION=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/" "/index.html" \
  --query 'Invalidation.Id' --output text)
echo "  invalidation id: $INVALIDATION"

echo
echo "Done. https://workshop.salt-nexus.com/ will reflect the new build"
echo "once the invalidation finishes propagating (~1 min)."
