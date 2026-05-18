# Performance Maintenance Suite

The DuoPlus project includes a dedicated suite of tools to ensure the codebase remains optimized for the Bun runtime.

## 🛠️ Performance Auditor (`perf-dashboard.ts`)

Audits the entire codebase for common performance bottlenecks and best-practice violations.

### Key Metrics Tracked

- **Sync Read/Write I/O**: Detects legacy `fs.readFileSync` or `writeFileSync` calls that should be migrated to `Bun.file()`.
- **Console Noise**: Identifies excessive `console.log` statements that can impact hot-path performance.
- **Type Safety**: Tracks the usage of `any` types to encourage strict interface definitions.
- **Operational Scope**: Reports all metrics relative to the active deployment scope (**Enterprise**, **Development**, etc.).

### Usage

```bash
bun run scripts/maintenance/perf-dashboard.ts
```

## 🚀 Codebase Canonicalizer (`fix-sync-io.ts`)

An automated repair tool that migrates the codebase to native Bun primitives.

### Automated Repairs

- **I/O Migration**: Converts Node.js `fs` calls to canonical `await Bun.file().json()`, `text()`, or `Bun.write()`.
- **Timing & Sleep**: Migrates `setTimeout` wrappers to the native `await Bun.sleep()`.
- **Crypto & UUID**: Replaces `crypto.randomUUID()` with the high-performance `Bun.randomUUIDv7()` and implements Zig-based hashing via `Bun.sha256()`.
- **Language Integrity**: Strips TypeScript keywords from `.js` files to prevent runtime syntax errors during development.

### Usage

```bash
bun run scripts/maintenance/fix-sync-io.ts
```

## 📊 Metrics Reporting

Tools for benchmarking and exporting performance data to eternal monitoring systems.

### 1. Prometheus Integration (`push-r2-metrics.sh`)

Runs storage benchmarks and pushes the `r2_speed` metric to a Prometheus Gateway.

```bash
./scripts/maintenance/push-r2-metrics.sh
```

### 2. Direct R2 Upload (`upload-r2-json-metrics.sh`)

Captures benchmark results and uploads a timestamped JSON report directly to an R2 bucket for historical analysis.

```bash
./scripts/maintenance/upload-r2-json-metrics.sh
```
