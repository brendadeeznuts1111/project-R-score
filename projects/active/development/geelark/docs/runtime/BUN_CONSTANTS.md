# Bun Runtime Constants & Defaults Reference

Complete reference of built-in constants, default values, and behaviors for Bun runtime.

## Table of Contents

- [Performance & Timing](#performance--timing)
- [Module Resolution](#module-resolution)
- [Memory & Garbage Collection](#memory--garbage-collection)
- [Transpilation & JSX](#transpilation--jsx)
- [Networking & Security](#networking--security)
- [Process & Environment](#process--environment)
- [CLI & Script Constants](#cli--script-constants)
- [Watch & Reload](#watch--reload)
- [Debugging](#debugging)
- [Package Management](#package-management)
- [TypeScript & Language](#typescript--language)

---

## Performance & Timing

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| `performance.timeOrigin` | Unix timestamp | Base timestamp for `performance.now()` |
| Default `--console-depth` | 2 | Object inspection depth for `console.log()` |
| `Bun.nanoseconds()` | ~nanoseconds | High-precision timing (vs `performance.now()` ms) |
| Default CPU prof output | `.cpuprofile` | Generated CPU profile file extension |
| Default mimalloc stats | Disabled | Need `MIMALLOC_SHOW_STATS=1` to enable |

```typescript
// High-precision timing
const start = Bun.nanoseconds();
// ... do work ...
const durationNs = Bun.nanoseconds() - start;

// Performance API (millisecond precision)
const startMs = performance.now();
```

---

## Module Resolution

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| Default extension order | `.tsx,.ts,.jsx,.js,.json` | Order Bun looks for files when importing |
| Default `--install` mode | `auto` | Auto-installs when `node_modules` missing |
| `--install=fallback` | Missing packages only | Auto-installs only missing dependencies |
| Default conditions | Environment-dependent | Package export resolution conditions |
| Default main fields | Target-dependent | `package.json` fields checked (browser, module, main) |
| `--target` options | `bun`, `node`, `browser` | Runtime target for module resolution |

```typescript
// Module resolution follows this order:
// 1. Check for explicit extension
// 2. Try .tsx, .ts, .jsx, .js, .json in order
// 3. Check package.json main/exports fields
// 4. Auto-install if enabled and package not found

import { Component } from './component'; // Resolves to ./component.tsx if exists
```

---

## Memory & Garbage Collection

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| JavaScript heap | Managed by JSC | Uses JavaScriptCore's heap |
| Native heap | Managed by mimalloc | Non-JavaScript memory allocation |
| `Bun.gc(true)` | Synchronous GC | Blocks until GC completes |
| `Bun.gc(false)` | Asynchronous GC | Schedules GC for later |
| Heap snapshot format | JSON | Compatible with Safari/WebKit DevTools |

```typescript
// Garbage Collection control
Bun.gc(true);  // Synchronous - blocks until complete
Bun.gc(false); // Asynchronous - schedules for later

// Memory usage
const usage = process.memoryUsage();
// { rss: 134217728, heapTotal: 89128960, heapUsed: 63438848, external: 12345 }
```

---

## Transpilation & JSX

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| JSX runtime (auto) | `automatic` | Modern JSX transform (React 17+) |
| JSX runtime (classic) | `classic` | Classic `React.createElement` |
| Default JSX factory | `React.createElement` | When using classic runtime |
| Default JSX fragment | `React.Fragment` | Fragment component for classic |
| Default JSX import source | `react` | Package for JSX runtime functions |
| Supported loaders | `js,jsx,ts,tsx,json,toml,text,file,wasm,napi` | File type handlers |

```typescript
// tsconfig.json for JSX
{
  "compilerOptions": {
    "jsx": "react-jsx",           // automatic runtime
    "jsxImportSource": "react",   // import source
    "jsxFactory": "React.createElement", // classic factory
    "jsxFragmentFactory": "React.Fragment"
  }
}
```

---

## Networking & Security

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| Default `Bun.serve()` port | Environment-specific | No fixed default |
| Max HTTP headers size | 16KiB | 16384 bytes |
| Default DNS order | `verbatim` | Respects system DNS order |
| DNS alternatives | `ipv4first`, `ipv6first` | Force IPv4 or IPv6 preference |
| CA store options | `system`, `openssl`, `bun` | Certificate authority sources |

```typescript
// HTTP Server with defaults
Bun.serve({
  port: 3000,                    // User-specified
  fetch: (req) => new Response("OK")
});

// DNS configuration via bunfig.toml
// [dns]
// order = "ipv4first"  // Force IPv4 first
```

---

## Process & Environment

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| Default config file | `bunfig.toml` | In current directory |
| Default shell (Linux/macOS) | `bash` → `sh` → `zsh` | Checks in order |
| Default shell (Windows) | `bun shell` | Bash-like shell for Windows |
| Script failure behavior | Stops execution | If `pre<script>` fails, script doesn't run |
| `bun run -` behavior | TypeScript with JSX | Treats stdin as TSX |

```bash
# Shell priority on Unix
# 1. bash -> 2. sh -> 3. zsh

# Read from stdin
echo "console.log('hello')" | bun run -
```

---

## CLI & Script Constants

### Command Resolution Order

| Priority | Type | Example |
|----------|------|---------|
| 1 | `package.json` scripts | `bun run build` |
| 2 | Source files | `bun run src/main.js` |
| 3 | Project binaries | `bun run eslint` |
| 4 | System commands | `bun run ls` (only with `bun run`) |

### Flag Behavior

| Flag Pattern | Result | Example |
|--------------|--------|---------|
| `bun --watch run dev` | ✓ Correct | Watch mode enabled |
| `bun run dev --watch` | ✗ Incorrect | Flag passed to script |
| `bun <script>` | Runs script | Short form, built-ins take precedence |
| `bun run <script>` | Explicit | Always runs package script |

### Lifecycle Hooks Order

| Hook | Executes When |
|------|--------------|
| `pre<script>` | Before main script |
| `<script>` | Main script execution |
| `post<script>` | After main script |

```json
// package.json
{
  "scripts": {
    "prebuild": "echo 'Before build'",
    "build": "bun build src/index.ts",
    "postbuild": "echo 'After build'"
  }
}
```

---

## Watch & Reload

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| `--watch` | File change detection | Restarts process on file changes |
| `--hot` | Module replacement | Enables hot module reloading |
| Default screen clear | Enabled | Clears terminal on reload |
| `--no-clear` | Disables clear | Keeps terminal output on reload |

```bash
# Watch mode - restarts on changes
bun --watch src/index.ts

# Hot reload - preserves state
bun --hot src/index.ts

# Disable screen clear
bun --watch --no-clear src/index.ts
```

---

## Debugging

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| `--inspect` | Debugger enabled | Activates debugger |
| `--inspect-wait` | Wait for connection | Debugger waits before executing |
| `--inspect-brk` | Break immediately | Breaks on first line |
| Heap snapshot viewer | Safari/WebKit GTK | Required for heap analysis |

```bash
# Debug with inspector
bun --inspect src/index.ts

# Wait for debugger connection
bun --inspect-wait src/index.ts

# Break on first line
bun --inspect-brk src/index.ts
```

---

## Package Management

### Installation Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `auto` | Install if no node_modules | Fresh installs |
| `fallback` | Install missing packages | Partial installs |
| `force` | Always install | Clean slate |
| `--no-install` | Disable auto-install | Production environments |

### Workspace Filtering

| Constant/Source | Value/Default | Description |
|----------------|---------------|-------------|
| Default output lines | 10 | With `--filter`, shows last 10 lines |
| `--all` | All workspaces | Runs in all workspace packages |
| Pattern matching | Glob-like | `ba*` matches `bar`, `baz` |

```bash
# Installation modes
bun install           # auto mode
bun install --force   # force reinstall
bun run --no-install script.ts  # disable auto-install

# Workspace filtering
bun run --filter="express*" test  # Run in matching workspaces
```

---

## TypeScript & Language

### Transpilation Defaults

| Setting | Value | Notes |
|---------|-------|-------|
| Default tsconfig | `$cwd/tsconfig.json` | Current directory |
| JSX side effects | Considered pure | Can disable with flag |
| Tree-shaking | Enabled | Respects `@__PURE__` annotations |
| Macro execution | Enabled | Can disable with flag |

### Define & Loader Syntax

| Syntax | Example | Purpose |
|--------|---------|---------|
| `--define` | `process.env.NODE_ENV:"development"` | Build-time replacements |
| `--loader` | `.js:jsx` | Custom file type handling |
| `--drop` | `console` | Remove function calls |

```bash
# Build-time constants
bun build --define NODE_ENV:"production" src/index.ts

# Custom loader
bun build --loader .js:jsx src/index.ts

# Drop console.logs
bun build --drop console src/index.ts
```

---

## Quick Reference

### By Category

| Category | Key Constants | Default Values |
|----------|---------------|----------------|
| **Performance** | `console-depth`, CPU prof output | 2, `.cpuprofile` |
| **Modules** | Extension order, install mode | `.tsx,.ts,.jsx,.js,.json`, `auto` |
| **Memory** | Heap managers, GC modes | JSC + mimalloc, sync/async |
| **JSX** | Runtime, factory, fragment | `automatic`, `React.createElement`, `React.Fragment` |
| **Networking** | Headers size, DNS order | 16KiB, `verbatim` |
| **CLI** | Resolution order, shell order | Scripts → files → binaries → system |
| **Debugging** | Inspector, heap viewer | Safari/WebKit required for heap |
| **Security** | Deprecation modes, buffer safety | `warn`, optional zero-fill |
| **Package Mgmt** | Installation modes, filter lines | `auto/fallback/force`, 10 lines |
| **TypeScript** | Config path, JSX purity | `./tsconfig.json`, pure by default |

### Project Constants

For Dev HQ specific constants, see:
- [`src/constants/features/compile-time.ts`](../src/constants/features/compile-time.ts) - Feature flag constants
- [`meta.json`](../meta.json) - System metadata and build configurations
- [`bunfig.toml`](../bunfig.toml) - Bun runtime configuration

---

## See Also

- [Bun Runtime Documentation](https://bun.sh/docs/runtime)
- [Bun CLI Documentation](https://bun.sh/docs/cli)
- [Bundler Documentation](https://bun.sh/docs/bundler)
- [Feature Flags Guide](../guides/FEATURE_FLAGS_PRO_TIPS.md)
