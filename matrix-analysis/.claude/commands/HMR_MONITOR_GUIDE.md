# HMR Monitor - Hot Module Replacement Diagnostics

Real-time HMR event monitoring for Bun development with `Bun.serve()` hot reload support.

## Quick Reference

```bash
# Start dev server with HMR
bun --hot run app.ts                    # CLI hot mode
bun --watch run app.ts                  # Watch mode (full reload)

# Monitor HMR events
bun ~/.claude/scripts/diagnose-hmr.ts monitor
bun ~/.claude/scripts/diagnose-hmr.ts stats
bun ~/.claude/scripts/diagnose-hmr.ts report
```

## Commands

| Command | Description | Bun APIs Used |
|---------|-------------|---------------|
| `monitor` | Real-time event monitoring | `import.meta.hot`, WebSocket |
| `stats` | Show HMR statistics | `Bun.nanoseconds` |
| `report` | Health report with recommendations | `Bun.inspect.table` |
| `benchmark` | Measure reload performance | `Bun.nanoseconds` |

## Bun.serve() Hot Reload

### Server with Hot Handler Swap

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello World");
  },
});

// Hot-swap fetch handler without restart
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    server.reload({
      fetch(req) {
        return new Response("Updated Handler!");
      },
    });
  });
}
```

### Development Mode Detection

```typescript
const server = Bun.serve({
  port: 3000,
  development: true, // Enable detailed errors
  fetch(req) {
    return new Response("Dev mode");
  },
});

// Check development mode
console.log(server.development); // true
```

### Watch Mode with Bun.serve

```bash
# Watch mode (restarts on file change)
bun --watch run server.ts

# Hot mode (preserves state, hot swaps)
bun --hot run server.ts
```

### --watch vs --hot

| Feature | --watch | --hot |
|---------|---------|-------|
| Process restart | Yes | No |
| State preserved | No | Yes |
| WebSocket connections | Lost | Maintained |
| Memory cleared | Yes | No |
| Use case | Config changes | UI/handler updates |

## Events Tracked

| Event | Icon | Impact | Description |
|-------|------|--------|-------------|
| `bun:beforeUpdate` | → | - | Module about to be replaced |
| `bun:afterUpdate` | ✓ | - | Module successfully replaced |
| `bun:beforeFullReload` | ⚠ | -3 pts | Full page reload triggered |
| `bun:error` | ✗ | -5 pts | HMR error occurred |
| `bun:ws:disconnect` | ↓ | -2 pts | WebSocket disconnected |
| `bun:ws:connect` | ↑ | +5 pts | WebSocket reconnected |

## Health Scoring

| Grade | Score | Status | Recommendation |
|-------|-------|--------|----------------|
| A+ | 95-100 | Excellent | Maintain current patterns |
| A | 90-94 | Great | Minor optimizations possible |
| B | 80-89 | Good | Review full reload causes |
| C | 70-79 | Acceptable | Add more HMR boundaries |
| D | 60-69 | Poor | Fix frequent errors |
| F | 0-59 | Critical | Major HMR issues |

## Workflow Examples

### Real-Time Monitoring

```bash
bun ~/.claude/scripts/diagnose-hmr.ts monitor
```

Output:
```
╔══════════════════════════════════════════════════════════════╗
║  🔥 HMR Monitor - Live                                       ║
╠══════════════════════════════════════════════════════════════╣
║  Health: A (95/100)                                          ║
║  Hot Updates:    24     Full Reloads:   2                    ║
║  Errors:          0     Frequency:   4.8/min                 ║
╠══════════════════════════════════════════════════════════════╣
║  Recent Events:                                              ║
║  12:34:15  ✓  src/components/Button.tsx                      ║
║  12:34:12  ✓  src/utils/format.ts                            ║
║  12:34:08  →  src/api/routes.ts                              ║
║  12:33:55  ⚠  Full reload (circular dep detected)            ║
╚══════════════════════════════════════════════════════════════╝

