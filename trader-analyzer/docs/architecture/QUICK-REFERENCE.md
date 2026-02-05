# Quick Reference: Team Commands

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Team Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Sports Team (Alex Chen)
alias sports="cd packages/@graph/layer4 && bun run dev"
alias sports-bench="bun run @bench/layer4"
alias sports-pub="bun run scripts/team-publish.ts @graph/layer4"
alias sports-mini="cd apps/@mini/sports-correlation && bun run dev"

# Markets Team (Sarah Kumar)
alias markets="cd packages/@graph/layer2 && bun run dev"
alias markets-bench="bun run @bench/layer2"
alias markets-pub="bun run scripts/team-publish.ts @graph/layer2"
alias markets-mini="cd apps/@mini/market-analytics && bun run dev"

# Platform & Tools Team (Mike Rodriguez)
alias platform="cd packages/@graph/algorithms && bun run dev"
alias platform-bench="bun run bench:all"
alias platform-pub="bun run scripts/team-publish.ts"
alias platform-mini="cd apps/@mini/platform-tools && bun run dev"

# Benchmarking (Ryan Gupta - Platform Team)
alias bench-all="bun run bench:all"
alias bench-l4="bun run @bench/layer4 --property=threshold"
alias bench-l3="bun run @bench/layer3"
alias bench-l2="bun run @bench/layer2"
alias bench-l1="bun run @bench/layer1"
alias bench-property="bun run @bench/property"
alias bench-stress="bun run @bench/stress"
```

Or load all aliases at once:

```bash
source scripts/team-aliases.sh
```

---

## Common Commands

### Publishing

```bash
# Publish with ownership check
bun run scripts/team-publish.ts @graph/layer4 --tag=beta

# Verify ownership first
bun run @dev/registry verify-ownership @graph/layer4
```

### Benchmarking

```bash
# Run all Layer4 benchmarks
bun run @bench/layer4

# Run specific property
bun run @bench/layer4 --property=threshold --values=0.5,0.6,0.7,0.8

# Run all benchmarks
bun run bench:all
```

### Mini-Apps

```bash
# Start Sports Correlation mini-app
cd apps/@mini/sports-correlation
bun run dev

# Setup Telegram bot
bun run telegram:setup

# Build for production
bun run build
```

### Testing

```bash
# Run tests with different configurations
bun run test:smoke [test-path]        # Quick smoke test (5 repeats)
bun run test:stability [test-path]   # Stability test (20 repeats)
bun run test:benchmark [test-path]   # Benchmark (50 repeats, with coverage)
bun run test:regression [test-path]  # Regression detection (30 repeats)
bun run test:focused [test-path]     # Focused test (requires TEST_PATTERN)
bun run test:all [test-path]         # Full test suite
bun run test:ci [test-path]          # CI pipeline

# Test management commands
bun run test:list [limit]            # List recent test results
bun run test:stats                    # Show test statistics
bun run test:show <test-name>        # Show results for specific test
bun run test:compare <test-name>     # Compare recent test runs
bun run test:clean [days]            # Clean old results (default: 30 days)

# Examples
bun run test:smoke test/utils/rss-parser.test.ts
bun run test:benchmark test/utils/rss-parser.test.ts
bun run test:list 20
bun run test:compare correlation-detection
```

### Development

```bash
# Start dev server
cd packages/@graph/layer4 && bun run dev

# Run tests
bun test

# Run benchmarks
bun run bench
```

---

## Team Lead Workflows

### Alex (Sports Team)

```bash
# Daily workflow
bun run scripts/alex-daily-workflow.sh

# Or step by step:
git pull origin main
cd packages/@graph/layer4
bun run dev
bun run bench
bun run scripts/team-publish.ts @graph/layer4 --tag=beta

# Open mini-app
cd apps/@mini/sports-correlation && bun run dev
```

### Sarah (Markets Team)

```bash
# Review PR with benchmarks
bun run scripts/maria-review-process.ts @graph/layer2

# Publish release candidate
bun run scripts/team-publish.ts @graph/layer2 --tag=rc

# Open mini-app
cd apps/@mini/market-analytics && bun run dev
```

### Mike (Platform Team)

```bash
# Run all benchmarks
bun run bench:all

# Publish platform package
bun run scripts/team-publish.ts @graph/algorithms

# Open mini-app
cd apps/@mini/platform-tools && bun run dev
```

---

## Telegram Bot Commands

```bash
/sports_correlation - 🏀 Open Sports Correlation Mini-App
/market_analytics   - 📊 Open Market Analytics Mini-App
/platform_tools     - 🔧 Open Platform Tools Mini-App
/publish            - 📤 Quick publish wizard
/benchmark          - 🏃 Run benchmark
/rfc                - 📝 Submit RFC
/metrics            - 📊 View team metrics
```

---

## Registry Management

```bash
# Check registry health
curl https://npm.internal.yourcompany.com/-/ping

# View package metadata
curl https://npm.internal.yourcompany.com/api/v1/packages/@graph/layer4/metadata \
  -H "Authorization: Bearer $GRAPH_NPM_TOKEN"

# View benchmarks
curl https://npm.internal.yourcompany.com/api/v1/packages/@graph/layer4/benchmarks \
  -H "Authorization: Bearer $GRAPH_NPM_TOKEN"
```

---

## Test Management

### View Test Results

```bash
# List recent test results
bun run test:list              # Last 10 results
bun run test:list 20          # Last 20 results

# Show statistics
bun run test:stats

# View specific test
bun run test:show rss-parser
bun run test:show correlation-detection

# Compare test runs
bun run test:compare correlation-detection
bun run test:compare layer4-anomaly-detection
```

### Cleanup

```bash
# Clean old test results
bun run test:clean             # Remove results older than 30 days
bun run test:clean 7           # Remove results older than 7 days
```

### Dashboard Integration

```bash
# Start registry dashboard
cd apps/@registry-dashboard
bun run dev

# Access test management UI
open http://localhost:4000/dashboard
```

---

## Related Documentation

- [`docs/architecture/TEAM-WORKFLOWS.md`](./TEAM-WORKFLOWS.md) - Detailed workflows
- [`docs/architecture/TEAM-MINI-APPS.md`](./TEAM-MINI-APPS.md) - Mini-apps guide
- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`docs/guides/TEST-RUNNER-USAGE.md`](../guides/TEST-RUNNER-USAGE.md) - Test runner guide
- [`README-TEST-RUNNER.md`](../../README-TEST-RUNNER.md) - Test runner quick reference
