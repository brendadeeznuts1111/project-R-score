#!/usr/bin/env bash
# cloudflare-env-setup.sh — bootstrap Cloudflare credentials from Proton Pass (SSOT)
# Run: bash scripts/cloudflare-env-setup.sh
#
# Token authority:
#   1. Mint/rotate in Cloudflare dashboard (human-only)
#   2. Store in Proton Pass: pass://factorywager/Cloudflare API Token/password
#   3. Inject via pass-cli (this script) — never paste tokens into shell history
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Cloudflare Env Setup (Proton Pass vault SSOT) =="
echo ""
echo "Vault item: pass://factorywager/Cloudflare API Token/password"
echo "Permissions SSOT: config/r2-env.ts CLOUDFLARE_TOKEN_PERMISSIONS"
echo "  Minimal: Pages Read+Edit (project-r-score), Zone Read + DNS Edit (factory-wager.com)"
echo "  Optional MCP: Workers/R2/Observability — see docs/harness/tenants/cloudflare-pages.md"
echo ""
echo "If the vault item is missing or expired, mint a new token in the dashboard,"
echo "update the Proton Pass item, then re-run this script."
echo ""

# Inject project .env + sync derived keys into ~/.reasonix/.env
bash "$ROOT/scripts/proton-inject.sh" factorywager --reasonix

echo ""
echo "Step 2: Verify token (account tokens use /accounts/.../tokens/verify)"
# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source "$ROOT/.env"
set +a

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7a470541a704caaf91e71efccc78fd36}"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "  ❌ CLOUDFLARE_API_TOKEN missing after inject"
  exit 1
fi

if [[ "$CLOUDFLARE_API_TOKEN" == cfat_* ]]; then
  VERIFY_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tokens/verify"
  echo "  Testing account token (cfat_): accounts/.../tokens/verify"
else
  VERIFY_URL="https://api.cloudflare.com/client/v4/user/tokens/verify"
  echo "  Testing user token: user/tokens/verify"
fi

set +o history
HISTFILE=/dev/null
VERIFY_RESP=$(curl -sS -X GET "$VERIFY_URL" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")
set -o history

if echo "$VERIFY_RESP" | grep -q '"success":true'; then
  echo "  ✅ Token verified via vault inject"
else
  echo "  ⚠️  Token verification failed:"
  echo "     $VERIFY_RESP" | head -3
  echo "  Update pass://factorywager/Cloudflare API Token/password then re-run."
fi

echo ""
echo "Step 3: Harness gates"
if ! bun run cloudflare:env:validate; then
  echo "  ⚠️  validate failed — check token permissions (docs/harness/tenants/cloudflare-pages.md)"
fi
if ! bun run cloudflare:env:assert-live; then
  echo "  ⚠️  assert-live failed — Pages API unreachable or token too narrow"
fi
bun run cloudflare:env 2>/dev/null || true

echo ""
echo "Step 4: Preflight (static)"
bun run cloudflare:preflight 2>/dev/null || echo "  ⚠️  preflight failed — run: bun run cloudflare:preflight"

echo ""
echo "✅ Done. Secrets came from Proton Pass, not paste."
echo "   MCP servers in .mcp.json read CLOUDFLARE_API_TOKEN from the process env"
echo "   (Reasonix: ~/.reasonix/.env after --reasonix sync; Cursor/Kimi: project .env)."
echo "   Deploy via vault: bun run cloudflare:deploy:vault"
echo "   Refresh anytime:  bun run proton:inject:factorywager:reasonix"
