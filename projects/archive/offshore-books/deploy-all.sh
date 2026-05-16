#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "${ROOT_DIR}"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler is required. Install with: npm install -g wrangler" >&2
  exit 1
fi

echo "Checking Cloudflare authentication..."
wrangler whoami

echo
echo "Deploying Cloudflare Pages static app..."
"${ROOT_DIR}/deploy-pages.sh"

echo
echo "Deploying Cloudflare Worker bot..."
wrangler deploy

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${WORKER_WEBHOOK_URL:-}" && -n "${MINI_APP_URL:-}" ]]; then
  echo
  echo "Configuring Telegram webhook, commands, and menu button..."
  "${ROOT_DIR}/bootstrap-telegram.sh"
else
  cat <<'EOF'

Skipping Telegram bootstrap because one or more values are missing:
  TELEGRAM_BOT_TOKEN
  WORKER_WEBHOOK_URL
  MINI_APP_URL

Set them in your shell or .env, then run ./bootstrap-telegram.sh.
EOF
fi

echo
echo "Deployment flow complete."
