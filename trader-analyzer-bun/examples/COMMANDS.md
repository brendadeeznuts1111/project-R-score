# Examples Commands Reference

**Last Updated**: 2025-01-16  
**Quick Reference**: All example commands in one place

---

## 🚀 Quick Commands

### Interactive Visualizers

```bash
# Bun Link Monorepo (Interactive)
open examples/bun-link-monorepo-interactive.html

# Bun Isolated Installs Visualizer (Interactive)
open examples/bun-isolated-installs-interactive.html
```

### Bun Link Monorepo

```bash
# Setup monorepo (one-time)
bun run examples/bun-link-monorepo-example.ts setup

# Check link status
bun run examples/bun-link-monorepo-example.ts status

# Development mode info
bun run examples/bun-link-monorepo-example.ts dev

# Unlink all packages (safe & reversible)
bun run examples/bun-link-monorepo-example.ts unlink

# Production deployment info
bun run examples/bun-link-monorepo-example.ts production

# Helper scripts
bun run examples/scripts/link-all.ts
bun run examples/scripts/unlink-all.ts
```

### Bun Isolated Installs Visualizer

```bash
# Interactive HTML visualizer (recommended)
open examples/bun-isolated-installs-interactive.html

# ANSI tree (isolated)
bun run examples/bun-isolated-installs-visualizer.ts tree

# ANSI tree (hoisted)
bun run examples/bun-isolated-installs-visualizer.ts hoisted

# Compare both strategies
bun run examples/bun-isolated-installs-visualizer.ts compare

# Generate Mermaid diagram
bun run examples/bun-isolated-installs-visualizer.ts mermaid

# Test properties
bun run examples/bun-isolated-installs-visualizer.ts test

# Show color scheme
bun run examples/bun-isolated-installs-visualizer.ts colors

# Show everything
bun run examples/bun-isolated-installs-visualizer.ts all
```

### Bun Info & Package Management

```bash
# Get package info
bun info react
bun info react@18.2.0
bun info react version
bun info react dependencies
bun info react --json

# Package.json operations
bun pm pkg get name
bun pm pkg get name version
bun pm pkg get scripts.build
bun pm pkg set name="my-package"
bun pm pkg set scripts.test="jest" version=2.0.0
bun pm pkg delete description
bun pm pkg fix
```

### Bun PM Commands

```bash
# Pack
bun pm pack
bun pm pack --destination ./dist
bun pm pack --dry-run
bun pm pack --quiet

# Bin
bun pm bin
bun pm bin -g

# List
bun pm ls
bun pm ls --all

# Whoami
bun pm whoami

# Hash
bun pm hash
bun pm hash-string
bun pm hash-print

# Cache
bun pm cache
bun pm cache rm

# Migrate
bun pm migrate

# Untrusted/Trust
bun pm untrusted
bun pm trust <package>
bun pm trust --all
bun pm default-trusted

# Version
bun pm version
bun pm version patch
bun pm version minor --message "Release: %s"
bun pm version 1.2.3 --no-git-tag-version
```

### Bun Patch

```bash
# Prepare package for patching
bun patch react
bun patch react@17.0.2
bun patch node_modules/react

# Commit patch
bun patch --commit react
bun patch --commit react --patches-dir=mypatches
bun patch-commit react  # pnpm compatibility alias
```

### Telegram Setup

```bash
bun run examples/telegram-golden-setup.ts setup
bun run examples/telegram-golden-setup.ts verify
bun run examples/telegram-golden-setup.ts example-message
```

### WebSocket & Networking

```bash
# WebSocket audit client
bun run examples/audit-websocket-client.ts

# Bun Fetch API examples
bun run examples/bun-fetch-api-examples.ts all
bun run examples/bun-fetch-api-examples.ts headers
bun run examples/bun-fetch-api-examples.ts proxy

# Fetch testing utilities
bun run examples/bun-fetch-testing-utilities.ts test:proxy \
  https://api.example.com http://proxy.local:8080
bun run examples/bun-fetch-testing-utilities.ts test:proxy-auth \
  https://api.example.com http://proxy.local:8080 user pass
bun run examples/bun-fetch-testing-utilities.ts test:headers \
  https://httpbin.org/headers --header="X-Custom: value"
bun run examples/bun-fetch-testing-utilities.ts bench:headers \
  https://httpbin.org/headers --iterations=1000
```

