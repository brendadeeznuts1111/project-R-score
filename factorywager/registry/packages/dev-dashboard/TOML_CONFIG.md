# 🎛️ TOML Configuration for Dev Dashboard

The dev dashboard now uses **Bun's native TOML support** for all configuration, making it easier to manage settings, benchmarks, and quick wins data.

## 📁 TOML Files

### `config.toml`
Main dashboard configuration:
- Server settings (port, hostname, auto-refresh interval)
- Theme colors and styling
- Feature flags
- Dashboard metadata

### `quick-wins.toml`
Quick wins data:
- All 17 quick wins with metadata
- Status, impact, category, and affected files
- Summary statistics

### `benchmarks.toml`
Benchmark configuration:
- Performance targets for each benchmark
- Iteration counts
- Category assignments
- Performance notes

## 🚀 Usage

Using Bun's native `Bun.TOML.parse` API (recommended):

```typescript
// Read TOML files using Bun.file() and parse with Bun.TOML.parse
const configFile = Bun.file(new URL('../config.toml', import.meta.url));
const quickWinsFile = Bun.file(new URL('../quick-wins.toml', import.meta.url));
const benchmarksFile = Bun.file(new URL('../benchmarks.toml', import.meta.url));

// Parse TOML content using Bun's native parser
const dashboardConfig = Bun.TOML.parse(await configFile.text());
const quickWinsConfig = Bun.TOML.parse(await quickWinsFile.text());
const benchmarksConfig = Bun.TOML.parse(await benchmarksFile.text());

// Access parsed data directly
const port = dashboardConfig.server.port;
const quickWins = quickWinsConfig.quickwins;
```

**Why `Bun.TOML.parse`?**
- ✅ Explicit and clear - you control when parsing happens
- ✅ Works with dynamic file paths
- ✅ Better error handling
- ✅ Native Bun API (no extra dependencies)
- ✅ See [Bun API docs](https://bun.com/docs/runtime/bun-apis) for more details

## ✨ Benefits

1. **Type-safe configuration** - TOML structure is validated at import time
2. **Easy to edit** - No need to modify TypeScript code to change settings
3. **Version control friendly** - TOML files are human-readable and diff well
4. **Native Bun support** - No additional dependencies needed
5. **Separation of concerns** - Config, data, and code are cleanly separated

## 📝 Example: Changing Auto-Refresh Interval

Simply edit `config.toml`:

```toml
[server]
auto_refresh_interval = 10  # Change from 5 to 10 seconds
```

The dashboard will use the new value automatically on restart.

## 🔧 Adding New Benchmarks

Edit `benchmarks.toml`:

```toml
[[benchmarks]]
name = "New Benchmark"
target = 1.0
unit = "ms"
description = "Description here"
category = "performance"
iterations = 100
```

The dashboard will automatically pick up the new benchmark configuration.

## 📊 Current Status

✅ **17 Quick Wins** configured in `quick-wins.toml`
✅ **4 Benchmarks** configured in `benchmarks.toml`
✅ **Server config** in `config.toml` (port 3008, 5s refresh)

Dashboard running at: **http://localhost:3008**
