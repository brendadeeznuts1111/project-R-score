# 🖥️ Dashboard UI Preview

## Terminal Dashboard (`bun run dashboard`)

### Full Dashboard View

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  NEXUS TRADING DASHBOARD                                    ║
║  12/19/2024, 3:45:23 PM  │  Memory: 45.2 MB  │  Bun 1.3.3       ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─ System Health ─────────────────────────────────────────────────────────────┐
│                                                                              │
│ Status   ONLINE                                                              │
│ Uptime   2h 34m 12s                                                          │
│ API      http://localhost:3000                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Trade Streams ─────────────────────────────────────────────────────────────┐
│                                                                              │
│ API BTC/USDT     12,543 trades                                               │
│ API ETH/USDT      8,921 trades                                               │
│ FILE Historical   5,234 trades                                               │
│ API SOL/USDT      3,456 trades                                               │
│ API MATIC/USDT    2,109 trades                                               │
│                                                                              │
│ Total: 32,263 trades                                                         │
│ Range: 12/01/2024 - 12/19/2024                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Arbitrage Scanner ─────────────────────────────────────────────────────────┐
│                                                                              │
│ Status     SCANNING                                                          │
│ Last Scan  3:45:18 PM                                                       │
│                                                                              │
│ Active Opportunities:                                                       │
│   crypto     Polymarket    → Kalshi           +2.45%                         │
│   politics   Polymarket    → Betfair          +1.87%                         │
│   sports     DraftKings    → Betfair          +1.23%                         │
│   crypto     Deribit        → Polymarket       +0.98%                         │
│   economics  Kalshi        → Polymarket       +0.76%                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Trade Executor ────────────────────────────────────────────────────────────┐
│                                                                              │
│ Mode       PAPER                                                             │
│ Status     RUNNING                                                            │
│ Positions  3                                                                 │
│ Trades     12                                                                │
│ P&L        +$1,234.56                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Cache Stats ────────────────────────────────────────────────────────────────┐
│                                                                              │
│ Hits      45,234                                                             │
│ Misses    1,234                                                               │
│ Size      2,456 entries                                                      │
│ Hit Rate  97.3%                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────────────
  q: quit  │  r: refresh  │  a: arbitrage detail  │  s: streams detail  │  h: help
────────────────────────────────────────────────────────────────────────────────

Last updated: 3:45:23 PM │ Refresh: 5s
```

## Color-Coded Status Indicators

### Status Badges
- **ONLINE** - Green badge (system healthy)
- **OFFLINE** - Red badge (system down)
- **SCANNING** - Green badge (active scanning)
- **PAUSED** - Yellow badge (scanner paused)
- **LIVE** - Red badge (live trading mode)
- **PAPER** - Yellow badge (paper trading mode)
- **RUNNING** - Green badge (executor active)
- **STOPPED** - Blue badge (executor stopped)

### Spread Colors
- **+2.0%+** - Bright green (high-value opportunities)
- **+1.0% to +2.0%** - Green (good opportunities)
- **<1.0%** - Yellow (low-value opportunities)

### Cache Hit Rate Colors
- **>80%** - Bright green (excellent)
- **50-80%** - Yellow (good)
- **<50%** - Red (needs improvement)

## Interactive Features

### Keyboard Controls
- **`q`** - Quit dashboard
- **`r`** - Force refresh (immediate update)
- **`a`** - Show arbitrage detail view
- **`s`** - Show streams detail view
- **`h`** - Show help menu
- **`Ctrl+C`** - Emergency quit

### Real-Time Updates
- Auto-refreshes every 5 seconds (configurable)
- Smooth screen clearing and redrawing
- Cursor hidden during display
- Non-blocking keyboard input

## Usage Examples

### Basic Usage
```bash
# Start interactive dashboard
$ bun run dashboard

# One-shot mode (no auto-refresh)
$ bun run dashboard --once

# Custom refresh interval (10 seconds)
$ bun run dashboard --interval 10000

# Custom API URL
$ bun run dashboard --api http://localhost:3001
```

### Environment Variables
```bash
# Set API base URL
export API_URL=http://localhost:3000

# Set refresh interval (milliseconds)
export REFRESH_INTERVAL=5000

# Run dashboard
bun run dashboard
```

## Panel Details

### System Health Panel
- **Status**: Current system health (ONLINE/OFFLINE)
- **Uptime**: How long the system has been running
- **API**: Base URL for API requests

### Trade Streams Panel
- **Active Streams**: Top 5 active trade streams
- **Source Badges**: API (blue) or FILE (cyan) indicators
- **Trade Counts**: Formatted numbers with thousands separators
- **Date Range**: Time range of loaded data

### Arbitrage Scanner Panel
- **Status**: Current scanner state
- **Last Scan**: Timestamp of most recent scan
- **Opportunities**: Top 5 active arbitrage opportunities
- **Spread Display**: Color-coded spread percentages

### Trade Executor Panel
- **Mode**: LIVE (red) or PAPER (yellow) trading mode
- **Status**: RUNNING (green) or STOPPED (blue)
- **Positions**: Current open positions count
- **Trades**: Total trades executed
- **P&L**: Profit & Loss (green for profit, red for loss)

### Cache Stats Panel
- **Hits**: Successful cache retrievals
- **Misses**: Cache misses
- **Size**: Current cache entry count
- **Hit Rate**: Percentage (color-coded by performance)

## Visual Design Features

### ANSI Color Support
- Full 256-color terminal support
- Gradient text for headers
- Color-coded status indicators
- Readable contrast ratios

### Box Drawing
- Unicode box-drawing characters
- Clean borders and separators
- Consistent padding and alignment
- Professional appearance

### Typography
- Monospace font for tables
- Clear hierarchy (headers, labels, values)
- Formatted numbers (currency, percentages, durations)
- Truncated long text with ellipsis

## Performance

- **Low Latency**: Updates render in <100ms
- **Memory Efficient**: Minimal memory footprint
- **Non-Blocking**: Keyboard input doesn't block rendering
- **Smooth Updates**: Screen clears and redraws without flicker

## Error Handling

- **API Failures**: Gracefully handles failed API calls
- **Network Issues**: Shows "OFFLINE" status
- **Invalid Data**: Displays "N/A" or "--" for missing data
- **Clean Exit**: Properly restores terminal on quit
