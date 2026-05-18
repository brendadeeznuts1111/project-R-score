# HMR Integration for Bookmark Manager & Scanner

## Overview

Hot Module Replacement (HMR) support for development, preserving state across code changes.

## Quick Start

```bash
# Run bookmark manager with HMR
bun --hot chrome-bookmark-manager.ts

# Run scanner with HMR
bun --hot enterprise-scanner.ts

# Monitor HMR events
bun --hot hmr-monitor.ts monitor
```

## Features

### State Preservation

- **Bookmark Manager**: Preserves manager instance and bookmarks across updates
- **Scanner**: Preserves scanner instance and configuration
- **Statistics**: Tracks HMR events and health

### HMR Monitoring

```typescript
import { BookmarkManagerHMRMonitor } from "./bookmark-manager-hmr.ts";

const monitor = new BookmarkManagerHMRMonitor();
monitor.start(); // Real-time monitoring
```

### Statistics

```typescript
import { getHMRStats } from "./bookmark-manager-hmr.ts";

const stats = getHMRStats();
console.log(`Health: ${stats.health} (${stats.score}/100)`);
console.log(`Updates: ${stats.updates}`);
console.log(`Errors: ${stats.errors}`);
```

## Usage

### Bookmark Manager with HMR

```typescript
import { getBookmarkManager } from "./bookmark-manager-hmr.ts";

// Get manager instance (preserved across HMR updates)
const manager = getBookmarkManager();

// Use normally - state is preserved
await manager.syncWithChrome();
await manager.interactiveTree();
```

### Scanner with HMR

```typescript
import { getScanner } from "./scanner-hmr.ts";

const scanner = getScanner({
  mode: "audit",
  format: "sarif"
});

await scanner.initialize();
const result = await scanner.scan(".");
```

### HMR Monitor CLI

```bash
# Real-time monitoring
bun --hot hmr-monitor.ts monitor

# Statistics
bun --hot hmr-monitor.ts stats

# Health report
bun --hot hmr-monitor.ts report
```

## HMR Events Tracked

| Event | Impact | Description |
|-------|--------|-------------|
| `bun:beforeUpdate` | 0 | Module about to be replaced |
| `bun:afterUpdate` | 0 | Module successfully replaced |
| `bun:beforeFullReload` | -3 | Full page reload triggered |
| `bun:error` | -5 | HMR error occurred |
| `bun:ws:disconnect` | -2 | WebSocket disconnected |
| `bun:ws:connect` | +5 | WebSocket reconnected |

## Health Scoring

| Grade | Score | Status |
|-------|-------|--------|
| A+ | 95-100 | Excellent |
| A | 90-94 | Great |
| B | 80-89 | Good |
| C | 70-79 | Acceptable |
| D | 60-69 | Poor |
| F | 0-59 | Critical |

## State Preservation

### Bookmark Manager State

```typescript
// State automatically preserved via import.meta.hot.data
if (import.meta.hot) {
  import.meta.hot.data.manager = managerInstance;
  import.meta.hot.data.stats = hmrStats;
}
```

### Scanner State

```typescript
// Scanner instance and stats preserved
if (import.meta.hot) {
  import.meta.hot.data.scanner = scannerInstance;
  import.meta.hot.data.stats = scannerHMRStats;
}
```

## Development Workflow

### 1. Start with HMR

```bash
bun --hot chrome-bookmark-manager.ts
```

### 2. Make Code Changes

Edit files - changes hot-reload automatically:
- Manager instance preserved
- Bookmarks remain in memory
- Configuration maintained

### 3. Monitor HMR Health

```bash
# In another terminal
bun --hot hmr-monitor.ts monitor
```

## Benefits

1. **Faster Development**: No need to restart and re-sync
2. **State Preservation**: Bookmarks and config persist
3. **Real-time Feedback**: See updates immediately
4. **Health Monitoring**: Track HMR performance

## Troubleshooting

### HMR Not Available

```bash
# Must use --hot flag
bun --hot run app.ts

# Check in code
if (import.meta.hot) {
  console.log("HMR available");
}
```

### State Lost

Ensure state is saved to `import.meta.hot.data`:

```typescript
if (import.meta.hot) {
  import.meta.hot.data.manager = manager;
  import.meta.hot.accept();
}
```

### Frequent Full Reloads

Add HMR boundaries to entry files:

```typescript
if (import.meta.hot) {
  import.meta.hot.accept();
}
```
