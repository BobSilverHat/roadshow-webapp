#!/usr/bin/env bash
# Deploy workshop.salt-nexus.com
#
# What this does:
#   1. pnpm build (writes dist/public/)
#   2. aws s3 sync to s3://workshop-salt-nexus-com/, deleting orphans
#   3. CloudFront invalidation on /, /index.html, /locales/* and /steps/*
#      (JS/CSS under /assets/ are hash-versioned so they bust naturally, but
#      locale JSON and step screenshots keep stable filenames and would
#      otherwise be served stale from any edge that already cached them)
#
# Requires AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION
# in the shell. Easiest: `set -a; source .env.local; set +a` first.

set -euo pipefail

BUCKET="workshop-salt-nexus-com"
DIST_ID="E3BZK6LL6YD55I"

echo "[1/3] building…"
pnpm build

echo "[2/3] syncing to s3://$BUCKET/"
# Cache-Control is decided by whether a URL is stable, not by file type.
#
# Pass 1 - /assets/* only. Vite content-hashes these, so a change always
# produces a NEW filename. Safe to cache forever. --delete here retires
# superseded bundles.
aws s3 sync dist/public/assets/ "s3://$BUCKET/assets/" --delete \
  --cache-control "public,max-age=31536000,immutable"

# Pass 2 - everything else. index.html, locale JSON, step screenshots,
# salt-logo.png, fonts and the shader video all keep STABLE filenames, so their
# bytes can change underneath the same URL. They must revalidate on every load.
# Marking any of them immutable strands the old bytes at the edge until the TTL
# expires, which is exactly how a re-exported logo kept serving the previous
# version. --delete is safe because assets/* is excluded and handled above.
aws s3 sync dist/public/ "s3://$BUCKET/" --delete --exclude "assets/*" \
  --cache-control "no-cache"

echo "[3/3] invalidating CloudFront cache"
# "/*" is a single invalidation path and covers every stable URL, so nothing
# can be missed by an incomplete list. Hash-versioned assets do not need it,
# but including them costs nothing.
INVALIDATION=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' --output text)
echo "  invalidation id: $INVALIDATION"

echo
echo "Done. https://workshop.salt-nexus.com/ will reflect the new build"
echo "once the invalidation finishes propagating (~1 min)."
