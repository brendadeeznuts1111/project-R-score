# 🚀 CLI, Performance & Kimi Shell Integration Guide

## Overview

This guide covers direct CLI usage, performance monitoring, benchmarking, and Kimi Code CLI integrations for the Barbershop project.

---

## 📦 Direct CLI Commands

### Core Application Commands

```bash
# Start the dashboard
bun run src/core/barbershop-dashboard.ts

# Start the server
bun run src/core/barber-server.ts

# Start tickets demo
bun run src/core/barbershop-tickets.ts

# Development mode with hot reload
bun --hot src/core/barber-server.ts
```

### Environment Configuration

```bash
# Full server startup with custom config
SERVER_NAME="Barbershop Prod" \
HOST=0.0.0.0 \
PORT=3000 \
PUBLIC_BASE_URL=https://barbershop.example.com \
bun run src/core/barber-server.ts

# With R2 integration
R2_ACCOUNT_ID=xxx \
R2_BUCKET_NAME=barbershop \
R2_ACCESS_KEY_ID=xxx \
R2_SECRET_ACCESS_KEY=xxx \
bun run src/core/barber-server.ts
```

---

## ⚡ Performance & Benchmarking

### CPU Profiling

```bash
# Quick CPU profile (10 seconds)
bun --cpu-prof --cpu-prof-name=quick-profile \
  run src/core/barber-server.ts &
sleep 10 && kill $!

# Markdown output for LLM analysis
bun --cpu-prof --cpu-prof-md \
  run src/core/barber-server.ts

# Profile specific workload
bun run src/profile/sampling-profile.ts --duration 30000
```

### Memory Profiling

```bash
# Heap snapshot on exit
bun --heap-prof --heap-prof-name=memory-profile \
  run src/core/barber-server.ts

# Markdown heap analysis
bun --heap-prof --heap-prof-md \
  run src/core/barber-server.ts
```

### Load Testing

```bash
# WebSocket benchmark
bun run scripts/analysis/ws-secrets-bench.ts \
  --connections 100 \
  --duration 300 \
  --compression

# Vault simulation
bun run scripts/secrets/vault-sim.ts \
  --access 1M \
  --duration 600 \
  --pattern burst

# Custom benchmark
bun run src/debug/benchmark.ts
```

### Profile Management

```bash
# List available profiles
bun run src/r2/list-r2-profiles.ts

# Upload latest profile to R2
bun run src/r2/upload-latest-profile.ts

# Quick sampling profile
bun run src/profile/sampling-profile.ts --quick

# Full workload profile
bun run src/profile/profile-workload.ts
```

---

## 🔐 Secrets Management CLI

### Secret Field Operations

```bash
# Compute secrets field
bun run scripts/secrets/secrets-field.ts \
  --exposure 7.5 \
  --keys factory

# Benchmark field computation
bun run scripts/secrets/secrets-field.ts \
  --benchmark \
  --iterations 1000

# Server mode
bun run scripts/secrets/secrets-field-server.ts \
  --port 3001
```

### Vault Operations

```bash
# Simulate vault exposure
bun run scripts/secrets/vault-sim.ts \
  --access 10M \
  --duration 300 \
  --pattern wave

# Redis vault demo
bun run scripts/secrets/redis-vault-demo.ts

# ML boost testing
bun run scripts/secrets/secret-boost.ts \
  --benchmark \
  --iterations 500
```

### Security Auditing

```bash
# Run security audit
bun run scripts/security/security-audit.ts

# Security citadel check
bun run scripts/security/security-citadel.ts

# Monitor expirations
bun run scripts/operations/monitor-expirations.ts
```

---

## 🤖 Kimi Code CLI Integration

### Quick Actions

```bash
# Start Kimi CLI in project directory
kimi

# Run with specific file
kimi src/core/barber-server.ts

# Batch process files
kimi --batch "src/**/*.ts"

# Performance analysis
kimi -e "Analyze performance bottlenecks in src/core/barber-server.ts"
```

### MCP Server Integration

The Barbershop project can integrate with Kimi Code CLI via MCP:

```json
// ~/.kimi/mcp.json
{
  "mcpServers": {
    "barbershop": {
      "command": "bun",
      "args": ["run", "src/core/barber-server.ts", "--mcp"],
      "env": {
        "SERVER_NAME": "Kimi MCP Bridge",
        "PORT": "3002"
      }
    }
  }
}
```

### Skills Integration

Create custom Kimi skills for the project:

```yaml
# .kimi/skills/barbershop.yaml
name: barbershop-dev
description: Barbershop project development helpers
triggers:
  - "barber"
  - "dashboard"
  - "ticket"
actions:
  - name: start-dashboard
    command: bun run src/core/barbershop-dashboard.ts
  - name: run-tests
    command: bun test
  - name: profile
    command: bun run src/profile/sampling-profile.ts
```

---

## 📊 Monitoring & Observability

### Runtime Metrics

```bash
# Start with runtime metrics endpoint
METRICS_ENABLED=true \
bun run src/core/barber-server.ts

# Query metrics
curl http://localhost:3000/ops/runtime

# Fetch diagnostics
curl "http://localhost:3000/ops/fetch-check?url=https://example.com"

# R2 status
curl http://localhost:3000/ops/r2-status
```