### Bun v1.2.11+ Examples

```bash
# Real-world examples
bun run examples/bun-1.2.11-real-world-examples.ts

# API integration examples
bun run examples/bun-1.2.11-api-integration.ts

# Performance benchmarks
bun run bench/bun-1.2.11-improvements.bench.ts
```

### Demos

```bash
# Bun utilities
bun run examples/demos/demo-bun-utils.ts

# HTML rewriter
bun run examples/demos/demo-html-rewriter.ts
bun run examples/demos/demo-html-rewriter-live-editor.ts
bun run examples/demos/demo-html-rewriter-server.ts

# Process execution
bun run examples/demos/demo-bun-spawn-complete.ts
bun run examples/demos/demo-bun-shell-env-redirect-pipe.ts

# Console features
bun run examples/demos/demo-console-features.ts
bun run examples/demos/demo-console-depth.ts
```

---

## 📚 Command Categories

### Package Management
- `bun link` / `bun unlink` - Local package linking
- `bun pm` - Package manager utilities
- `bun patch` - Persistent package patching
- `bun info` - Package metadata

### Development Tools
- Interactive visualizers (HTML)
- CLI visualizers (ANSI/Mermaid)
- Testing utilities
- Benchmark scripts

### Integration Examples
- Telegram bot setup
- WebSocket clients
- Fetch API extensions
- Security examples

---

## 🔍 Finding Commands

### By Feature
```bash
# Find bun link commands
rg "bun link" examples/

# Find bun pm commands
rg "bun pm" examples/

# Find interactive examples
find examples -name "*interactive.html"
```

### By File Type
```bash
# All TypeScript examples
find examples -name "*.ts" -type f

# All HTML visualizers
find examples -name "*.html" -type f

# All documentation
find examples -name "*.md" -type f
```

---

## ⚡ Performance Benchmarking

### Create Benchmarks

```bash
# Profile any example with CPU profiling
bun --cpu-prof run examples/example-name.ts

# Create benchmark entry
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=profiles/example-name.cpuprofile \
  --name="Example Name Baseline" \
  --description="Baseline performance for example" \
  --tags="example-name,baseline"

# Example: Benchmark monorepo setup
bun --cpu-prof run examples/bun-link-monorepo-example.ts setup
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=setup.cpuprofile \
  --name="Monorepo Setup Baseline" \
  --tags="monorepo,setup"
```

### Compare Benchmarks

```bash
# Compare two benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=baseline-id \
  --current=optimized-id \
  --threshold=5

# Fail CI on regression
bun run scripts/benchmarks/compare.ts \
  --baseline=baseline-id \
  --current=current-id \
  --threshold=2 \
  --fail-on-regression
```

### Benchmark API Endpoint

```bash
# Get benchmark information
curl http://localhost:3001/api/workspace/benchmarks
```

**See**: [Benchmarks README](../benchmarks/README.md) for complete guide.  
**See**: [Bun v1.51 Impact Analysis](../docs/BUN-V1.51-IMPACT-ANALYSIS.md) for optimizations.

---

## 📖 Related Documentation

- [Examples README](./README.md) - Complete examples index
- [Benchmarks README](../benchmarks/README.md) - Benchmark-driven development
- [Bun v1.51 Impact Analysis](../docs/BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations
- [CPU Profiling Guide](../docs/BUN-CPU-PROFILING.md) - Performance analysis
- [Bun Link Documentation](../docs/BUN-LINK.md)
- [Bun PM Documentation](../docs/BUN-PM.md)
- [Bun Patch Documentation](../docs/BUN-PATCH.md)
- [Bun Isolated Installs](../docs/BUN-ISOLATED-INSTALLS.md)

---

**Status**: ✅ Complete  
**Last Updated**: 2025-01-16
