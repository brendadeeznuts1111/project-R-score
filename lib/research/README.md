# Research agent

Background crawler that discovers partner markets / max stakes, records
per-account limit history, pushes liquidity spots, and bridges **events +
snapshots + change alerts** into the operator desk (`/api/events`, Alert Manager).

```
Research Agent (cron · 5m fixture / 30s when LIVE)
├── PartnerFetchers (HardRock · Fonbet · extensible)
│     fetchMarkets → limits + liquidity
│     fetchEvents  → PartnerEvent[] (fixture-first)
├── Canonicalizer  → odds SQLite (events + canonical_event_mapping)
├── Snapshot store → data/research/snapshots/** (+ optional R2)
├── Limit Tracker  → data/research/limits.db
├── Liquidity Pusher → in-memory store (+ optional remote POST)
└── Event alerts   → data/research/alerts.json → Telegram / webhook + alerts table
```

## Operate

```bash
# One-shot cycle (fixtures by default)
bun run agent research-cycle
bun run agent research-cycle --live --json

# Dashboard also starts the agent on serve
bun run agent serve --port 8790 --no-odds
# RESEARCH_AGENT_LIVE=1 to attempt live partner URLs (requires *_RESEARCH_URL)
```

## Env

| Variable | Purpose |
|----------|---------|
| `RESEARCH_AGENT_LIVE` | `1` to prefer live partner URLs |
| `RESEARCH_AGENT_INTERVAL_MS` | Override poll interval (default 5m; live default 30s) |
| `HARDROCK_RESEARCH_URL` | Optional live Hard Rock JSON (**required** for live; no default URL) |
| `HARDROCK_ACCOUNT_ID` | Optional account tag on observations |
| `FONBET_RESEARCH_URL` | Optional live Fonbet JSON |
| `FONBET_API_KEY` | Bearer for Fonbet live URL |
| `FONBET_ACCOUNT_ID` | Optional account tag |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_FACTORY` | Telegram delivery via partners-signal |
| `TELEGRAM_OPS_CHAT_ID` | Ops chat fallback for event alerts |
| `EVENT_ALERT_WEBHOOK` | Optional POST target for `webhook` alert actions |
| R2 (`R2_ENDPOINT`, keys, bucket) | Optional cold archive of snapshots |

## HTTP

| Route | Notes |
|-------|-------|
| `GET /api/research/markets` | Latest markets from last cycle + coverage |
| `GET /api/research/coverage` | Sport/league/partner rollup |
| `GET /api/research/limits?partnerId=` | SQLite history |
| `POST /api/research/run` | Trigger one cycle (`events` / `snapshotsStored` / `alertsFired`) |
| `POST /api/research/cycle` | Alias of run with event-monitor fields |
| `GET /api/events?session=live\|pregame` | Desk event list (+ `/api/research/events`) |
| `GET /api/events/:id` | Detail + `partner_mappings` |
| `GET /api/events/:id/history` | Odds series, else snapshot fallback |
| `GET/PUT /api/research/alerts` | Event-monitor configs (`alerts.json`) |
| `GET /api/alerts/rules` | Unified TOML + research event triggers |

## Change detection

Snapshots hash **prices** separately from limits. Changes emit
`new_event` | `price_change` | `limit_change`, then the alert engine filters
configs (threshold % for price) and writes the shared `alerts` history table.
