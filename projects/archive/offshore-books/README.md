# Offshore Books

Metadata-only sportsbook dashboard plus Telegram Mini App and reference bot implementations.

This project is intentionally:

- metadata-only
- password-manager-first
- safe for export to Telegram surfaces
- designed for fast book selection, not credential storage or backend scraping

## Files

- `index.html`: desktop dashboard
- `miniapp.html`: Telegram Mini App companion
- `accounts.sample.json`: starter metadata dataset
- `accounts.local.json`: optional local override dataset
- `worker.js`: Cloudflare Worker Telegram bot reference implementation
- `wrangler.toml`: Wrangler config for the Worker
- `bot-bun.js`: Bun webhook bot reference implementation

## Account schema

Each account uses this shape:

```json
{
  "id": 1,
  "name": "Wageralldays.com",
  "url": "https://wageralldays.com/",
  "loginUrl": "https://wageralldays.com/Logins/022/index.aspx",
  "bestFor": "BEST OVERALL • 10k @ -105",
  "color": "#10b981",
  "limits": "Sides: 10k @ -105",
  "tips": "Best overall starting point.",
  "tags": ["nba", "parlays", "high-limits"],
  "pmHint": "wageralldays",
  "lastUsed": "",
  "balanceSnapshot": {
    "amount": "",
    "currency": "USD",
    "updatedAt": "",
    "note": ""
  }
}
```

## Startup order

Desktop dashboard and Mini App load data in this order:

1. `accounts.local.json`
2. `accounts.sample.json`
3. cached offline metadata in `localStorage`

## Local run

```bash
cd /Users/nolarose/Projects/offshore-books
python3 -m http.server 8080
```

Then open:

