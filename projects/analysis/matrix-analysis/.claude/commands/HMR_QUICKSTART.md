# HMR Monitor - Quick Start

Get started with Bun's Hot Module Replacement in 60 seconds.

## Setup

```bash
# Terminal 1: Start dev server with HMR
bun --hot run app.ts

# Terminal 2: Monitor HMR events
bun ~/.claude/scripts/diagnose-hmr.ts monitor
```

## Commands

| Command | Description |
|---------|-------------|
| `diagnose-hmr monitor` | Real-time events (Ctrl+C to stop) |
| `diagnose-hmr stats` | Module statistics |
| `diagnose-hmr report` | Health report with fixes |

## Sample Output

```
╔══════════════════════════════════════════════════════════════╗
║  🔥 HMR Monitor                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Health: A (95/100)                                          ║
║  Hot Updates: 24       Full Reloads: 2                       ║
║  Errors: 0             Frequency: 4.8/min                    ║
╚══════════════════════════════════════════════════════════════╝
```

## Essential Patterns

### Enable HMR in Your Module

```typescript
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

### Hot Swap Bun.serve Handler

```typescript
const server = Bun.serve({
  port: 3000,
  fetch: handler,
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    server.reload({ fetch: newModule.handler });
  });
}

export function handler(req: Request) {
  return new Response("Hello");
}
```

### Preserve State

```typescript
let count = 0;

if (import.meta.hot) {
  // Restore previous state
  if (import.meta.hot.data.count) {
    count = import.meta.hot.data.count;
  }

  // Save state before update
  import.meta.hot.dispose(() => {
    import.meta.hot.data.count = count;
  });

  import.meta.hot.accept();
}
```

## Quick Tips

| Tip | Why |
|-----|-----|
| Keep monitor open while coding | Catch issues immediately |
| Fix errors promptly | Errors reduce health score |
| Add `accept()` to root modules | Prevents full reloads |
| Target < 5 updates/min | High frequency indicates too many saves |

## Common Issues

| Issue | Solution |
|-------|----------|
| "HMR not available" | Use `bun --hot run app.ts` |
| Frequent full reloads | Add `import.meta.hot.accept()` to entry files |
| State lost on update | Use `dispose()` and `data` to preserve |
| WebSocket disconnects | Check if server crashed |

## Health Grades

| Grade | Score | Action |
|-------|-------|--------|
| A | 90-100 | All good |
| B | 80-89 | Minor issues |
| C | 70-79 | Review reloads |
| D | 60-69 | Fix errors |
| F | 0-59 | Major issues |

## Next Steps

1. Start your server with `bun --hot`
2. Open the monitor in another terminal
3. Make changes and watch events
4. Fix any errors or full reloads
5. Read `HMR_MONITOR_GUIDE.md` for advanced patterns

## Related

```bash
/diagnose health   # Overall project health
/analyze deps      # Find circular dependencies
```
