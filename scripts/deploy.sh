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
# Two passes, because Cache-Control differs by URL stability. Without an
# explicit header S3 sends none, and browsers then apply *heuristic* caching
# (~10% of the file's age) — which is what silently served stale copy and
# stale screenshots after a deploy, invisible to any CloudFront invalidation.
#
# Pass 1: /assets/* is content-hashed by Vite, so a changed file gets a new
# URL. Safe (and desirable) to cache forever.
aws s3 sync dist/public/ "s3://$BUCKET/" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" --exclude "locales/*" --exclude "steps/*"

# Pass 2: index.html, locale JSON and step screenshots keep STABLE filenames,
# so their content changes underneath the same URL. They must revalidate on
# every load. No --delete here: the include/exclude filter would treat every
# other object as an orphan.
aws s3 sync dist/public/ "s3://$BUCKET/" \
  --cache-control "no-cache" \
  --exclude "*" --include "index.html" --include "locales/*" --include "steps/*"

echo "[3/3] invalidating CloudFront cache"
# /locales/* and /steps/* are NOT hash-versioned (static public assets), so
# translation edits and re-captured screenshots need an explicit invalidation
# alongside the HTML. CloudFront caches per edge location, so skipping this
# leaves some POPs serving the previous file at the same URL.
INVALIDATION=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/" "/index.html" "/locales/*" "/steps/*" \
  --query 'Invalidation.Id' --output text)
echo "  invalidation id: $INVALIDATION"

echo
echo "Done. https://workshop.salt-nexus.com/ will reflect the new build"
echo "once the invalidation finishes propagating (~1 min)."
