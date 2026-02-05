# [DASHBOARD.NAVIGATION.RG] Dashboard Navigation Guide

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-DASHBOARD-NAVIGATION@0.1.0;instance-id=DASHBOARD-NAV-001;version=0.1.0}][PROPERTIES:{dashboard={value:"navigation";@root:"ROOT-DASHBOARD";@chain:["BP-DASHBOARD","BP-NAVIGATION"];@version:"0.1.0"}}][CLASS:DashboardNavigation][#REF:v-0.1.0.BP.DASHBOARD.NAVIGATION.1.0.A.1.1.DASHBOARD.1.1]]`

## 1. Overview

Complete navigation guide for the NEXUS Trading Dashboard with all keyboard shortcuts and view modes.

**Code Reference**: `#REF:v-0.1.0.BP.DASHBOARD.NAVIGATION.1.0.A.1.1.DASHBOARD.1.1`  
**Files**: `src/cli/dashboard.ts`

## 2. View Modes

### 2.1 Overview Mode (Default)

**Shortcut**: `ESC` or `c`  
**Shows**: All panels in a comprehensive overview
- System Health
- Trade Streams
- Arbitrage Scanner
- Trade Executor
- Trading Stats (wins/losses/P&L)
- Sports Betting Stats
- Telegram Bot Status
- Sharp Books
- MCP Tools
- Miniapp Status
- System Metrics
- Cache Stats
- Performance Metrics

### 2.2 Arbitrage View

**Shortcut**: `a` or `e`  
**Shows**: Focused arbitrage and execution data
- Arbitrage Scanner (full details)
- Trade Executor (execution stats)
- Sharp Books (for arbitrage opportunities)
- Performance Metrics

### 2.3 Streams View

**Shortcut**: `s`  
**Shows**: Trade stream data
- Trade Streams (full list)
- System Health
- Sharp Books
- Performance Metrics

### 2.4 Trading View

**Shortcut**: `w`  
**Shows**: Trading performance and P&L
- Trading Stats (wins, losses, P&L, win rate)
- Trade Streams (context)
- System Health
- Performance Metrics

### 2.5 Sports Betting View

**Shortcut**: `o`  
**Shows**: Sports betting performance
- Sports Betting Stats (bets, wins, losses, ROI)
- Sharp Books (sportsbook connections)
- Arbitrage Scanner (sports arbitrage)
- System Health
- Performance Metrics

### 2.6 Bot View

**Shortcut**: `b`  
**Shows**: Telegram bot status
- Telegram Bot Status (running, users, live outs)
- System Health
- Performance Metrics

### 2.7 Tools View

**Shortcut**: `t`  
**Shows**: MCP tools available
- MCP Tools (all available tools)
- System Health
- Performance Metrics

### 2.8 Metrics View

**Shortcut**: `m`  
**Shows**: System metrics
- System Metrics (CPU, memory, disk, processes)
- System Health
- Performance Metrics

### 2.9 Logs View

**Shortcut**: `l`  
**Shows**: Error logs and log statistics
- Logs (error counts, recent errors)
- System Health
- Performance Metrics

### 2.10 Rankings View

**Shortcut**: `k`  
**Shows**: Tool and file rankings
- Rankings (top tools by usage, largest files)
- System Health
- Performance Metrics

### 2.11 Help View

**Shortcut**: `h`  
**Shows**: Comprehensive help screen with all shortcuts and features

## 3. Complete Keyboard Shortcuts

| Key | Action | View Mode |
|-----|--------|-----------|
| `q` | Quit dashboard | - |
| `r` | Force refresh | Current view |
| `a` | Arbitrage view | `arbitrage` |
| `s` | Streams view | `streams` |
| `w` | Trading view | `trading` |
| `o` | Sports betting view | `sports` |
| `b` | Bot view | `bot` |
| `t` | Tools view | `tools` |
| `m` | Metrics view | `metrics` |
| `l` | Logs view | `logs` |
| `k` | Rankings view | `rankings` |
| `c` | Cache view (overview) | `overview` |
| `e` | Executor view (arbitrage) | `arbitrage` |
| `h` | Help screen | `help` |
| `ESC` | Return to overview | `overview` |

## 4. Navigation Flow

```
Overview (default)
├── Arbitrage (a/e) → Arbitrage Scanner + Executor
├── Streams (s) → Trade Streams
├── Trading (w) → Trading Stats + Streams
├── Sports (o) → Sports Betting + Sharp Books
├── Bot (b) → Telegram Bot Status
├── Tools (t) → MCP Tools
├── Metrics (m) → System Metrics
├── Logs (l) → Error Logs
├── Rankings (k) → Tool/File Rankings
└── Help (h) → Help Screen

ESC → Always returns to Overview
```

## 5. Panel Organization

### 5.1 Always Visible (Bottom Bar)

- Keyboard shortcuts bar (shows current shortcuts)
- Status bar (last update, refresh interval, uptime)

### 5.2 View-Specific Panels

Each view mode shows relevant panels:
- **Overview**: All panels (comprehensive)
- **Focused Views**: Specific panels + context (health, performance)

### 5.3 Context Panels

Most views include:
- System Health (for API status)
- Performance Metrics (for refresh stats)

## 6. Data Requirements

### 6.1 Trading Stats Panel

**Requires**: 
- API server running (`bun run dev`)
- Trade data imported (`bun run fetch file bitmex_executions.csv`)

**Shows**: Wins, losses, P&L, win rate

### 6.2 Sports Betting Panel

**Requires**:
- API server running
- ORCA stream started (`POST /orca/stream/start`)

**Shows**: Bets, wins, losses, ROI

### 6.3 Bot Status Panel

**Requires**:
- API server running
- Bot started (`POST /telegram/bot/start`)

**Shows**: Bot status, users, live outs

## 7. Troubleshooting Navigation

### Issue: Shortcut doesn't work

1. Check if key is mapped in `setupKeyboardHandler`
2. Verify view mode exists in `viewMode` type
3. Check if view has render logic in `render()` function

### Issue: View shows wrong panels

1. Check `render()` function for that view mode
2. Verify panels are created before render
3. Check panel order matches expected layout

### Issue: Help screen shows wrong shortcuts

1. Update `renderHelpScreen()` function
2. Update `renderHelp()` shortcuts array
3. Update `--help` output in `main()`

## 8. Best Practices

1. **Consistent Navigation**: All views use same pattern (main panel + health + performance)
2. **Clear Shortcuts**: Each view has a single, memorable shortcut
3. **Help Always Available**: Press `h` from any view
4. **Quick Return**: `ESC` always returns to overview
5. **Refresh Anywhere**: `r` refreshes current view

## 9. References

- **Dashboard Code**: `src/cli/dashboard.ts`
- **Keyboard Handler**: `setupKeyboardHandler()` function
- **Render Logic**: `render()` function
- **View Modes**: `DashboardState["viewMode"]` type
