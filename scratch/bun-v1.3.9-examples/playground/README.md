# Bun v1.3.9 Interactive Playground

An interactive playground showcasing all features and implementations from Bun
v1.3.9.

## 🚀 Quick Start

```bash
cd playground
bun install
bun start
```

Or run individual demos:

```bash
bun run demo:parallel      # Script orchestration
bun run demo:http2         # HTTP/2 upgrades
bun run demo:mocks         # Mock auto-cleanup
bun run demo:proxy         # NO_PROXY handling
bun run demo:profiling     # CPU profiling
bun run demo:bytecode      # ESM bytecode
bun run demo:performance   # Performance optimizations
```

## 📋 Available Demos

### 1. Parallel & Sequential Scripts

**File:** `demos/parallel-scripts.ts`

Demonstrates:

- `bun run --parallel` - Concurrent script execution
- `bun run --sequential` - Sequential script execution
- Pre/post script grouping
- Prefixed output format

### 2. HTTP/2 Connection Upgrades

**File:** `demos/http2-upgrade.ts`

Demonstrates:

- `net.Server → Http2SecureServer` connection upgrade pattern
- Forwarding raw TCP connections to HTTP/2 server
- Used by http2-wrapper, crawlee, and custom proxies

### 3. Mock Auto-Cleanup (Symbol.dispose)

**File:** `demos/mock-dispose.ts`

Demonstrates:

- Automatic mock restoration with `using` keyword
- Works with `spyOn()` and `mock()`
- Cleanup even on exceptions
- No need for manual `mockRestore()`

### 4. NO_PROXY Environment Variable

**File:** `demos/no-proxy.ts`

Demonstrates:

- `NO_PROXY` now respected even with explicit proxy options
- Works with `fetch()` and `WebSocket`
- Local development proxy bypass

### 5. CPU Profiling Interval

**File:** `demos/cpu-profiling.ts`

Demonstrates:

- `--cpu-prof-interval` flag
- Configurable sampling interval (microseconds)
- Higher resolution profiling

### 6. ESM Bytecode Compilation

**File:** `demos/esm-bytecode.ts`

Demonstrates:

- ESM bytecode support in `--compile`
- `--format=esm` with `--bytecode`
- Faster startup and smaller files

### 7. Performance Optimizations

**File:** `demos/performance.ts`

Demonstrates:

- RegExp JIT (3.9x speedup)
- Markdown rendering (3-15% faster)
- String optimizations (startsWith, trim)
- Set/Map size (2.2-2.7x faster)
- AbortSignal optimization (~6% faster)

## 🎮 Interactive Mode

Run the interactive playground:

```bash
bun start
```

This will show a menu where you can:

- Select a demo by number (1-7)
- Run all demos (`all`)
- View the menu again (`menu`)
- Exit (`exit` or `quit`)

## 🚀 Run All Demos

Run all demos in parallel:

```bash
bun run all
```

Or sequentially:

```bash
bun run demo:parallel
bun run demo:http2
bun run demo:mocks
bun run demo:proxy
bun run demo:profiling
bun run demo:bytecode
bun run demo:performance
```

## 📁 Structure

```
playground/
├── playground.ts          # Interactive menu system
├── demos/
│   ├── parallel-scripts.ts
│   ├── http2-upgrade.ts
│   ├── mock-dispose.ts
│   ├── no-proxy.ts
│   ├── cpu-profiling.ts
│   ├── esm-bytecode.ts
│   └── performance.ts
└── README.md
```

## 💡 Features Showcased

### Script Orchestration

- ✅ Parallel execution (`--parallel`)
- ✅ Sequential execution (`--sequential`)
- ✅ Workspace support (`--filter`, `--workspaces`)
- ✅ Error handling (`--no-exit-on-error`)
- ✅ Pre/post script grouping

### Networking

- ✅ HTTP/2 connection upgrades
- ✅ NO_PROXY environment variable

### Testing

- ✅ Mock auto-cleanup with `Symbol.dispose`
- ✅ `using` keyword support

### Build & Compilation

- ✅ ESM bytecode compilation
- ✅ CPU profiling intervals

### Performance

- ✅ RegExp JIT optimization
- ✅ Markdown rendering improvements
- ✅ String method optimizations
- ✅ Collection size optimizations
- ✅ AbortSignal optimization

## 🎯 Usage Examples

### Interactive Menu

```bash
$ bun start

🚀 Bun v1.3.9 Interactive Playground
======================================================================
Bun version: 1.3.9
Platform: darwin arm64
======================================================================

Available Demos:

📁 Script Orchestration
   1. Parallel & Sequential Scripts
      Run multiple scripts concurrently or sequentially with prefixed output

📁 Networking
   2. HTTP/2 Connection Upgrades
      net.Server → Http2SecureServer connection upgrade pattern
   3. NO_PROXY Environment Variable
      NO_PROXY now respected even with explicit proxy options

...

Enter your choice:
```

### Run Specific Demo

```bash
bun run demo:parallel
```

### Run All Demos

```bash
bun run all
```

## 📚 Related Documentation

- [Official Feature Summary](../parallel-scripts/OFFICIAL-FEATURE-SUMMARY.md)
- [Quick Cheat Sheet](../parallel-scripts/QUICK-CHEAT-SHEET.md)
- [Comprehensive Guide](../COMPREHENSIVE-GUIDE.md)
- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9)

## 🐛 Troubleshooting

### Demo fails to run

- Make sure you're using Bun v1.3.9 or later: `bun --version`
- Check that all dependencies are installed: `bun install`

### HTTP/2 demo requires OpenSSL

- The HTTP/2 demo generates self-signed certificates
- If OpenSSL is not available, it will use mock certificates
- For real testing, install OpenSSL

### Performance numbers vary

- Performance benchmarks are affected by system load
- Run multiple times for more accurate results
- Numbers are relative, not absolute

## 🎉 Enjoy!

Explore all the new features in Bun v1.3.9 through this interactive playground!
