#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "Missing TELEGRAM_BOT_TOKEN" >&2
  exit 1
fi

if [[ -z "${WORKER_WEBHOOK_URL:-}" ]]; then
  echo "Missing WORKER_WEBHOOK_URL, example: https://offshore-books-bot.example.workers.dev/telegram/webhook" >&2
  exit 1
fi

if [[ -z "${MINI_APP_URL:-}" ]]; then
  echo "Missing MINI_APP_URL, example: https://offshore-books-web.pages.dev/miniapp.html" >&2
  exit 1
fi

BOT_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

echo "Setting webhook..."
curl -fsS -X POST "${BOT_API}/setWebhook" \
  -H "content-type: application/json" \
  -d "{\"url\":\"${WORKER_WEBHOOK_URL}\"}"
echo

echo "Setting bot commands..."
curl -fsS -X POST "${BOT_API}/setMyCommands" \
  -H "content-type: application/json" \
  -d '{
    "commands": [
      {"command":"start","description":"Welcome and quick help"},
      {"command":"help","description":"Show supported commands"},
      {"command":"list","description":"List all books"},
      {"command":"best","description":"Search best books by market"},
      {"command":"parlays","description":"Quick parlay list"},
      {"command":"nba","description":"Quick NBA list"},
      {"command":"nfl","description":"Quick NFL list"},
      {"command":"speed","description":"Quick speed-focused list"},
      {"command":"open","description":"Open a book by id or name"},
      {"command":"balance","description":"Show recent balance snapshots"}
    ]
  }'
echo

echo "Setting menu button Mini App..."
curl -fsS -X POST "${BOT_API}/setChatMenuButton" \
  -H "content-type: application/json" \
  -d "{
    \"menu_button\": {
      \"type\": \"web_app\",
      \"text\": \"Open Books\",
      \"web_app\": {
        \"url\": \"${MINI_APP_URL}\"
      }
    }
  }"
echo

echo "Webhook + commands + menu button configured."
echo "Inspect status with:"
echo "  curl ${BOT_API}/getWebhookInfo"
