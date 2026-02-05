# 🚀 Bun Globals & Utils MASTER REFERENCE

**Ultimate compilation** of **ALL 34+ Bun APIs** for Omega v1.6.3! Complete with interactive demos, enterprise examples, and multi-format exports.

## 📋 Quick Start

```bash
# Generate reference table in Markdown
bun run globals:table

# Generate CSV for Excel
bun run globals:csv

# Generate JSON for programmatic use
bun run globals:json

# Run interactive demo
bun run globals:interactive

# Run full Omega Master demo
bun run omega:demo
```

## 📊 Generated Files

- `bun-globals-reference.md` - Complete Markdown reference table
- `bun-globals-reference.csv` - CSV format for Excel/Google Sheets
- `bun-globals-reference.json` - JSON for programmatic access

## 🎯 API Categories

| Category | APIs | Use Cases |
|----------|------|-----------|
| **Info** | `Bun.version`, `Bun.revision` | Version checks, logging |
| **Runtime** | `Bun.env`, `Bun.main`, `Bun.sleep` | Environment access, timing |
| **Resolution** | `Bun.which`, `Bun.resolveSync` | Tool discovery, module resolution |
| **Crypto** | `Bun.randomUUIDv7` | Session IDs, sortable keys |
| **Performance** | `Bun.peek`, `Bun.nanoseconds` | Async inspection, benchmarking |
| **Debug** | `Bun.inspect`, `Bun.openInEditor` | Pretty printing, debugging |
| **Comparison** | `Bun.deepEquals` | Test assertions, validation |
| **String** | `Bun.escapeHTML` | Sanitization, security |
| **Terminal** | `Bun.stringWidth`, `Bun.stripANSI`, `Bun.wrapAnsi` | CLI formatting |
| **URL** | `Bun.fileURLToPath`, `Bun.pathToFileURL` | Path conversion |
| **Compression** | `Bun.gzipSync`, `Bun.zstdCompress` | Data compression |
| **Streams** | `Bun.readableStreamTo*` | Stream consumption |
| **JSC** | `bun:jsc.serialize`, `estimateShallowMemoryUsageOf` | Memory analysis, IPC |

## 💡 Omega Master Examples

### which() Mega-Table

```typescript
const whichData = [
  { tool: 'sqlite3', path: Bun.which('sqlite3'), available: !!Bun.which('sqlite3') },
  { tool: 'bun', path: Bun.which('bun'), available: !!Bun.which('bun') },
  // ... more tools
];
console.log(Bun.inspect.table(whichData, ['tool', 'path', 'available'], { colors: true }));
```

### Pool Compression with Zstd

```typescript
import { zstdCompressSync } from 'bun';
import { serialize } from 'bun:jsc';

const pools = [/* pool data */];
const snapshot = zstdCompressSync(serialize(pools));
console.log(`Compressed pools: ${snapshot.byteLength} bytes`);
```

### Performance Trio

```typescript
const start = Bun.nanoseconds();
const promise = someAsyncOperation();
console.log(Bun.peek(promise)); // Check without awaiting
await promise;
console.log(`Duration: ${Bun.nanoseconds() - start} ns`);
```

## 🏢 Enterprise Dashboard Features

The `EnterpriseDashboard` class demonstrates real-world usage:

- **Compatibility Reports**: Check required tools with `Bun.which()`
- **Pool Persistence**: Compress state with Zstd + JSC serialization
- **Health Checks**: Monitor performance with `Bun.nanoseconds()`
- **Memory Analysis**: Track usage with `estimateShallowMemoryUsageOf()`

## 📈 Performance Notes

- **Zstd**: Best compression for pool snapshots (better than gzip)
- **SIMD**: String operations (escapeHTML, stripANSI) use SIMD acceleration
- **Zero-copy**: Stream processing and JSC serialization avoid copies
- **Caching**: `Bun.which()` and `Bun.resolveSync()` are cached

## 🔧 CLI Commands

```bash
# Reference generation
bun run globals:table    # Markdown table
bun run globals:csv      # CSV for Excel
bun run globals:json     # JSON data
bun run globals:interactive  # Live demo

# Omega demos
bun run omega:demo       # Full API demonstration
bun run omega:dashboard  # Enterprise dashboard example
```

## 📚 Documentation Links

All APIs link to official Bun docs:
- [Globals](https://bun.sh/docs/api/globals)
- [Utils](https://bun.sh/docs/api/utils)

## 🎨 Pro Tips

1. **Table Magic**: `Bun.inspect.table()` auto-formats CLI output
2. **Compression Kings**: Zstd > gzip for pool snapshots
3. **Secure Resolution**: `Bun.resolveSync()` + `Bun.which()` for tool discovery
4. **Memory Profiling**: `estimateShallowMemoryUsageOf()` for leak detection
5. **Async Inspection**: `Bun.peek()` to check promises without awaiting

## 🚀 Generated Output Examples

### which() Table Output

```
┌───┬─────────┬──────────────────────────────────────┬───────────┐
│   │ tool    │ path                                 │ available │
├───┼─────────┼──────────────────────────────────────┼───────────┤
│ 0 │ sqlite3 │ /usr/bin/sqlite3                     │ true      │
│ 1 │ bun     │ /private/tmp/bun-node-ba426210c/bun  │ true      │
│ 2 │ node    │ /private/tmp/bun-node-ba426210c/node │ true      │
└───┴─────────┴──────────────────────────────────────┴───────────┘
```

### Compression Stats

```
Original pools: 329 bytes
GZIP compressed: 246 bytes (25.2% reduction)
DEFLATE compressed: 228 bytes (30.7% reduction)
ZSTD compressed: 250 bytes (24.0% reduction)
```

## 📝 License

MIT License - feel free to use in your projects!

---

Generated with Bun Globals Master Generator v1.6.3 🚀💪
