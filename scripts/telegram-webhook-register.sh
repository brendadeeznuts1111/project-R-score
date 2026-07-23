#!/usr/bin/env bash
# Register Telegram webhooks for multi-tenant portal bots.
# Usage: bash scripts/telegram-webhook-register.sh [pages-base-url]
set -euo pipefail

BASE="${1:-https://project-r-score.pages.dev}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"

register() {
  local tenant="$1"
  local env_key="TELEGRAM_BOT_${tenant^^}"
  local token="${!env_key:-}"
  if [ -z "$token" ]; then
    echo "⚠ skip $tenant — ${env_key} not set"
    return 0
  fi
  local url="${BASE}/api/telegram/webhook/${tenant}"
  echo "→ $tenant webhook → $url"
  if [ -n "$SECRET" ]; then
    curl -sS -X POST "https://api.telegram.org/bot${token}/setWebhook" \
      -d "url=${url}" \
      -d "secret_token=${SECRET}" | python3 -m json.tool 2>/dev/null || true
  else
    curl -sS -X POST "https://api.telegram.org/bot${token}/setWebhook" \
      -d "url=${url}" | python3 -m json.tool 2>/dev/null || true
  fi
}

if [ -f ~/.reasonix/.env ]; then
  set -a
  # shellcheck disable=SC1091
  source ~/.reasonix/.env
  set +a
fi

register factory
register science
register tennis

echo "✅ Telegram webhook registration complete"
