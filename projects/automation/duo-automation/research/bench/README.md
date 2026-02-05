# DUO-Automation Benchmark Suite

A comprehensive collection of performance benchmarks, demos, and monitoring tools designed specifically for the Bun runtime and Cloudflare R2/S3 integration.

## 🚀 Getting Started

The benchmark suite is now organized into a logical hierarchy with a central entrypoint.

### Central CLI Entrypoint

Use the new `bench/main.ts` to navigate and run any tool in the suite:

```bash
# Run system setup check
bun bench/main.ts --setup

# Run the ultimate benchmark suite (Core + Storage + Tools)
bun bench/main.ts --all

# Launch the real-time monitoring dashboard
bun bench/main.ts --monitor

# List available benchmarks in a category
bun bench/main.ts storage
```

## 📁 Directory Structure

| Directory | Description |
| :--- | :--- |
| [`core/`](./core) | Core Bun/JS feature benchmarks (SIMD, Deep Equals, String Width) |
| [`storage/`](./storage) | R2/S3 specific benchmarks, connectivity tests, and integration demos |
| [`urlpattern/`](./urlpattern) | High-performance URLPattern API benchmarks and extraction tests |
| [`tools/`](./tools) | Advanced analysis tools (Load Balancers, Multi-region, Regression Detection) |
| [`results/`](./results) | Historical benchmark outputs (JSON, CSV, HTML reports) |
| [`scripts/`](./scripts) | Infrastructure and setup utility scripts |

## 🛠️ Key Commands

### Storage & R2

```bash
# Supercharged R2 Benchmark (with Node SDK comparison)
bun bench/main.ts storage bench-r2-super.ts

# Blob API & Request Control Test
bun bench/main.ts storage test-blob-r2.ts

# Inline vs Attachment Performance
bun bench/main.ts storage bench-inline.ts
```

### URLPattern Empire

```bash
# Ultimate URLPattern Pattern Benchmark
bun bench/main.ts urlpattern bench-urlpattern-super.ts

# Full API Showcase
bun bench/main.ts urlpattern urlpattern-complete.ts
```

### Core Performance

```bash
# SIMD-accelerated Filter Bench
bun bench/main.ts core bench-simd-filter.ts

# Bun.stringWidth Unicode Alignment Bench
bun bench/main.ts core bench-string-width.ts
```

## 📊 Performance Matrix

All benchmarks contribute to the `docs/reference/MASTER_MATRIX.md`, tracking:

- **Throughput**: IDs per second / MB per second
- **Latency**: TTFB and full round-trip timing
- **Savings**: Zstd and algorithm efficiency
- **Stability**: Success rates under concurrent load

## 🔧 Environment Setup

Ensure your `.env` contains the following for live R2 benchmarks:

```env
R2_BUCKET=factory-wager-packages
S3_ACCESS_KEY_ID=69765dd738766bca38be63e7d0192cf8
S3_SECRET_ACCESS_KEY=1d9326ffb0c59ebecb612f401a87f71942574984375fb283fc4359630d7d929a
S3_ENDPOINT=https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
```

---
*Powered by Bun 1.x Native APIs* 🚀