- [http://localhost:8080](http://localhost:8080)
- [http://localhost:8080/miniapp.html](http://localhost:8080/miniapp.html)

## Local validation helpers

Run a quick preflight before deploy:

```bash
cd /Users/nolarose/Projects/offshore-books
./preflight.sh
```

Simulate Telegram bot commands locally against the Worker logic:

```bash
cd /Users/nolarose/Projects/offshore-books
./simulate-command.sh "/best nba"
./simulate-command.sh "/open Rugbyrex"
./simulate-command.sh "/balance"
```

Override the default simulation URLs when needed:

```bash
ACCOUNTS_JSON_URL="https://your-domain.example/accounts.sample.json" \
MINI_APP_URL="https://your-domain.example/miniapp.html" \
BOT_USERNAME="your_bot_username" \
./simulate-command.sh "/list"
```

## Hosted deployment path

Recommended hosted split:

1. Cloudflare Pages for:
   - `index.html`
   - `miniapp.html`
   - `accounts.sample.json`
   - `accounts.local.json`
2. Cloudflare Worker for:
   - `worker.js`

Helper scripts included:

- `deploy-pages.sh`: deploy static assets to Cloudflare Pages
- `bootstrap-telegram.sh`: set webhook, bot commands, and the Telegram menu button
- `deploy-all.sh`: deploy Pages + Worker, then optionally bootstrap Telegram if env vars are present
- `preflight.sh`: local syntax/config validation before deploy
- `simulate-command.sh`: local Worker command simulation helper
- `.env.example`: local deploy environment template
- `.github/workflows/deploy.yml`: optional GitHub Actions CI deploy workflow
- `.gitignore`: keeps local env/private metadata files out of git

## Current UI features

- real-time search
- market-first chips: `NBA sides`, `Parlays`, `High limits`, `Speed`
- details modal / details sheet
- `Open Login Page`
- `Mark as Used`
- manual `balanceSnapshot` editing in desktop
- `balanceSnapshot` display in desktop + Mini App
- JSON import/export
- password manager hint copy

## Recommended Daily Workflow

Use the bot in group chat to triage the market quickly, tap `Open Login`, switch into your dedicated Betting profile, let 1Password or Proton Pass autofill, then update the manual balance snapshot in the desktop dashboard after betting.

Best used with a dedicated Chrome/Edge profile named `Betting` + 1Password extension.

## Security rules

- Do not store usernames or passwords in any JSON file.
- Do not add automated credential injection back into the app.
- Keep secrets in 1Password or Proton Pass only.
- Use a dedicated Chrome or Edge profile named `Betting`.
- For Telegram, treat the Mini App as lookup and handoff only, not a credential surface.
- Balance snapshots are manual metadata only. Do not poll books automatically.

## Telegram Mini App

Mini App companion:

- host `miniapp.html` over HTTPS
- point your bot menu button or `web_app` button to that URL
- use the same `accounts.local.json` / `accounts.sample.json` schema
- optional launch filtering works via `tgWebAppStartParam`
- book-specific deep links use Telegram `startapp` payloads

Typical launch patterns:

- home: `https://your-domain.example/miniapp.html`
- filtered lookup: `https://your-domain.example/miniapp.html?tgWebAppStartParam=nba`
- bot deep link: `https://t.me/your_bot_username?startapp=book-2`

## Cloudflare Worker bot

The recommended reference bot is the Worker in `worker.js`.

It supports these case-insensitive commands:

- `/start`
- `/help`
- `/list`
- `/best nba`
- `/best parlays`
- `/best sides`
- `/best high-limits`
- `/parlays`
- `/nba`
- `/nfl`
- `/speed`
- `/open 1`
- `/open Rugbyrex`
- `/balance`

### What the Worker does

- reads metadata from `ACCOUNTS_JSON_URL`
- formats clean Telegram messages
- adds inline buttons for `Open Login` and `Open Mini App`
- returns book-specific Mini App deep links using `startapp=book-{id}`
- shows recent manual balance snapshots only
- stores nothing in a database

### Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `ACCOUNTS_JSON_URL`
- `MINI_APP_URL`
- `BOT_USERNAME`

Optional:

- `MINI_APP_DEEP_LINK_BASE`
- `BALANCE_RECENT_HOURS`

### Cloudflare deploy setup

1. Install Wrangler.

```bash
npm install -g wrangler
```

2. Authenticate with Cloudflare.

```bash
wrangler login
wrangler whoami
```

3. Edit `wrangler.toml`.

Example:

```toml
name = "offshore-books-bot"
main = "worker.js"
compatibility_date = "2026-04-03"

[vars]
ACCOUNTS_JSON_URL = "https://your-domain.example/accounts.sample.json"
MINI_APP_URL = "https://your-domain.example/miniapp.html"
BOT_USERNAME = "your_bot_username"
BALANCE_RECENT_HOURS = "168"
# Optional:
# MINI_APP_DEEP_LINK_BASE = "https://t.me/your_bot_username"
```

4. Set the bot token as a Worker secret.

```bash
cd /Users/nolarose/Projects/offshore-books
wrangler secret put TELEGRAM_BOT_TOKEN
```

5. Deploy the Worker.

```bash
wrangler deploy
```

6. Note the deployed Worker URL, for example:

```text
https://offshore-books-bot.your-subdomain.workers.dev
```

7. Set the Telegram webhook.

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://offshore-books-bot.your-subdomain.workers.dev/telegram/webhook"
  }'
```

8. Verify the webhook.

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### Worker health check

After deploy:

```bash
curl https://offshore-books-bot.your-subdomain.workers.dev/healthz
```

Expected response:

```json
{
  "ok": true,
  "service": "offshore-books-telegram-worker"
}
```

## Cloudflare Pages deploy

Static assets can be deployed directly from this folder.

1. Authenticate with Wrangler if you have not already:

```bash
wrangler login
wrangler whoami
```

2. Deploy the Pages project:

```bash
cd /Users/nolarose/Projects/offshore-books
PAGES_PROJECT_NAME="offshore-books-web" ./deploy-pages.sh
```

3. Note the deployed Pages URL, for example:

```text
https://offshore-books-web.pages.dev
```

4. Your app URLs will typically be:

```text
https://offshore-books-web.pages.dev/
https://offshore-books-web.pages.dev/miniapp.html
https://offshore-books-web.pages.dev/accounts.sample.json
```

5. Update `wrangler.toml` so the Worker points to the hosted JSON + Mini App URLs.

## Telegram bootstrap helper

After you have both the Worker and Pages URLs, you can configure Telegram in one step:

```bash
cd /Users/nolarose/Projects/offshore-books
export TELEGRAM_BOT_TOKEN="123456:abc"
export WORKER_WEBHOOK_URL="https://offshore-books-bot.your-subdomain.workers.dev/telegram/webhook"
export MINI_APP_URL="https://offshore-books-web.pages.dev/miniapp.html"
./bootstrap-telegram.sh
```

That script will:

- set the webhook
- register bot commands
- set the chat menu button to open the Mini App

You can still inspect the final status manually:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

## One-command deploy wrapper

For local deploys, copy the environment template first:

```bash
cd /Users/nolarose/Projects/offshore-books
cp .env.example .env
```

Edit `.env`, then run:

```bash
./deploy-all.sh
```

The wrapper will:

1. load `.env` if present
2. check `wrangler whoami`
3. deploy Cloudflare Pages via `deploy-pages.sh`
4. deploy the Worker via `wrangler deploy`
5. run `bootstrap-telegram.sh` only if `TELEGRAM_BOT_TOKEN`, `WORKER_WEBHOOK_URL`, and `MINI_APP_URL` are all set

## GitHub Actions deploy

The optional workflow lives at `.github/workflows/deploy.yml`.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TELEGRAM_BOT_TOKEN` if you want the workflow to configure Telegram

Recommended GitHub Actions variables:

- `PAGES_PROJECT_NAME`
- `WORKER_WEBHOOK_URL`
- `MINI_APP_URL`

The workflow deploys Pages and Worker on pushes to `main` that touch `offshore-books/**`, and can also be run manually with `workflow_dispatch`.

## Bun / Node fallback

If you want a traditional webhook process instead of Cloudflare, use `bot-bun.js`.

### Bun setup

1. Export env vars:

```bash
export TELEGRAM_BOT_TOKEN="123456:abc"
export ACCOUNTS_JSON_URL="http://localhost:8080/accounts.sample.json"
export MINI_APP_URL="https://your-domain.example/miniapp.html"
export BOT_USERNAME="your_bot_username"
export BALANCE_RECENT_HOURS="168"
```

2. Run the bot:

```bash
cd /Users/nolarose/Projects/offshore-books
bun run bot-bun.js
```

3. Expose it publicly with a tunnel if needed, then set Telegram webhook to:

```text
https://your-public-host.example/telegram/webhook
```

4. Health check:

```bash
curl http://localhost:8788/healthz
```

Expected response:

```json
{
  "ok": true,
  "service": "offshore-books-bot-bun"
}
```

## BotFather setup

1. Open BotFather in Telegram.
2. Create a bot with `/newbot`.
3. Copy the bot token.
4. Set the bot description and commands.
5. Set the menu button or add an inline `web_app` button in your messages.
6. Point the Mini App URL to your hosted `miniapp.html`.

Suggested BotFather command list:

```text
start - Welcome and quick help
help - Show supported commands
list - List all books
best - Search best books by sport or market
parlays - Quick parlay list
nba - Quick NBA list
nfl - Quick NFL list
speed - Quick speed-focused list
open - Open a specific book by id or name
balance - Show recent manual balance snapshots
```

## Example commands and expected output

### `/help`

```text
Offshore Books Bot

Use this bot to search metadata, launch the Mini App, and open the right login page fast.

Commands
/list
/best nba
/best parlays
/parlays
/nba
/nfl
/speed
/open 1
/open Rugbyrex
/balance
```

### `/best nba`

```text
Best matches for nba

1. Wageralldays.com
BEST OVERALL • 10k @ -105
Tags: nba, nfl, mlb, high-limits, parlays, best-overall

2. Rugbyrex.com
NBA/NFL SIDES • 10k @ -105
Tags: nba, nfl, sides, nba-sides, high-limits, metallic-skin
```

### `/open 2`

```text
Rugbyrex.com
NBA/NFL SIDES • 10k @ -105

Login: https://rugbyrex.com/
Mini App: https://t.me/your_bot_username?startapp=book-2
pmHint: rugbyrex
```

Inline buttons:

- `Open Login`
- `Open Mini App`

### `/balance`

When no recent balance snapshots exist:

```text
No recent balance snapshots found. Add them manually from the desktop dashboard first.
```

When recent snapshots exist:

```text
Recent balance snapshots

Wageralldays.com
USD 4200 • 4/3/2026, 1:15 PM • post-settlement
```

## Local validation completed

These command paths were exercised locally against the live sample JSON:

- `/help`
- `/list`
- `/best nba`
- `/best high-limits`
- `/parlays`
- `/nfl`
- `/speed`
- `/open 2`
- `/open Rugbyrex`
- `/balance`

The Worker returned clean Telegram payloads for all of them, and Mini App deep links resolved to the expected `startapp=book-{id}` format.

## Notes on deep links

Use:

- bot chat start payloads for general chat-entry flows
- `startapp` for Mini App direct links
- `tgWebAppStartParam` in the Mini App URL for filter-style launches

This project uses:

- `https://t.me/your_bot_username?startapp=book-2` for a specific book
- `https://your-domain.example/miniapp.html?tgWebAppStartParam=nba` for category filtering
