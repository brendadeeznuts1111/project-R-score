# Examples

This directory contains example scripts demonstrating various features of the Bun TOML Secrets Editor and related Bun-native capabilities.

## Quick Start with Dev Dashboard

The dev dashboard provides a comprehensive interface for development tasks:

```bash
# Interactive mode (menu-driven)
dev-dashboard interactive

# Quick commands
dev-dashboard version           # Show version & system info
dev-dashboard status            # Detailed system status
dev-dashboard health            # Run health checks
dev-dashboard git               # Git status & recent commits

# List and explore
dev-dashboard list              # List all categories
dev-dashboard list detailed     # List with example details
dev-dashboard show cli          # Show CLI category details

# Run examples
dev-dashboard run cli                    # List CLI examples
dev-dashboard run cli cli-demo.ts        # Run specific example
dev-dashboard run-all                    # Run all examples

# Testing
dev-dashboard test                       # Run all tests
dev-dashboard test cli                   # Run CLI-specific tests
dev-dashboard test --watch               # Watch mode
dev-dashboard bench                      # Run all benchmarks
dev-dashboard bench benchmarks           # Run benchmark suite

# Building
dev-dashboard build                      # List build targets
dev-dashboard build production           # Build for production
dev-dashboard build dev                  # Development build
```

### NPM Scripts

```bash
# Dashboard
bun run dash                  # Interactive mode
bun run dash:version          # Show version
bun run dash:status           # System status
bun run dash:list             # List categories
bun run dash:list:detailed    # Detailed list

# Testing
bun run dash:test             # Run all tests
bun run dash:test:watch       # Watch mode
bun run dash:test:cli         # CLI tests only
bun run dash:test:secrets     # Secrets tests only

# Benchmarking
bun run dash:bench            # Run benchmarks
bun run dash:bench:cli        # CLI benchmarks
bun run dash:bench:secrets    # Secrets benchmarks

# Building
bun run dash:build            # List targets
bun run dash:build:dev        # Development build
bun run dash:build:prod       # Production build

# Utilities
bun run dash:git              # Git status
bun run dash:health           # Health check
```

## Directory Structure

```
examples/
├── benchmarks/          # Performance benchmarking scripts
├── cli/                 # CLI feature demonstrations
├── demos/               # Interactive feature demos
├── ffi/                 # Foreign Function Interface (bun:ffi) examples
├── native-addons/       # Native addon and V8 API examples
├── profiling/           # CPU and heap profiling examples
└── secrets/             # TOML and secrets management examples
```

## Quick Reference

### Benchmarks

| Script | Description | Run Command |
|--------|-------------|-------------|
| `50-col-matrix.ts` | Wide matrix table benchmark | `bun run examples/benchmarks/50-col-matrix.ts` |
| `bench.ts` | General performance benchmarks | `bun run examples/benchmarks/bench.ts` |
| `dns-prefetch-bench.ts` | DNS prefetching benchmark | `bun run examples/benchmarks/dns-prefetch-bench.ts` |
| `http-server-bench.ts` | HTTP server performance | `bun run examples/benchmarks/http-server-bench.ts` |
| `spawn-performance-demo.ts` | Process spawn performance | `bun run examples/benchmarks/spawn-performance-demo.ts` |

### CLI Features

| Script | Description | Run Command |
|--------|-------------|-------------|
| `bun-builtin-table-comparison.ts` | Bun's table API comparison | `bun run examples/cli/bun-builtin-table-comparison.ts` |
| `bunx-argument-parsing-test.ts` | Argument parsing examples | `bun run examples/cli/bunx-argument-parsing-test.ts` |
| `cli-demo.ts` | General CLI demo | `bun run examples/cli/cli-demo.ts` |
| `currency-formatting-example.ts` | Currency formatting | `bun run examples/cli/currency-formatting-example.ts` |
| `matrix-suggestions-demo.ts` | Matrix suggestions | `bun run examples/cli/matrix-suggestions-demo.ts` |
| `profile-name-parser-demo.ts` | Profile name parsing | `bun run examples/cli/profile-name-parser-demo.ts` |
| `progress-bar-example.ts` | Progress bar demo | `bun run examples/cli/progress-bar-example.ts` |
| `string-width-*.ts` | Unicode string width tests | `bun run examples/cli/string-width-*.ts` |
| `table-formatting-example.ts` | Table formatting | `bun run examples/cli/table-formatting-example.ts` |
| `url-domain-validation-test.ts` | URL validation | `bun run examples/cli/url-domain-validation-test.ts` |

