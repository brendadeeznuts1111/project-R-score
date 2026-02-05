# Dashboard CLI

**11.3.0.0.0.0.0: Live Trading Dashboard**

Live trading dashboard with real-time monitoring and controls.

**Cross-Reference:**
- `6.0.0.0.0.0.0` → Market Intelligence Visualization Subsystem
- `7.18.x.x.x.x.x` → HTTP Server & Cookie Management
- `11.2.0.0.0.0.0` → MCP Tools Integration

## 11.3.0.1.0.0.0: Usage

```bash
bun run dashboard [options]
```

## 11.3.1.0.0.0.0: Options

- `--help, -h` - Show help message
- `--once` - Run once and exit (no live updates)
- `--interval <ms>` - Set refresh interval (default: 5000ms)
- `--api <url>` - Set API URL (default: http://localhost:3000)

## 11.3.2.0.0.0.0: Keyboard Controls

### 11.3.2.1.0.0.0: Navigation

- `q` - Quit dashboard
- `r` - Force refresh (immediate update)
- `ESC` - Return to overview
- `h` - Show/hide help screen

### 11.3.2.2.0.0.0: Views

- `a` - Arbitrage view (scanner + executor)
- `s` - Streams view (trade data)
- `w` - Trading view (wins/losses/P&L)
- `o` - Sports betting view (ORCA stats)
- `b` - Bot view (Telegram bot status)
- `t` - Tools view (MCP tools)
- `m` - Metrics view (system metrics)
- `l` - Logs view (error logs)
- `k` - Rankings view (tool/file rankings)

## 11.3.3.0.0.0.0: Features

- **Real-time trade stream monitoring**
- **Cross-market arbitrage opportunity detection**
- **Live trading executor status**
- **System health and performance metrics**
- **Cache statistics and optimization**

## 11.3.4.0.0.0.0: Data Sources

- **Trade Streams:** SQLite database (CSV/API imports)
- **Arbitrage:** Polymarket, Kalshi, Deribit APIs
- **Executor:** In-memory execution state
- **Sharp Books:** Professional sportsbook registry (6 books)
- **Cache:** Redis/in-memory cache statistics
- **Health:** API server status

## 11.3.5.0.0.0.0: Sharp Books Registry

The dashboard displays Sharp Books rankings:

- **S+ Tier:** Circa (9.8 weight, 180ms latency)
- **S Tier:** Pinnacle (9.5 weight, 90ms latency)
- **A+ Tier:** Crisp (8.5 weight, 120ms latency)
- **A Tier:** BetCRIS, Bookmaker.eu (7.0-7.5 weight)

## 11.3.6.0.0.0.0: Environment Variables

- `API_URL` - API base URL (default: http://localhost:3000)
- `REFRESH_INTERVAL` - Refresh interval in ms

## 11.3.8.0.0.0.0: Examples

```bash
# Start dashboard with default settings
bun run dashboard

# Run once (no live updates)
bun run dashboard --once

# Custom refresh interval
bun run dashboard --interval=10000

# Custom API URL
bun run dashboard --api=http://localhost:3001
```

## 11.3.7.0.0.0.0: Views

### 11.3.7.1.0.0.0: Overview (Default)

Shows system health, trade streams, arbitrage opportunities, executor status, cache stats.

### 11.3.7.2.0.0.0: Arbitrage View (`a`)

- Scanner status
- Active opportunities
- Executor state
- Recent executions

### 11.3.7.3.0.0.0: Streams View (`s`)

- Trade stream list
- Stream statistics
- Import status

### 11.3.7.4.0.0.0: Trading View (`w`)

- Win/loss statistics
- P&L breakdown
- Position analysis

### 11.3.7.5.0.0.0: Sports Betting View (`o`)

- ORCA statistics
- Bookmaker rankings
- Market data

### 11.3.7.6.0.0.0: Bot View (`b`)

- Telegram bot status
- Message statistics
- Topic management

### 11.3.7.7.0.0.0: Tools View (`t`)

- MCP tools status
- Tool execution results
- Diagnostics

### 11.3.7.8.0.0.0: Metrics View (`m`)

- System metrics
- Performance data
- Resource usage

### 11.3.7.9.0.0.0: Logs View (`l`)

- Error logs
- System logs
- Recent events

### 11.3.7.10.0.0.0: Rankings View (`k`)

- Tool rankings
- File rankings
- Performance metrics

## 11.3.9.0.0.0.0: Implementation Details

- Uses `Bun.serve()` for API calls
- Real-time updates via polling
- Keyboard input handling
- Terminal UI with colors and formatting

## 11.3.10.0.0.0.0: See Also

- [Dashboard Source](../src/cli/dashboard.ts)
- [API Routes](../src/api/routes.ts)
