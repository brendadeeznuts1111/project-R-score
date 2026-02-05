# Testing Documentation Index

Complete guide to navigating the testing documentation for registry-powered-mcp.

## 📖 Documentation Map

### Quick Start (5 minutes)
1. **Start Here:** [`../TESTING.md`](../TESTING.md)
   - Essential commands
   - Basic workflow
   - Getting started guide

### Learning Path

#### Beginner (First Day)
1. [`../TESTING.md`](../TESTING.md) - Quick start
2. [`examples/comprehensive-example.test.ts`](examples/comprehensive-example.test.ts) - See tests in action
3. Run: `bun test test/examples/comprehensive-example.test.ts`

#### Intermediate (First Week)
1. [`README.md`](README.md) - Complete system overview
2. [`BEST_PRACTICES.md`](BEST_PRACTICES.md) - Writing quality tests
3. Review existing tests: `test/unit/`, `test/integration/`

#### Advanced (Ongoing)
1. [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md) - Master Bun features
2. [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Technical deep dive
3. [Bun Official Docs](https://bun.sh/docs/test)

## 📚 Complete Documentation List

### Root Level
| File | Lines | Purpose | Audience |
|------|-------|---------|----------|
| [`TESTING.md`](../TESTING.md) | 311 | Quick start guide | All developers |

### Test Directory
| File | Lines | Purpose | Audience |
|------|-------|---------|----------|
| [`README.md`](README.md) | 570+ | Complete documentation | All developers |
| [`BEST_PRACTICES.md`](BEST_PRACTICES.md) | 630+ | Testing best practices | Test authors |
| [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md) | 800+ | Advanced Bun features | Advanced users |
| [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) | 400+ | Technical details | Maintainers |
| [`_snapshots/README.md`](_snapshots/README.md) | 50+ | Snapshot guide | Snapshot users |
| **Total** | **2,300+ lines** | - | - |

### Example Code
| File | Tests | Purpose |
|------|-------|---------|
| [`examples/comprehensive-example.test.ts`](examples/comprehensive-example.test.ts) | 54 | All features demo |
| [`unit/core/advanced-features.test.ts`](unit/core/advanced-features.test.ts) | 23 | Advanced patterns |

## 🎯 Documentation by Use Case

### "I'm new to this project"
1. Read [`../TESTING.md`](../TESTING.md)
2. Run `bun test`
3. Explore [`examples/comprehensive-example.test.ts`](examples/comprehensive-example.test.ts)

### "I need to write a test"
1. Check [`BEST_PRACTICES.md`](BEST_PRACTICES.md)
2. Review similar tests in `unit/` or `integration/`
3. Use harness: `import { ... } from "harness"`

### "I want to understand test.each"
1. Go to [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#testeach--describeeach)
2. See examples in [`examples/comprehensive-example.test.ts`](examples/comprehensive-example.test.ts)
3. Try: `test.each([...])("test %d", (value) => {...})`

### "I need performance testing"
1. Read [`BEST_PRACTICES.md`](BEST_PRACTICES.md#performance-testing-best-practices)
2. Check `test/performance/dispatch.perf.test.ts`
3. Use: `measurePerformance()` and `assertPerformanceMetrics()`

### "Tests are failing, help!"
1. Check test output for error
2. Review [`BEST_PRACTICES.md`](BEST_PRACTICES.md#anti-patterns-to-avoid)
3. Try: `bun test --bail` for fast feedback
4. Try: `bun test --randomize` to catch dependencies

### "I want to add regression test"
1. Read [`README.md`](README.md#regression-tests-testregression)
2. Create `test/regression/issue/NNNN.test.ts`
3. Follow issue-based naming pattern

### "How do snapshots work?"
1. Read [`_snapshots/README.md`](_snapshots/README.md)
2. See examples in `test/unit/api/server.test.ts`
3. Update: `bun test -u`

### "What's the test infrastructure?"
1. Read [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)
2. Review [`README.md`](README.md) for harness details
3. Explore `_harness/` directory

## 🚀 Common Commands Quick Reference

```bash
# Run tests
bun test                      # All tests
bun run test:unit             # Unit tests
bun run test:integration      # Integration tests
bun run test:performance      # Performance tests

# Advanced
bun run test:watch            # Watch mode
bun run test:coverage         # Coverage
bun run test:randomize        # Randomize order
bun run test:concurrent       # Parallel
bun run test:bail             # Exit on first failure

# Filter
bun test -t "route matching"  # By name
bun test test/unit/core/      # By directory

# Snapshots
bun run test:update-snapshots # Update all

# Complete suite
bun run test:all              # All categories + reporting
```

## 📋 Test Harness Quick Reference

```typescript
import {
  describe, test, expect,           // Core testing
  beforeAll, afterAll,               // Lifecycle
  beforeEach, afterEach,

  gcTick, sleep, waitFor,            // Utilities
  createTestServer, createTempDir,

  loadFixture, loadConfigFixture,    // Fixtures
  mockRegistryData, mockRegistryConfig,

  measurePerformance,                // Performance
  assertPerformanceMetrics,
  measureMemory, formatMetrics,
} from "harness";
```

## 🔍 Finding Information

### By Topic
- **Getting Started**: [`TESTING.md`](../TESTING.md)
- **Test Organization**: [`README.md`](README.md#test-organization)
- **Writing Tests**: [`BEST_PRACTICES.md`](BEST_PRACTICES.md#writing-tests)
- **test.each**: [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#testeach--describeeach)
- **test.failing**: [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#testfailing)
- **Snapshots**: [`_snapshots/README.md`](_snapshots/README.md)
- **Performance**: [`BEST_PRACTICES.md`](BEST_PRACTICES.md#15-performance-testing-best-practices)
- **Regression**: [`README.md`](README.md#regression-tests-testregression)

### By Feature
| Feature | Documentation | Example |
|---------|---------------|---------|
| Basic test | [`TESTING.md`](../TESTING.md#writing-tests) | `test/unit/` |
| Async test | [`BEST_PRACTICES.md`](BEST_PRACTICES.md#6-handle-async-operations-properly) | Any `.test.ts` |
| Parameterized | [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#testeach--describeeach) | `examples/comprehensive-example.test.ts` |
| Performance | [`README.md`](README.md#performance-tests-testperformance) | `test/performance/` |
| Snapshots | [`_snapshots/README.md`](_snapshots/README.md) | `test/unit/api/server.test.ts` |
| Hooks | [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#grouping-tests) | `examples/comprehensive-example.test.ts` |
| Matchers | [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md#format-specifiers) | `test/unit/core/advanced-features.test.ts` |

## 📊 Documentation Statistics

- **Total documentation files**: 6
- **Total lines**: 2,300+
- **Example test files**: 2
- **Example tests**: 77+
- **Coverage**: All Bun testing features documented

## 🔗 External Resources

- [Bun Test Runner](https://bun.sh/docs/test)
- [Bun Writing Tests](https://bun.sh/docs/test/writing)
- [Bun Test Configuration](https://bun.sh/docs/test/configuration)
- [Bun's Test Suite](https://github.com/oven-sh/bun/tree/main/test)

## 💡 Tips

**For Quick Answers:**
- Search across all docs: Use your editor's search
- Check examples first: Often faster than reading docs
- Run the example: `bun test test/examples/comprehensive-example.test.ts`

**For Learning:**
- Start with [`TESTING.md`](../TESTING.md)
- Read [`BEST_PRACTICES.md`](BEST_PRACTICES.md)
- Study real tests in `test/unit/`

**For Reference:**
- [`README.md`](README.md) - The complete reference
- [`ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md) - Advanced patterns
- Examples - Working code snippets

## 🆘 Getting Help

1. **Check the docs** - Start with this index
2. **Search examples** - Look in `test/examples/` and `test/unit/`
3. **Run tests** - See real tests in action
4. **Check Bun docs** - Official documentation
5. **Review error messages** - Often point to the issue

## ✨ Documentation Highlights

### Best Practices
- 15 concrete best practices with examples
- Common anti-patterns to avoid
- Project-specific patterns
- Real-world scenarios

### Advanced Features
- Complete test.each reference
- Format specifiers explained
- Assertion counting guide
- test.failing and test.todo usage
- Configuration file options

### Examples
- 54 working test examples
- All Bun features demonstrated
- Copy-paste ready code
- Real-world patterns

---

**Last Updated**: December 2025
**Version**: 2.4.1
**Test Suite**: 96 tests, 12 files, ~1s execution
