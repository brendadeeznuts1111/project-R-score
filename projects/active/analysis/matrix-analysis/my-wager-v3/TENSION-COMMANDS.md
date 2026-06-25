# Tension Field Quick Commands Reference

## 🔥 Essential Commands

### Validation & Headers

```bash
bun run tension:validate      # Validate all headers
bun run tension:errors        # Show only validation errors
bun run tension:count         # Count TENSION headers
bun run tension:headers       # Show header overview
bun run tension:required      # Find all REQUIRED rules
```

### Development

```bash
bun run tension:watch         # Start live reload watcher
bun run tension:dev           # Start dev server + open dashboard
bun run tension:snapshot <game>  # Save tension snapshot
```

### Analysis

```bash
bun run tension:anomalies     # Find anomaly thresholds
bun run tension:inertia       # Count inertia references
bun run tension:legacy        # Find legacy code
bun run tension:config        # Show propagation config
```

### Performance

```bash
bun run tension:bench <n>     # Run N propagations (default: 100)
bun run tension:memory        # Memory usage after propagation
```

### System Status

```bash
bun run tension:health        # Quick project health check
bun run tension:status        # All-in-one status check
```

## 📊 One-Liner Equivalents

### Quick Project Status

```bash
# Validate headers
bun scripts/validate-headers.ts

# Show only errors
bun scripts/validate-headers.ts 2>&1 | grep -i "❌"

# Count headers
rg -c '\[TENSION-[A-Z]+-' --type=ts
```

### Development Tools

```bash
# Start watcher
bun scripts/watch-tension.ts

# Dev server + open browser
bun dev & sleep 1 && open http://localhost:3000

# Debug mode
TENSION_DEBUG=true bun --hot src/index.ts
```

### Compute & Testing

```bash
# Compute tension for game
bun src/tension-field/core.ts nfl-week1-2026

# Save snapshot
bun src/tension-field/core.ts nfl-week1-2026 > tension-snapshot-$(date +%s).json

# Demo propagation
bun -e 'await import("./src/graph-propagation/propagate.ts").then(m => m.demoPropagation())'
```

### Grep & Search

```bash
# Find anomaly thresholds
rg -C 3 '0\.9|boostThreshold|convergenceThreshold'

# Count inertia references
rg -c inertia src/**/*.ts

# Find legacy code
rg -i 'legacy|bridge|compat' src/**/*.ts
```

### Performance Analysis

```bash
# Benchmark 1000 propagations
bun -e 'console.time("prop"); Promise.all(Array(1000).fill(0).map(()=>import("./src/graph-propagation/propagation.ts").then(m=>m.runFullGraphPropagation("demo")))).then(()=>console.timeEnd("prop"))'

# Memory snapshot
bun -e 'await import("./src/graph-propagation/propagate.ts").then(async m=>{await m.runFullGraphPropagation("demo"); console.log(process.memoryUsage())})'
```

### Environment Configuration

```bash
# Show config with env overrides
bun -e 'console.log(await import("./src/graph-propagation/propagate.ts").then(m => m.globalTensionGraph.config))'

# Custom decay rate
TENSION_DECAY_RATE=0.92 bun src/tension-field/core.ts demo-game
```

## 🚀 Pro Tips

1. **Chain commands**: `bun run tension:validate && bun run tension:count`
2. **Output to file**: `bun run tension:status > tension-status.log`
3. **Watch mode**: `watch "bun run tension:status" .`
4. **Quick aliases**: Add to ~/.zshrc:
   ```bash
   alias tv="bun run tension:validate"
   alias ts="bun run tension:status"
   alias tc="bun run tension:count"
   ```

## 📋 All Available Scripts

Run `bun run tension` to see the full command list, or check package.json for all available tension scripts.

---

**Remember**: The tension field is always watching! 😈
