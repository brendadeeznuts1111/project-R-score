# Test Runner - Quick Reference

**Status**: ✅ **Ready**

---

## Quick Commands

```bash
# Standard stability test (20 repeats)
bun run test:stability [test-path]

# Performance benchmark with coverage (50 repeats)
bun run test:benchmark [test-path]

# Regression detection with Telegram notification (30 repeats)
bun run test:regression [test-path]

# Smoke test for quick CI (5 repeats, verbose)
bun run test:smoke [test-path]

# Focused test on specific pattern
TEST_PATTERN="pattern" bun run test:focused [test-path]

# Full test suite (all configs)
bun run test:all [test-path]

# CI pipeline (stability + regression + coverage)
bun run test:ci [test-path]
```

---

## Examples

```bash
# Run stability test on specific file
bun run test:stability test/utils/rss-parser.test.ts

# Run benchmark with default test
bun run test:benchmark

# Run focused test with pattern
TEST_PATTERN="parse RSS" bun run test:focused test/utils/rss-parser.test.ts

# Run full suite
bun run test:all test/api/routes.test.ts

# CI pipeline
bun run test:ci test/utils/rss-parser.test.ts
```

---

## Direct Usage

```bash
# Use test runner directly for more control
bun run scripts/test-runner.ts <test-path> [config] [options]

# Examples
bun run scripts/test-runner.ts test/utils/rss-parser.test.ts stability
bun run scripts/test-runner.ts test/utils/rss-parser.test.ts benchmark --coverage --notify --save
bun run scripts/test-runner.ts test/utils/rss-parser.test.ts regression --notify
```

---

## Options

- `--coverage` - Generate coverage report
- `--verbose` - Verbose output
- `--notify` - Notify Telegram
- `--save` - Save results to registry

---

## Configurations

| Config | Repeats | Timeout | Auto Flags |
|--------|---------|---------|------------|
| `stability` | 20 | 30s | - |
| `benchmark` | 50 | 60s | `--coverage --save` |
| `regression` | 30 | 45s | `--notify` |
| `smoke` | 5 | 10s | `--verbose` |
| `focused` | 10 | 20s | `--verbose` (requires `TEST_PATTERN`) |

---

## Related Documentation

- [`docs/guides/TEST-RUNNER-USAGE.md`](./docs/guides/TEST-RUNNER-USAGE.md) - Complete usage guide
- [`docs/reviews/TEST-RUNNER-REVIEW.md`](./docs/reviews/TEST-RUNNER-REVIEW.md) - Deep review
- [`scripts/test-runner.ts`](./scripts/test-runner.ts) - Implementation

---

**Status**: ✅ **Test Runner Ready** - Use `bun run test:*` commands for convenient testing
