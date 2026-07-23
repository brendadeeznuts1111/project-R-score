#!/usr/bin/env bash
# Attach score.factory-wager.com to project-r-score and create zone CNAME if token allows.
# Requires CLOUDFLARE_API_TOKEN with:
#   - Account.Cloudflare Pages:Edit (domain attach)
#   - Zone.DNS:Edit on factory-wager.com (CNAME create)
#
#   bash scripts/cloudflare-pages-domain-dns.sh
set -euo pipefail

if [ -f ~/.reasonix/.env ]; then
  set -a
  # shellcheck disable=SC1090
  source ~/.reasonix/.env
  set +a
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7a470541a704caaf91e71efccc78fd36}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-a3b7ba4bb62cb1b177b04b8675250674}"
PROJECT="${PAGES_PROJECT:-project-r-score}"
DOMAIN="${PAGES_CUSTOM_DOMAIN:-score.factory-wager.com}"
TARGET="${PAGES_CNAME_TARGET:-project-r-score.pages.dev}"

if [ -z "$TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

echo "📎 Pages domain: $DOMAIN → project $PROJECT"
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$DOMAIN\"}" | python3 -m json.tool || true

echo ""
echo "🌐 DNS CNAME: ${DOMAIN%%.factory-wager.com} → $TARGET (proxied)"
DNS_RESP=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"CNAME\",\"name\":\"score\",\"content\":\"$TARGET\",\"ttl\":1,\"proxied\":true}")

echo "$DNS_RESP" | python3 -m json.tool 2>/dev/null || echo "$DNS_RESP"

if echo "$DNS_RESP" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("success") else 1)' 2>/dev/null; then
  echo "✅ CNAME created"
else
  echo ""
  echo "⚠️  DNS create failed (token needs Zone.DNS Edit)."
  echo "   Create manually in Cloudflare DNS for factory-wager.com:"
  echo "     Type: CNAME"
  echo "     Name: score"
  echo "     Target: $TARGET"
  echo "     Proxy: ON (orange cloud)"
fi

echo ""
echo "Probe when active:"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://$DOMAIN/portal/ops/"
echo "  curl -sS https://$DOMAIN/api/operations/summary | head -c 200"
