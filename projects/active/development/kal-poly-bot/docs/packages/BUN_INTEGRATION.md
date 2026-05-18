# Bun Integration Guide

## Overview

This project integrates **Bun** (JavaScript/TypeScript runtime) to provide process control and monitoring for the Rust arbitrage bot.

**Why Bun?**
- Fast JavaScript runtime (for monitoring dashboards)
- Process spawning with `spawn()` and `exec()`
- Native TypeScript support (no compilation needed)
- REST API via `Bun.serve()`
- Zero external dependencies

## Setup

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
bun --version
```

### 2. Install Tools

```bash
bun install --global esbuild  # Optional, for bundling
```

## Usage

### Bot Controller (REST API + Dashboard)

Start the control panel:

```bash
bun bot-controller.ts
```

**Features:**
- Web dashboard: `http://localhost:3000`
- REST API endpoints:
  - `POST /api/start` - Start bot
  - `POST /api/stop` - Stop bot
  - `POST /api/restart` - Restart bot
  - `GET /api/status` - Get bot status (JSON)

**Example API calls:**

```bash
# Check status
curl http://localhost:3000/api/status

# Start bot
curl -X POST http://localhost:3000/api/start

# Stop bot
curl -X POST http://localhost:3000/api/stop
```

### Bot Monitor (Live Dashboard)

```bash
bun bot-monitor.ts
```

**Features:**
- Real-time trade metrics
- P&L tracking
- Win rate calculation
- Last trade details
- Auto-refresh every 2 seconds

## Architecture

```text
┌─────────────────┐
│  Bun Scripts    │
├─────────────────┤
│ Controller/API  │  REST server + Web UI
│ Monitor/Display │  Real-time metrics
└────────┬────────┘
         │ spawn()
         ↓
┌─────────────────┐
│  Rust Bot       │
├─────────────────┤
│ arb-bot binary  │  Arbitrage detection
│ WebSocket mgmt  │  Order execution
│ Position track  │  P&L calculation
└─────────────────┘
```

## Development

### Running Tests

```bash
# Test bot controller
bun --test bot-controller.ts

# Type check
bunx tsc --noEmit --allowJs bot-controller.ts
```

### Building Bundles (Optional)

```bash
# Bundle for deployment
bun build --target=bun bot-controller.ts --outfile=dist/controller.js
```

## Integration Patterns

### 1. Process Management

```typescript
// Start bot via Bun
const proc = spawn([BOT_BINARY]);

// Stream output
for await (const line of proc.stdout) {
  console.log(line);
}
```

### 2. Monitoring via REST

```bash
# Poll bot status every 5 seconds
watch -n 5 'curl -s http://localhost:3000/api/status | jq'
```

### 3. Docker Integration (Optional)

```dockerfile
FROM oven/bun:latest
COPY . /app
WORKDIR /app
CMD ["bun", "bot-controller.ts"]
```

## Troubleshooting

### "Bot binary not found"

Make sure to build first:

```bash
cargo build --release --bin arb-bot
```

### Bun not found

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Port already in use

Change `PORT` constant in `bot-controller.ts`:

```typescript
const PORT = 3001; // Use different port
```

## Performance Notes

- **Startup**: ~100ms (Bun runtime)
- **API latency**: <10ms (JSON response)
- **Monitoring refresh**: 2 second intervals
- **Memory overhead**: ~20-30MB (Bun + scripts)

## 🚀 Telegram Integration (New!)

### Setup
1. **Create Telegram Bot**:
   ```
   /newbot @BotFather → Name → Username → Get TOKEN
   ```

2. **Create/Use Supergroup**:
   - Add bot as admin
   - Enable topics
   - Note topic IDs (web: t.me/c/CHAT_ID/TOPIC_ID or getUpdates)

3. **Configure .env**:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_CHAT_ID=-1001234567890
   TELEGRAM_TOPICS={"general":0,"arbs":1,"errors":2,"heartbeats":0,"EPL":3,"NBA":4}
   ```

### Events Notified
- 💓 Heartbeats → `heartbeats` topic
- 📊 Profitable arbs (>0¢ gap) → `arbs` + league-specific (EPL,NBA,SerieA,Bundesliga,LaLiga,EFL,MLB,NFL,NHL,MLS,...)
- 📈 Metrics summaries (every 5min) → `metrics` topic

### New Metrics Features
- **GET /api/metrics**: JSON P&L, open positions from `positions.json`
- **Control Panel**: Live metrics display + auto-refresh every 10s
- **TELEGRAM_TOPICS**: Add `"metrics":13` for periodic summaries


- ⚡ Trades/EXEC → `arbs`
- ❌ ERROR → `errors`
- 🛑 CB tripped → `errors`
- 📈 Discovery/State → `general`

### Usage
```bash
cd poly-kalshi-arb
bun bot-controller.ts  # Starts bot + Telegram notifies
```

**Control Panel**: http://localhost:3000
- Test Telegram button sends sample message

## Future Enhancements

- [ ] WebSocket real-time updates (instead of polling)
- [ ] Database backend (SQLite for trade history)
- [ ] Grafana/Prometheus metrics export
- [ ] Mobile-friendly dashboard
- [ ] Trade replay/backtest mode
- [ ] Alert system (Slack/Discord)

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Process API](https://bun.sh/docs/api/spawn)
- [TypeScript in Bun](https://bun.sh/docs/runtime/typescript)
