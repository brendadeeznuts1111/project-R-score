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
if ! bun run cloudflare:env:validate; then
  echo "  ⚠️  validate failed — check token permissions (docs/harness/tenants/cloudflare-pages.md)"
fi
if ! bun run cloudflare:env:assert-live; then
  echo "  ⚠️  assert-live failed — Pages API unreachable or token too narrow"
fi
bun run cloudflare:env 2>/dev/null || true

echo ""
echo "Step 4: Preflight (static — no token for proof save when --no-live)"
bun run cloudflare:preflight 2>/dev/null || echo "  ⚠️  preflight failed — run: bun run cloudflare:preflight"

echo ""
echo "✅ Done. Next steps:"
echo "   1. Connect MCP in Cursor — servers already in .mcp.json / .cursor/mcp.json"
echo "      (cloudflare, cloudflare-docs, cloudflare-bindings, cloudflare-builds, cloudflare-observability)"
echo "   2. Deploy:  bun run cloudflare:deploy:verify"
echo "   3. Verify:  curl https://project-r-score.pages.dev/.well-known/mcp.json"
