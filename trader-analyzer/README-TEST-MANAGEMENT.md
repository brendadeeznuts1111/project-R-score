# Test Management Commands

**Status**: ✅ **Ready**

---

## Quick Commands

### Run Tests

```bash
# Quick smoke test (5 repeats)
bun run test:smoke [test-path]

# Stability test (20 repeats)
bun run test:stability [test-path]

# Benchmark (50 repeats, with coverage & save)
bun run test:benchmark [test-path]

# Regression detection (30 repeats, with notify)
bun run test:regression [test-path]

# Focused test (10 repeats, requires TEST_PATTERN)
TEST_PATTERN="pattern" bun run test:focused [test-path]

# Full test suite
bun run test:all [test-path]

# CI pipeline
bun run test:ci [test-path]
```

### Manage Test Results

```bash
# List recent test results
bun run test:list [limit]              # Default: 10

# Show test statistics
bun run test:stats

# View specific test results
bun run test:show <test-name>

# Compare recent test runs
bun run test:compare <test-name> [limit]

# Clean old test results
bun run test:clean [days]              # Default: 30 days
```

---

## Examples

### Running Tests

```bash
# Smoke test on RSS parser
bun run test:smoke test/utils/rss-parser.test.ts

# Stability test on correlation detection
bun run test:stability packages/graphs/multilayer/test/correlation-detection.test.ts

# Benchmark with all features
bun run test:benchmark test/utils/rss-parser.test.ts

# Focused test with pattern
TEST_PATTERN="parse RSS" bun run test:focused test/utils/rss-parser.test.ts
```

### Viewing Results

```bash
# List last 20 test results
bun run test:list 20

# Show statistics overview
bun run test:stats

# View results for specific test
bun run test:show rss-parser
bun run test:show correlation-detection

# Compare recent runs
bun run test:compare correlation-detection
```

### Cleanup

```bash
# Remove results older than 30 days
bun run test:clean

# Remove results older than 7 days
bun run test:clean 7
```

---

## Dashboard Integration

### Web UI

Access test management via the registry dashboard:

```bash
# Start dashboard
cd apps/@registry-dashboard
bun run dev

# Open in browser
open http://localhost:4000/dashboard
```

The dashboard includes:
- Test status cards with run buttons
- Test metrics display
- One-click test execution
- Results visualization

### API Endpoints

```bash
# Run test via API
curl -X POST http://localhost:4000/api/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "testPattern": "correlation-detection",
    "config": "benchmark",
    "testPath": "packages/graphs/multilayer/test/correlation-detection.test.ts"
  }'
```

---

## Team Workflows

### Sports Correlation Team

```bash
# Run team tests
bun run test:stability packages/graphs/multilayer/test/correlation-detection.test.ts --save
bun run test:benchmark packages/graphs/multilayer/test/correlation-detection.test.ts --notify

# View team test results
bun run test:show correlation-detection
bun run test:compare correlation-detection
```

### Market Analytics Team

```bash
# Run team tests
bun run test:regression packages/graphs/multilayer/test/layer4-anomaly-detection.test.ts --notify

# View results
bun run test:stats
```

### Platform & Tools Team

```bash
# Run all benchmarks
bun run test:benchmark test/utils/rss-parser.test.ts --save

# Monitor test health
bun run test:stats
bun run test:list 50
```

---

## Integration

### CI/CD

```bash
# GitHub Actions workflow
- name: Run Tests
  run: |
    bun run test:ci test/utils/rss-parser.test.ts

- name: Check Test Stats
  run: |
    bun run test:stats
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
TEST_FILE=$(git diff --cached --name-only | grep '\.test\.ts$' | head -1)
if [ -n "$TEST_FILE" ]; then
  bun run test:smoke "$TEST_FILE"
fi
```

---

## Related Documentation

- [`docs/guides/TEST-RUNNER-USAGE.md`](./docs/guides/TEST-RUNNER-USAGE.md) - Complete test runner guide
- [`docs/architecture/QUICK-REFERENCE.md`](./docs/architecture/QUICK-REFERENCE.md) - Quick reference
- [`scripts/test-manager.ts`](./scripts/test-manager.ts) - Test manager implementation
- [`scripts/test-runner.ts`](./scripts/test-runner.ts) - Test runner implementation

---

**Status**: ✅ **Test Management Ready** - Use `bun run test:*` commands for easy test management