Press Ctrl+C for summary
```

### Statistics Report

```bash
bun ~/.claude/scripts/diagnose-hmr.ts stats
```

Output using `Bun.inspect.table()`:
```
┌───┬────────────────────┬───────┬─────────┬──────────┐
│   │ Module             │ Count │ Avg ms  │ Status   │
├───┼────────────────────┼───────┼─────────┼──────────┤
│ 0 │ src/App.tsx        │    12 │    45   │ ✅ Fast  │
│ 1 │ src/api/routes.ts  │     8 │    78   │ ⚠️ Slow  │
│ 2 │ src/utils/format   │    24 │    12   │ ✅ Fast  │
│ 3 │ src/config.ts      │     2 │   120   │ 🔴 Root  │
└───┴────────────────────┴───────┴─────────┴──────────┘

Summary:
  Total Updates: 46
  Average Time: 52ms
  Fastest: src/utils/format.ts (12ms)
  Slowest: src/config.ts (120ms)
```

### Health Report

```bash
bun ~/.claude/scripts/diagnose-hmr.ts report
```

Output:
```
📊 HMR Health Report

Overall Score: B (85/100)

Issues Found:
  ⚠️ High frequency of updates (6.2/min)
     Recommendation: Batch rapid saves

  ⚠️ 3 full reloads detected
     Files: src/config.ts, src/index.ts, src/app.tsx
     Recommendation: Add HMR boundaries

  ✅ No HMR errors in last 30 minutes

  ✅ WebSocket stable (no disconnections)

Optimizations:
  • Add import.meta.hot.accept() to:
    - src/config.ts
    - src/styles/theme.ts

  • Consider extracting shared state from:
    - src/store/index.ts
```

## HMR Patterns

### Pattern Decision Matrix

| Scenario | Pattern | Why |
|----------|---------|-----|
| Leaf component | `accept()` | No dependencies to manage |
| Stateful module | `dispose()` + `data` | Preserve state across reloads |
| Server handler | `server.reload()` | Swap handler without restart |
| Shared utility | `invalidate()` | Force consumers to re-import |
| WebSocket client | `dispose()` + reconnect | Maintain connection |
| Config file | Use `--watch` | Full restart needed |

### Basic Hot Accept

```typescript
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

### Conditional Accept with Cleanup

```typescript
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Cleanup old module
    cleanup();
    // Initialize new module
    newModule.init();
  });

  import.meta.hot.dispose(() => {
    // Called before module is replaced
    saveState();
    cleanup();
  });
}
```

### State Preservation

```typescript
let state = { count: 0 };

// Preserve state across HMR
if (import.meta.hot) {
  // Save state before update
  import.meta.hot.on("bun:beforeUpdate", () => {
    import.meta.hot.data.state = state;
  });

  // Restore state after update
  import.meta.hot.on("bun:afterUpdate", () => {
    if (import.meta.hot.data.state) {
      state = import.meta.hot.data.state;
    }
  });

  import.meta.hot.accept();
}
```

### Server Handler Hot Swap

```typescript
const server = Bun.serve({
  port: 3000,
  fetch: handler,
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    server.reload({ fetch: newModule.handler });
    console.log("Handler hot-swapped!");
  });
}

export function handler(req: Request): Response {
  return new Response("Hello");
}
```

### Error Recovery

```typescript
if (import.meta.hot) {
  import.meta.hot.on("bun:error", (error) => {
    console.error("HMR Error:", error);
    // Show error overlay
    showErrorOverlay(error);
  });

  import.meta.hot.on("bun:afterUpdate", () => {
    // Clear error overlay on successful update
    clearErrorOverlay();
  });
}
```

### Accept Specific Dependencies

```typescript
// Only hot-reload when specific imports change
if (import.meta.hot) {
  import.meta.hot.accept(["./utils.ts", "./config.ts"], ([utils, config]) => {
    // Reinitialize with new modules
    init(utils, config);
  });
}
```

### Invalidate (Force Parent Reload)

```typescript
// Force parent modules to re-import this module
if (import.meta.hot) {
  import.meta.hot.invalidate();
}
```

### WebSocket with Auto-Reconnect

```typescript
let ws: WebSocket;

function connect() {
  ws = new WebSocket("ws://localhost:3001");
  ws.onclose = () => setTimeout(connect, 1000);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ws?.close();
  });

  // Restore connection from previous module
  if (import.meta.hot.data.ws) {
    ws = import.meta.hot.data.ws;
  } else {
    connect();
  }

  import.meta.hot.accept(() => {
    import.meta.hot.data.ws = ws;
  });
}
```

