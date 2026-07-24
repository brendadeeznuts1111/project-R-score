#!/usr/bin/env bash
# cloudflare-env-setup.sh — bootstrap Cloudflare credentials for Reasonix
# Run: bash scripts/cloudflare-env-setup.sh
set -euo pipefail

echo "== Cloudflare Env Setup =="
echo ""
echo "Step 1: Set CLOUDFLARE_API_TOKEN in Reasonix's global .env"
echo "  Get your token from: https://dash.cloudflare.com/profile/api-tokens"
echo "  Minimal permissions (SSOT: config/r2-env.ts CLOUDFLARE_TOKEN_PERMISSIONS):"
echo "    - Cloudflare Pages:Read + Edit → project-r-score"
echo "    - Zone:Read + DNS:Edit → factory-wager.com"
echo "  Optional MCP extras: Workers/R2/Observability (see docs/harness/tenants/cloudflare-pages.md)"
echo ""
read -s -p "  Paste your CLOUDFLARE_API_TOKEN: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo "  ❌ No token provided. Set it manually (secure — no history leak):"
  echo '     read -s -p "Token: " TOKEN && echo "CLOUDFLARE_API_TOKEN=$TOKEN" >> ~/.reasonix/.env && unset TOKEN'
  exit 1
fi

# Write to Reasonix global .env (append, never overwrite)
echo "CLOUDFLARE_API_TOKEN=$TOKEN" >> ~/.reasonix/.env
unset TOKEN
echo "  ✅ Token saved to ~/.reasonix/.env"

echo ""
echo "Step 2: Verify token (HISTFILE disabled to prevent history leak)"
ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"
VERIFY_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' ~/.reasonix/.env | tail -1 | cut -d= -f2-)
if [[ "$VERIFY_TOKEN" == cfat_* ]]; then
  VERIFY_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tokens/verify"
  echo "  Testing account token (cfat_): ${VERIFY_URL}"
else
  VERIFY_URL="https://api.cloudflare.com/client/v4/user/tokens/verify"
  echo "  Testing user token: ${VERIFY_URL}"
fi
set +o history
HISTFILE=/dev/null
VERIFY_RESP=$(curl -s -X GET "$VERIFY_URL" \
  -H "Authorization: Bearer $VERIFY_TOKEN" \
  -H "Content-Type: application/json")
unset VERIFY_TOKEN
set -o history
if echo "$VERIFY_RESP" | grep -q '"success":true'; then
  echo "  ✅ Token verified!"
else
  echo "  ⚠️  Token verification failed:"
  echo "     $VERIFY_RESP" | head -3
fi

echo ""
echo "Step 3: Run Cloudflare env validate + assert-live"
cd "$(dirname "$0")/.."
bun run cloudflare:env:validate 2>/dev/null || echo "  ⚠️  validate needs bun + narrow token; run: bun run cloudflare:env:validate"
bun run cloudflare:env:assert-live 2>/dev/null || echo "  ⚠️  assert-live needs bun; run: bun run cloudflare:env:assert-live"
bun run cloudflare:env 2>/dev/null || true

echo ""
echo "✅ Done. Next: connect MCP servers via:"
echo "   mcp__cloudflare__connect"
echo "   mcp__cloudflare-builds__connect"
echo "   mcp__cloudflare-bindings__connect"
echo "   mcp__cloudflare-docs__connect"
echo "   mcp__cloudflare-observability__connect"
