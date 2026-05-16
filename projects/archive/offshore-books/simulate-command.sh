#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND_TEXT="${1:-/help}"
ACCOUNTS_URL="${ACCOUNTS_JSON_URL:-http://localhost:8080/accounts.sample.json}"
MINI_APP_URL="${MINI_APP_URL:-https://example.com/miniapp.html}"
BOT_USERNAME="${BOT_USERNAME:-your_bot_username}"
BALANCE_RECENT_HOURS="${BALANCE_RECENT_HOURS:-168}"

echo "Simulating Telegram command: ${COMMAND_TEXT}"
echo "Using accounts JSON: ${ACCOUNTS_URL}"

ROOT_DIR="${ROOT_DIR}" \
COMMAND_TEXT="${COMMAND_TEXT}" \
ACCOUNTS_URL="${ACCOUNTS_URL}" \
MINI_APP_URL="${MINI_APP_URL}" \
BOT_USERNAME="${BOT_USERNAME}" \
BALANCE_RECENT_HOURS="${BALANCE_RECENT_HOURS}" \
bun - <<'BUN'
const workerModule = await import(process.env.ROOT_DIR + '/worker.js');
const worker = workerModule.default;

const env = {
  TELEGRAM_BOT_TOKEN: 'test-token',
  ACCOUNTS_JSON_URL: process.env.ACCOUNTS_URL,
  MINI_APP_URL: process.env.MINI_APP_URL,
  BOT_USERNAME: process.env.BOT_USERNAME,
  BALANCE_RECENT_HOURS: process.env.BALANCE_RECENT_HOURS
};

const command = process.env.COMMAND_TEXT;
const req = new Request('http://local/telegram/webhook', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ message: { chat: { id: 123 }, text: command } })
});

const originalFetch = globalThis.fetch;
const sent = [];
let pending;

globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url === env.ACCOUNTS_JSON_URL) {
    return originalFetch(url, init);
  }
  if (url.startsWith('https://api.telegram.org/bot')) {
    sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return originalFetch(input, init);
};

await worker.fetch(req, env, { waitUntil: (p) => { pending = p; } });
if (pending) await pending;
globalThis.fetch = originalFetch;

if (!sent[0]) {
  console.error('No Telegram payload was produced.');
  process.exit(1);
}

console.log('\nTEXT\n----');
console.log(sent[0].text);
console.log('\nBUTTONS\n-------');
console.log(JSON.stringify(sent[0].reply_markup, null, 2));
BUN
