#!/usr/bin/env bash
# cloudflare-pages-deploy.sh — trigger Pages deploy via Cloudflare API
# Uses: CLOUDFLARE_API_TOKEN (from Reasonix global .env)
# Run: bash scripts/cloudflare-pages-deploy.sh
#      bash scripts/cloudflare-pages-deploy.sh --branch main
set -euo pipefail

BRANCH=main
if [ "${1:-}" = "--branch" ] && [ -n "${2:-}" ]; then
  BRANCH="$2"
elif [ -n "${1:-}" ] && [[ "${1}" != --* ]]; then
  BRANCH="$1"
elif [ "${1:-}" = "--branch" ]; then
  BRANCH=main
fi

# Load from Reasonix env
if [ -f ~/.reasonix/.env ]; then
  set -a
  # shellcheck disable=SC1090
  source ~/.reasonix/.env
  set +a
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN not set"
  echo "   Add to ~/.reasonix/.env: CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7a470541a704caaf91e71efccc78fd36}"
PROJECT="${PAGES_PROJECT:-project-r-score}"

echo "🚀 Triggering Cloudflare Pages deploy..."
echo "   Project: $PROJECT"
echo "   Branch:  $BRANCH"

RESP=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"branch\":\"$BRANCH\",\"skip_build_cache\":false}")

SUCCESS=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("success", False))' 2>/dev/null || echo False)
if [ "$SUCCESS" = "True" ]; then
  DEPLOY_ID=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["id"])' 2>/dev/null || true)
  echo "✅ Deploy triggered: $DEPLOY_ID"
  echo "   https://dash.cloudflare.com/$ACCOUNT_ID/pages/view/$PROJECT"
  echo "   https://project-r-score.pages.dev"
  echo "   custom (after DNS): https://score.factory-wager.com"
else
  echo "❌ Deploy failed:"
  echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"
  exit 1
fi
