# Terminal Perfect Dashboard - ANSI-Aware Arbitrage Tables

## Overview

The Terminal Perfect Dashboard (`arb-terminal-perfect.ts`) uses `Bun.stringWidth()` to create perfectly aligned ANSI-colored tables and progress bars for real-time arbitrage monitoring.

## Features

### ✅ ANSI-Aware String Width

`Bun.stringWidth()` correctly calculates visual width, ignoring ANSI escape codes:

```typescript
const redText = '\u001b[31m5.82%\u001b[0m';
Bun.stringWidth(redText); // 5 (not 15 - ANSI codes ignored)
```

### ✅ Perfect Table Alignment

Tables are perfectly aligned regardless of ANSI colors:

```text
═══════════════════════════════════════════════════════════════════════════════
Rank │ League   │ Profit │ Value       │ Status 
──────┼──────────┼────────┼─────────────┼────────
1    │ NFL      │ 5.82%🔴│ $378,000    │ EXEC   
2    │ NBA      │ 4.37%🟢│ $214,000    │ WAIT   
═══════════════════════════════════════════════════════════════════════════════
```

### ✅ Progress Bars

Color-coded progress bars with ANSI colors:

```text
📈 PROFIT DISTRIBUTION
NFL Q4      ████████████████████████░░ 58.2%
NBA Q2      ██████████████████░░░░░░░░ 43.7%
```

### ✅ Live Metrics

Real-time metrics with progress visualization:

```text
⚙️  LIVE METRICS
Scans: ████████████████████████████░░ 94.5% 5670/min
Profit: █████████████████░░░░░░░░░░░ 50.2% 5.02%
Value:  ████████████████████████░░░░░ 89.4% $894K
```

## Usage

```bash
# Start terminal dashboard
bun run terminal:start

# Run tests
bun run terminal:test
```

## Key Functions

### `padToWidth(str, targetWidth)`

ANSI-aware padding helper that uses `Bun.stringWidth()`:

```typescript
function padToWidth(str: string, targetWidth: number): string {
  const width = Bun.stringWidth(str);
  const padding = Math.max(0, targetWidth - width);
  return str + ' '.repeat(padding);
}
```

### `formatArbTableRow(arb, rank)`

Formats arbitrage opportunity with ANSI colors:

```typescript
const profitColor = arb.profit_pct > 0.05 
  ? ANSI.red 
  : arb.profit_pct > 0.04 
  ? ANSI.yellow 
  : ANSI.green;

const profitStr = `${profitColor}${(arb.profit_pct * 100).toFixed(2)}%${ANSI.reset}`;
```

### `createProgressBar(value, width)`

Creates color-coded progress bar:

```typescript
function createProgressBar(value: number, width: number): string {
  const filled = Math.floor(Math.min(value, 100) / 100 * width);
  const empty = width - filled;
  
  let color = ANSI.green;
  if (value >= 5) color = ANSI.green;
  else if (value >= 4) color = ANSI.yellow;
  else color = ANSI.red;
  
  return `${color}${'█'.repeat(filled)}${ANSI.gray}${'░'.repeat(empty)}${ANSI.reset}`;
}
```

## Performance

- **60fps table refresh** - Smooth updates every 16ms
- **10fps metrics refresh** - Metrics update every 100ms
- **ANSI-aware width calculation** - O(1) per string

## ANSI Color Codes

```typescript
const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  gray: '\u001b[90m',
};
```

## Database Schema

```sql
CREATE TABLE arb_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league TEXT NOT NULL,
  market TEXT NOT NULL,
  profit_pct REAL NOT NULL,
  value_usd REAL NOT NULL,
  execute_now INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Benefits

1. **Perfect Alignment** - Tables align correctly with ANSI colors
2. **Visual Clarity** - Color-coded profit percentages and status
3. **Real-time Updates** - 60fps refresh for smooth experience
4. **Memory Efficient** - Uses SQLite for data storage
5. **Production Ready** - Handles errors gracefully

## Related Documentation

- [Bun.stringWidth() API](https://docs.bun.sh/runtime/bun-apis#bun-stringwidth)
- [Stream Arbitrage Engine](./STREAM-ARB-ENGINE.md)
- [FileHandle.readLines()](./FILEHANDLE-READLINES.md)