## Troubleshooting

### "HMR not available"

```bash
# Must use --hot flag
bun --hot run app.ts

# Check in code
if (import.meta.hot) {
  console.log("HMR available");
} else {
  console.log("HMR not available - run with --hot");
}
```

### High Error Count

1. Check syntax errors in recent changes
2. Verify all imports resolve correctly
3. Look for circular dependencies
4. Check for runtime errors in accept callbacks

### Frequent Full Reloads

```typescript
// Add to root modules to prevent full reloads
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

Common causes:
- Missing `import.meta.hot.accept()` in entry files
- Circular dependencies
- Changes to modules that don't accept updates

### WebSocket Disconnections

```typescript
if (import.meta.hot) {
  import.meta.hot.on("bun:ws:disconnect", () => {
    console.log("HMR disconnected - waiting for reconnect...");
  });

  import.meta.hot.on("bun:ws:connect", () => {
    console.log("HMR reconnected!");
  });
}
```

## Configuration

### bunfig.toml

```toml
[hmr]
# Enable HMR by default for dev
enabled = true

# WebSocket port for HMR
port = 3001

# Debounce rapid file changes (ms)
debounce = 100

# Show HMR overlay on errors
overlay = true
```

### .hmrrc.json

```json
{
  "ignore": [
    "node_modules",
    "dist",
    "*.test.ts"
  ],
  "accept": [
    "src/components/**",
    "src/pages/**"
  ],
  "alwaysReload": [
    "src/config.ts",
    "src/index.ts"
  ]
}
```

## Bun-Native Integrations

### Using Core Logger

```typescript
import { log } from "@dev-hq/core";

if (import.meta.hot) {
  import.meta.hot.on("bun:afterUpdate", (module) => {
    log.debug("HMR update", { module });
  });

  import.meta.hot.on("bun:error", (error) => {
    log.error("HMR error", { error: error.message });
  });
}
```

### MessageEvent Source

When handling `postMessage` events in HMR contexts, use `MessageEvent.source` to identify the message sender:

```typescript
// Worker or iframe communication with HMR
self.addEventListener("message", (event: MessageEvent) => {
  // Validate message source for security
  if (event.source !== parent) {
    return; // Ignore messages from unexpected sources
  }

  if (event.data.type === "HMR_UPDATE") {
    // Process HMR update
  }
});
```

**Reference:** [Bun MessageEvent.source](https://bun.sh/reference/globals/MessageEvent/source#globals.MessageEvent.source)

### Performance Timing

```typescript
if (import.meta.hot) {
  let startTime: number;

  import.meta.hot.on("bun:beforeUpdate", () => {
    startTime = Bun.nanoseconds();
  });

  import.meta.hot.on("bun:afterUpdate", () => {
    const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000;
    console.log(`HMR update took ${elapsed.toFixed(2)}ms`);
  });
}
```

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `/diagnose` | HMR health feeds into project health |
| `/analyze` | Identifies modules needing HMR boundaries |
| `/projects` | Shows HMR status across projects |

## Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| State lost on save | Missing `dispose()` | Save to `import.meta.hot.data` |
| Duplicate event listeners | Not cleaning up | Remove in `dispose()` callback |
| Memory leak | Intervals not cleared | `clearInterval()` in `dispose()` |
| Stale closures | Captured old module refs | Re-bind in `accept()` callback |
| Full reload loop | Circular dependency | Break cycle or add boundary |

## Performance Tips

```typescript
// Debounce rapid HMR updates
let debounceTimer: Timer;

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      reinitialize();
    }, 50);
  });

  import.meta.hot.dispose(() => {
    clearTimeout(debounceTimer);
  });
}
```

```typescript
// Skip HMR in production builds
if (import.meta.hot && process.env.NODE_ENV !== "production") {
  import.meta.hot.accept();
}
```

## Related Commands

```bash
/diagnose health       # Includes HMR status
/analyze deps          # Find circular deps causing reloads
bun --hot run app.ts   # Start with HMR enabled
```