### Lifecycle Management

```bash
# Check server status
curl "http://localhost:3000/ops/lifecycle?action=status&key=godmode123"

# Graceful shutdown
curl "http://localhost:3000/ops/lifecycle?action=stop&key=godmode123"

# Force stop
curl "http://localhost:3000/ops/lifecycle?action=stop_force&key=godmode123"
```

### Health Checks

```bash
# Server health
curl http://localhost:3000/api/health

# Database health
curl http://localhost:3000/api/health/db

# Full system check
curl http://localhost:3000/api/health/full
```

---

## 🔧 Build & Deployment

### Build Commands

```bash
# Build dashboard
bun build src/core/barbershop-dashboard.ts \
  --outfile dist/barbershop-dashboard.js \
  --target=bun

# Build server
bun build src/core/barber-server.ts \
  --outfile dist/barber-server.js \
  --target=bun

# Build with metafile
bun build src/core/barber-server.ts \
  --outfile dist/barber-server.js \
  --metafile=dist/meta.json

# Production build
bun build src/core/barber-server.ts \
  --outfile dist/barber-server.js \
  --minify \
  --sourcemap
```

### Bundle Analysis

```bash
# Generate build metadata
bun run src/build/build-metadata.ts

# Generate graphs from metafile
bun run scripts/analysis/generate-graphs.ts \
  --metafile dist/meta.json

# Analyze bundle size
bun run src/build/build-virtual.ts --analyze
```

### Deployment Workflows

```bash
# Version initialization
bun run scripts/operations/init-versioning.ts

# Schedule rotation
bun run scripts/operations/schedule-rotation.ts

# Test rollback
bun run scripts/operations/test-rollback.ts

# FactoryWager lifecycle
bun run scripts/operations/factorywager-lifecycle.ts
```

---

## 🧪 Testing Commands

### Unit Tests

```bash
# Run all unit tests
bun test tests/unit/

# Run specific test file
bun test tests/unit/barber-server.test.ts

# Watch mode
bun test --watch
```

### Integration Tests

```bash
# Run integration tests
bun test tests/integration/

# With coverage
bun test --coverage

# Specific integration test
bun test tests/integration/barber-server.integration.test.ts
```

### Load Testing

```bash
# High concurrency test
bun run scripts/analysis/ws-secrets-bench.ts \
  --connections 1000 \
  --duration 600

# Stress test
bun run src/debug/test-system-gaps.ts --stress

# Benchmark suite
bun run src/debug/benchmark.ts --suite full
```

---

## 📝 Logging & Debugging

### Debug Configuration

```bash
# Enable debug logging
DEBUG=barbershop:* bun run src/core/barber-server.ts

# Verbose fetch logging
FETCH_VERBOSE=true bun run src/core/barber-server.ts

# Debug config
bun run src/debug/debug-config.ts
```

### Log Analysis

```bash
# View recent logs
bun run src/debug/fix-system-gaps.ts --logs

# System gap analysis
bun run src/debug/test-system-gaps.ts --analyze

# Fix detected gaps
bun run src/debug/fix-system-gaps.ts --auto-fix
```

---

## 🔄 Automation Scripts

### Cron Jobs

```bash
# List configured cron jobs
bun run scripts/operations/setup-lifecycle.ts --list-cron

# Add monitoring cron
bun run scripts/operations/monitor-expirations.ts --cron
```

### Batch Processing

```bash
# Batch profile upload
for profile in logs/profiles/*.cpuprofile; do
  bun run src/r2/upload-latest-profile.ts --file "$profile"
done

# Batch secret rotation
bun run scripts/operations/schedule-rotation.ts --batch
```

---

## 💡 Quick Reference

### Command Shortcuts

```bash
# Start all services
alias bb-start='bun run src/core/barber-server.ts & \
  bun run src/core/barbershop-dashboard.ts &'

# Quick profile
alias bb-profile='bun run src/profile/sampling-profile.ts --quick'

# Run tests
alias bb-test='bun test'

# Security audit
alias bb-audit='bun run scripts/security/security-audit.ts'
```

### Performance Targets

| Metric | Target | Command |
|--------|--------|---------|
| Startup Time | < 2s | `time bun run src/core/barber-server.ts` |
| Request Latency | < 50ms | `curl -w "%{time_total}" localhost:3000/api/health` |
| WebSocket Throughput | > 1MB/s | `bun run scripts/analysis/ws-secrets-bench.ts` |
| Memory Usage | < 512MB | `bun --heap-prof-md run src/core/barber-server.ts` |
| CPU Profile | < 50ms | `bun run src/profile/sampling-profile.ts` |

---

## 🔗 Related Documentation

- [CLI Tools Reference](./CLI-TOOLS.md) - Detailed CLI tool documentation
- [System Gap Analysis](./SYSTEM-GAP-ANALYSIS.md) - Performance gap identification
- [Benchmark Results](./BENCHMARK_RESULTS.md) - Historical performance data
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) - Architecture overview
