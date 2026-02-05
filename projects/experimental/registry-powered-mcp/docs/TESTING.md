# Testing Guide

This project uses a comprehensive Bun-native testing infrastructure inspired by [Bun's official test suite](https://github.com/oven-sh/bun/tree/main/test).

## Quick Start

```bash
# Run all tests
bun test

# Run specific test categories
bun run test:unit           # Unit tests only
bun run test:integration    # Integration tests only
bun run test:performance    # Performance tests only
bun run test:regression     # Regression tests only

# Advanced test execution
bun run test:watch          # Watch mode (auto-rerun on changes)
bun run test:coverage       # Run with coverage report
bun run test:bail           # Exit on first failure
bun run test:randomize      # Randomize test order
bun run test:concurrent     # Run tests in parallel

# Filter tests by name
bun run test:filter "route matching"

# Update snapshots
bun run test:update-snapshots

# Complete test suite with reporting
bun run test:all
```

## Test Organization

Tests are organized in `test/` directory by category:

- **`test/unit/`** - Unit tests for individual components
- **`test/integration/`** - Integration tests for component interactions
- **`test/regression/`** - Regression tests protecting against bug recurrence
- **`test/performance/`** - Performance regression tests and SLA validation
- **`test/_harness/`** - Shared test utilities (import from `"harness"`)
- **`test/_fixtures/`** - Test data and configurations
- **`test/_snapshots/`** - Snapshot test files

## Writing Tests

### Basic Test Structure

```typescript
import { describe, test, expect } from "harness";

describe('MyComponent', () => {
  test('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Using Test Harness

The `harness` module provides utilities for testing:

```typescript
import {
  describe,
  test,
  expect,
  beforeAll,

  // Utilities
  gcTick,
  sleep,
  createTestServer,

  // Fixtures
  loadFixture,
  mockRegistryData,

  // Performance
  measurePerformance,
  assertPerformanceMetrics,
} from "harness";

test('performance test', async () => {
  const metrics = await measurePerformance(
    () => expensiveOperation(),
    1000  // iterations
  );

  assertPerformanceMetrics(metrics, {
    maxMean: 0.03,  // Max 30μs average
    maxP99: 0.1,    // Max 100μs 99th percentile
  });
});
```

### Snapshot Testing

Capture output for comparison:

```typescript
test('API response structure', () => {
  const response = api.getHealth();
  expect(response).toMatchSnapshot();
});

// Update snapshots when intentionally changing output:
// bun test --update-snapshots
```

## Performance Testing

Performance tests validate SLA compliance:

```typescript
import { test, measurePerformance, assertPerformanceMetrics } from "harness";

test('route dispatch meets <0.03ms SLA', async () => {
  const metrics = await measurePerformance(
    () => router.match('/path', 'GET'),
    10000,  // iterations
    1000    // warmup iterations
  );

  assertPerformanceMetrics(metrics, {
    maxMean: 0.03,   // 30μs average
    maxP95: 0.05,    // 50μs 95th percentile
    maxP99: 0.1,     // 100μs 99th percentile
  });
});
```

**🔗 Cross-Links:**
- **Failed SLA?** See [HARDENED_CONTRACT_INTEGRATION.md](../HARDENED_CONTRACT_INTEGRATION.md#performance-contract-details) for optimization techniques
- **Memory issues?** Review [HARDENED_CONTRACT_INTEGRATION.md](../HARDENED_CONTRACT_INTEGRATION.md#contract-enforcement-mechanisms) heap pressure monitoring
- **Bundle size problems?** Check [HARDENED_CONTRACT_INTEGRATION.md](../HARDENED_CONTRACT_INTEGRATION.md#performance-optimizations) for size reduction strategies

## Regression Testing

When fixing bugs:

1. Create GitHub issue for the bug
2. Create `test/regression/issue/NNNN.test.ts` (NNNN = issue number)
3. Write a failing test that reproduces the bug
4. Fix the bug
5. Verify the test passes
6. Commit both test and fix together

```typescript
// test/regression/issue/0001.test.ts
import { test, expect } from "harness";

test("issue #1: [brief description]", () => {
  // Test that reproduces the bug
  const result = buggyFunction();
  expect(result).toBe(expectedValue);
});
```

## Coverage

```bash
# Run with coverage
bun run test:coverage

# Generate HTML report
bun run test:coverage:report

# Validate coverage thresholds
bun run test/scripts/coverage-check.ts
```

**Coverage Targets:**
- Lines: 80%
- Functions: 75%
- Branches: 75%
- Statements: 80%

## Test Scripts

### Run All Tests
```bash
bun run test:all
```
Runs all test categories in sequence with summary reporting.

### Coverage Check
```bash
bun run test/scripts/coverage-check.ts
```
Validates coverage meets minimum thresholds.

### Regression Report
```bash
bun run test/scripts/regression-report.ts
```
Reports which issues are protected by regression tests.

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: bun install

- name: Run tests
  run: bun run test:all

- name: Check coverage
  run: bun run test:coverage
```

## Troubleshooting

### Cannot find module 'harness'

The `harness` module is configured via TypeScript path mapping in `tsconfig.json`. Run `bun install` to ensure proper resolution.

### Performance tests are flaky

- Use more warmup iterations
- Run GC before measurements: `await gcTick(10)`
- Check for background processes

### Snapshots failing

- Review changes carefully in diff
- Update if intentional: `bun test --update-snapshots`
- Never update without understanding why they changed

## Best Practices

1. **Write tests first** - Use TDD when possible
2. **Keep tests focused** - One assertion per test when practical
3. **Use descriptive names** - Test names should explain what's being tested
4. **Isolate tests** - Each test should be independent
5. **Use fixtures** - Reuse test data from `test/_fixtures/`
6. **Measure performance** - Use `measurePerformance()` for timing-critical code
7. **Clean up** - Use `afterEach`/`afterAll` for cleanup
8. **Document edge cases** - Add comments explaining tricky test scenarios

## Configuration

Test behavior can be configured in `bunfig.toml`:

```toml
[test]
timeout = 30000  # Default timeout for tests (milliseconds)
# preload = ["./test/_harness/setup.ts"]  # Global setup script
```

## Advanced Features

### Test Filtering by Name
```bash
bun test -t "route matching"
bun test --test-name-pattern "should handle.*errors"
```

### Randomize Test Order
Catch hidden test dependencies:
```bash
bun run test:randomize
```

### Concurrent Execution
Speed up independent tests:
```bash
bun run test:concurrent
```

### Bail on First Failure
Fast feedback during development:
```bash
bun run test:bail
```

### Preload Global Setup
```bash
bun test --preload ./test/_harness/setup.ts
```

## Best Practices

For comprehensive testing guidelines, see:
- [`test/README.md`](test/README.md) - Complete test suite documentation
- [`test/BEST_PRACTICES.md`](test/BEST_PRACTICES.md) - Testing best practices

Key principles:
1. **Use descriptive test names** - "should match registry route with scoped package"
2. **Keep tests isolated** - No shared mutable state between tests
3. **Use `test.concurrent()`** - For independent async operations
4. **Parameterize with `test.each()`** - Avoid repetitive test code
5. **Clean up resources** - Use `afterEach` / `afterAll` hooks
6. **Test edge cases** - Not just the happy path
7. **Use appropriate matchers** - Prefer specific matchers over generic ones
8. **Test error conditions** - Ensure proper error handling
9. **Use setup and teardown** - Leverage lifecycle hooks properly

## Advanced Bun Testing Features

### Retry and Repeats
```typescript
// Retry flaky tests
test(
  "unreliable API call",
  async () => {
    const response = await fetch("https://api.example.com");
    expect(response.ok).toBe(true);
  },
  { retry: 3 } // Retry up to 3 times on failure
);

// Run test multiple times to detect flakiness
test(
  "stress test randomness",
  () => {
    expect(Math.random()).toBeLessThan(1);
  },
  { repeats: 100 } // Runs 101 times total
);
```

### Conditional Test Execution
```typescript
const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

// Platform-specific tests
test.if(isMacOS)("macOS file permissions", () => {
  // Test macOS-specific functionality
});

test.skipIf(isWindows)("Unix file operations", () => {
  // Skip on Windows
});

test.todoIf(isMacOS)("Linux support planned", () => {
  // Marked as TODO on macOS
});

// Track known failures
test.failing("floating point precision", () => {
  expect(0.1 + 0.2).toBe(0.3); // Known to fail
});
```

### Type Testing with expectTypeOf
```typescript
import { expectTypeOf } from "bun:test";

// Test TypeScript types at compile-time
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf({ a: 1, b: 2 }).toMatchObjectType<{ a: number }>();

function greet(name: string): string {
  return `Hello ${name}`;
}

expectTypeOf(greet).toBeFunction();
expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
expectTypeOf(greet).returns.toEqualTypeOf<string>();
```

<Note>Run `bunx tsc --noEmit` to verify type assertions.</Note>

### Assertion Counting
```typescript
// Ensure assertions are called in async tests
test("async operations complete", async () => {
  expect.hasAssertions(); // Requires at least one assertion

  const data = await fetchData();
  expect(data).toBeDefined();
});

// Verify exact number of assertions
test("exactly two checks", () => {
  expect.assertions(2); // Must have exactly 2 assertions

  expect(1 + 1).toBe(2);
  expect("hello").toContain("ell");
});
```

## Advanced Examples

See [`test/unit/core/advanced-features.test.ts`](test/unit/core/advanced-features.test.ts) for comprehensive Bun testing patterns including:

- Parameterized tests with `test.each()`
- Concurrent test execution
- Custom timeouts and lifecycle hooks
- Test modifiers (skip, only, todo)
- Comprehensive matcher usage
- Zombie process killer (automatic cleanup of timed-out child processes)

## More Information

For detailed documentation, see:
- [`test/README.md`](test/README.md) - Complete test suite documentation
- [`test/BEST_PRACTICES.md`](test/BEST_PRACTICES.md) - Testing best practices
- [`test/unit/core/advanced-features.test.ts`](test/unit/core/advanced-features.test.ts) - Advanced test patterns demo
- [Bun Test Docs](https://bun.sh/docs/test) - Official Bun test runner reference
- [Bun Writing Tests](https://bun.sh/docs/test/writing) - Test authoring guide

## Getting Help

If you encounter issues:
1. Check `test/BEST_PRACTICES.md` for guidelines
2. Check `test/README.md` for detailed documentation
3. Review existing tests for examples
4. Run tests with different modes: `--randomize`, `--concurrent`, `--bail`
5. Check Bun's official test documentation