### Demos

| Script | Description | Run Command |
|--------|-------------|-------------|
| `demo-console-reading.ts` | Console input reading | `bun run examples/demos/demo-console-reading.ts` |
| `demo-cross-platform-env.ts` | Cross-platform environment | `bun run examples/demos/demo-cross-platform-env.ts` |
| `demo-env-vars.ts` | Environment variable handling | `bun run examples/demos/demo-env-vars.ts` |
| `demo-final-cli.ts` | Complete CLI demo | `bun run examples/demos/demo-final-cli.ts` |
| `demo-nanosecond-precision.ts` | High precision timing | `bun run examples/demos/demo-nanosecond-precision.ts` |
| `demo-process-management.ts` | Process management | `bun run examples/demos/demo-process-management.ts` |
| `demo-shell-lines.ts` | Bun Shell API demo | `bun run examples/demos/demo-shell-lines.ts` |
| `demo-bun-shell-advanced.ts` | Advanced Bun Shell features | `bun run examples/demos/demo-bun-shell-advanced.ts` |
| `demo-sigint-simple.ts` | Signal handling | `bun run examples/demos/demo-sigint-simple.ts` |
| `demo-signals.ts` | Advanced signals | `bun run examples/demos/demo-signals.ts` |

### FFI (Foreign Function Interface)

Examples demonstrating Bun's `bun:ffi` module for calling C code.

| Script | Description | Run Command |
|--------|-------------|-------------|
| `bun-ffi-env-vars.ts` | Basic FFI with env vars | `bun run examples/ffi/bun-ffi-env-vars.ts` |
| `bun-ffi-advanced.ts` | Advanced FFI usage | `bun run examples/ffi/bun-ffi-advanced.ts` |
| `hello.c` | Simple C example | Used by FFI examples |
| `complex.c` | Advanced C example | Used by FFI examples |
| `test-bun-ffi-env.sh` | Test script for FFI | `bash examples/ffi/test-bun-ffi-env.sh` |

**Environment Variables for FFI:**

```bash
# Set custom include/library paths
export C_INCLUDE_PATH="/path/to/headers"
export LIBRARY_PATH="/path/to/libraries"

# Multiple paths (colon-separated)
export C_INCLUDE_PATH="/path1/include:/path2/include"
```

### Native Addons

| Script | Description | Run Command |
|--------|-------------|-------------|
| `native-addon-v8-example.ts` | V8 type checking APIs | `bun run examples/native-addons/native-addon-v8-example.ts` |

### Profiling

Examples demonstrating Bun v1.3.7+ profiling features.

| Script | Description | Run Command |
|--------|-------------|-------------|
| `bun-v1.3.7-profiling-examples.ts` | Complete profiling demo | `bun run examples/profiling/bun-v1.3.7-profiling-examples.ts` |

Features demonstrated:
- CPU profiling with markdown output (`--cpu-prof-md`)
- Heap profiling with markdown output (`--heap-prof-md`)
- JSON5 configuration support
- JSONL streaming parsing

### Secrets & TOML

| Script | Description | Run Command |
|--------|-------------|-------------|
| `bun-native-toml-example.ts` | Basic TOML usage | `bun run examples/secrets/bun-native-toml-example.ts` |
| `bun-toml-advanced.ts` | Advanced TOML features | `bun run examples/secrets/bun-toml-advanced.ts` |
| `bun-toml-loader-example.ts` | TOML loader demo | `bun run examples/secrets/bun-toml-loader-example.ts` |
| `define-optimization-demo.ts` | Define optimization | `bun run examples/secrets/define-optimization-demo.ts` |
| `enterprise-integration-demo.ts` | Enterprise features | `bun run examples/secrets/enterprise-integration-demo.ts` |
| `secrets-hybrid-demo.ts` | Hybrid config demo | `bun run examples/secrets/secrets-hybrid-demo.ts` |
| `toml-function-usage.ts` | TOML function usage | `bun run examples/secrets/toml-function-usage.ts` |

## Environment Variables

Some examples require environment variables:

```bash
# Required for DuoPlus CLI examples
export DUOPLUS_API_TOKEN="your-token"

# Optional
export DUOPLUS_ENV="development"
export DEBUG="true"
export LOG_LEVEL="DEBUG|INFO|WARN|ERROR"
```

## Notes

- All examples are written in TypeScript and run with Bun
- Examples may create temporary files in `./temp/`, `./logs/`, or `./profiles/` directories
- Some examples demonstrate Bun v1.3.7+ features and require an up-to-date Bun version
