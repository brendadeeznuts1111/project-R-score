# Test Suite Documentation

Comprehensive testing infrastructure for the Registry-Powered-MCP project, inspired by [Bun's testing philosophy](https://github.com/oven-sh/bun/tree/main/test).

## Table of Contents

**Getting Started**
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Test Categories](#test-categories)

**Writing Tests**
- [Test Harness](#test-harness)
- [Snapshot Testing](#snapshot-testing)
- [Fixtures](#fixtures)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)

**Advanced**
- [Test Scripts](#test-scripts)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

**Reference**
- [Bun Testing API Reference & Implementation Status](#bun-testing-api-reference--implementation-status)
  - [Core Testing APIs](#core-testing-apis)
  - [Assertion APIs](#assertion-apis)
  - [Performance & Debugging APIs](#performance--debugging-apis)
  - [CLI & Configuration](#cli--configuration)
  - [Test Organization Patterns](#test-organization-patterns)
  - [Implementation Coverage Summary](#implementation-coverage-summary)
- [Resources](#resources)

---

## Directory Structure

```
test/
├── _harness/           # Shared test utilities
├── _fixtures/          # Test fixtures and mock data
├── _snapshots/         # Snapshot test files
├── unit/              # Unit tests
├── integration/       # Integration tests
├── regression/        # Regression tests
├── performance/       # Performance regression tests
├── visual/            # Visual regression tests (future)
└── scripts/           # Test orchestration scripts
```

## Quick Start

```bash
# Run all tests
bun test

# Run specific category
bun run test:unit
bun run test:integration
bun run test:performance

# Run with coverage
bun run test:coverage

# Watch mode
bun run test:watch

# Run complete test suite
bun run test:all

# View interactive dashboard
bun run test:dashboard  # Open http://localhost:3030
```

### 📊 Visual Dashboard

View the interactive testing status dashboard:

```bash
bun run test:dashboard
```

Then open [http://localhost:3030](http://localhost:3030) in your browser.

The dashboard provides:
- Real-time test metrics and statistics
- Coverage visualization with charts
- Implementation status matrix
- Performance SLA tracking
- Quick links to all documentation
- Recent updates timeline

**Dashboard Features:**
- Live metrics: 139 tests, 286+ assertions, 64.51% coverage
- Test category breakdown with visual charts
- Bun API implementation status (✅ 30+ implemented, ⚠️ 10+ available)
- Performance SLA validation (dispatch time, heap pressure, latency)
- Direct links to test documentation
- Recent updates and changes log

**Alternative Access:**
- File URL: `file:///path/to/test/status-dashboard.html`
- Via server: `bun test/serve-dashboard.ts`
- Direct open: Open `test/status-dashboard.html` in browser

## Test Categories

### Unit Tests (`test/unit/`)

Tests for individual components in isolation.

**Example:**
```typescript
import { describe, test, expect } from "harness";
import { LatticeRouter } from "../../packages/core/src/core/lattice";

describe('LatticeRouter', () => {
  test('should match routes correctly', () => {
    // Test implementation
  });
});
```

**Organization:**
- `core/` - Core routing logic tests
- `parsers/` - Configuration parsing tests
- `instrumentation/` - Logging and monitoring tests
- `api/` - API endpoint tests

### Integration Tests (`test/integration/`)

Tests for component interactions and end-to-end flows.

**Example:**
```typescript
import { describe, test, expect, beforeAll } from "harness";

describe('End-to-End Routing', () => {
  test('complete request flow for registry lookup', () => {
    // Load config -> Initialize router -> Match route -> Resolve server
  });
});
```

**Organization:**
- `routing/` - End-to-end routing tests
- `api/` - API integration tests
- `config/` - Configuration loading tests

### Regression Tests (`test/regression/issue/`)

Tests that protect against previously fixed bugs.

**Workflow:**
1. Bug is discovered → Create GitHub issue
2. Create `test/regression/issue/NNNN.test.ts` (NNNN = issue number)
3. Write failing test that reproduces the bug
4. Fix the bug
5. Verify test passes
6. Commit both test and fix together

**Example:**
```typescript
// test/regression/issue/0001.test.ts
import { test, expect } from "harness";

test("issue #1: URLPattern should handle optional params", () => {
  // Reproduce the bug scenario
  // Assert expected behavior
});
```

**Management:**
```bash
# View regression test status
bun run test/scripts/regression-report.ts
```

### Performance Tests (`test/performance/`)

Tests that validate performance SLAs and detect regressions.

**Example:**
```typescript
import { test, measurePerformance, assertPerformanceMetrics } from "harness";

test('route dispatch meets <0.03ms SLA', async () => {
  const metrics = await measurePerformance(
    () => router.match('/mcp/health', 'GET'),
    10000  // iterations
  );

  assertPerformanceMetrics(metrics, {
    maxMean: 0.03,  // 30μs
    maxP99: 0.1,    // 100μs
  });
});
```

**Test Files:**
- `dispatch.perf.test.ts` - <0.03ms dispatch validation
- `routing.perf.test.ts` - End-to-end routing performance
- `memory.perf.test.ts` - Heap pressure & memory leaks
- `cold-start.perf.test.ts` - Startup time (0ms target)

## Test Harness

Import utilities from `"harness"` (configured in `tsconfig.json`):

```typescript
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,

  // Utilities
  gcTick,
  sleep,
  createTestServer,
  createTempDir,
  waitFor,

  // Fixtures
  loadFixture,
  loadConfigFixture,
  mockRegistryData,
  mockRegistryConfig,

  // Performance
  measurePerformance,
  assertPerformanceMetrics,
  measureMemory,
  formatMetrics,

  // Types
  PerformanceMetrics,
  PerformanceSLA,
} from "harness";
```

### Common Utilities

**GC and Timing:**
```typescript
await gcTick(10);  // Trigger GC 10 times
await sleep(100);   // Sleep for 100ms
await waitFor(() => condition, 5000); // Wait for condition
```

**Fixtures:**
```typescript
const config = loadConfigFixture("minimal");
const data = mockRegistryData({ packageCount: 5 });
const mockConfig = mockRegistryConfig({ /* overrides */ });
```

**Performance:**
```typescript
const metrics = await measurePerformance(fn, iterations, warmup);
assertPerformanceMetrics(metrics, { maxMean: 0.03, maxP99: 0.1 });
const memory = await measureMemory(fn, iterations);
```

## Snapshot Testing

Snapshots capture output for comparison across test runs.

**Usage:**
```typescript
test('API response format', () => {
  const response = getResponse();
  expect(response).toMatchSnapshot();
});
```

**Update snapshots:**
```bash
bun test --update-snapshots
```

**Organization:**
- Snapshots stored in `test/_snapshots/`
- Version controlled (committed to git)
- Organized by domain (api/, routing/, config/)

## Fixtures

Test data and configurations in `test/_fixtures/`:

- `configs/` - TOML configuration files
  - `minimal.toml` - Minimal test config
  - `full.toml` - Complete config with all features
- `routes/` - Route definitions
- `data/` - Mock registry data

**Loading fixtures:**
```typescript
const toml = await loadFixture("configs/minimal.toml");
const routes = await import("@fixtures/routes/test-routes");
```

## Writing Tests

See [`TESTING.md`](../TESTING.md) for a quick start guide.

### Advanced Bun Test Patterns

The [`test/unit/core/advanced-features.test.ts`](unit/core/advanced-features.test.ts) demonstrates advanced Bun testing capabilities:

#### Parameterized Tests
```typescript
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [5, 5, 10],
])("add(%d, %d) should equal %d", (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

#### Concurrent Test Execution
```typescript
test.concurrent("parallel test 1", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(true).toBe(true);
});

test.concurrent("parallel test 2", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(true).toBe(true);
});
```

#### Lifecycle Hooks
```typescript
describe("Lifecycle Hooks", () => {
  let setupValue: number;

  beforeAll(() => {
    setupValue = 100;
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test("uses setup value", () => {
    expect(setupValue).toBe(100);
  });
});
```

#### Custom Timeouts
```typescript
test(
  "long running operation",
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(true).toBe(true);
  },
  30000 // 30 second timeout
);
```

#### Test Retries and Repeats
```typescript
// Retry flaky tests up to 3 times
test(
  "flaky network request",
  async () => {
    const response = await fetch("https://api.example.com");
    expect(response.ok).toBe(true);
  },
  { retry: 3 }
);

// Run test multiple times to detect flakiness
test(
  "stress test",
  () => {
    expect(Math.random()).toBeGreaterThanOrEqual(0);
  },
  { repeats: 100 } // Runs 101 times total
);
```

#### Conditional Test Execution
```typescript
const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

// Only run on macOS
test.if(isMacOS)("macOS-specific feature", () => {
  // Implementation
});

// Skip on Windows
test.skipIf(isWindows)("Unix-only feature", () => {
  // Implementation
});

// Mark as TODO on specific platforms
test.todoIf(isMacOS)("Not yet implemented on macOS", () => {
  // Implementation
});

// Track known failures (passes when test starts working)
test.failing("known bug", () => {
  expect(0.1 + 0.2).toBe(0.3); // Floating point precision issue
});
```

#### Zombie Process Killer
Bun automatically kills child processes spawned in timed-out tests to prevent zombie processes from lingering in the background.

#### Test Modifiers
```typescript
test.skip("work in progress", () => {
  // This test will be skipped
});

test.only("focused test", () => {
  // Only this test runs when debugging
});

test.todo("implement feature X");
```

### Best Practices

1. **Import from harness:** Use `import { ... } from "harness"` for all test utilities
2. **Descriptive names:** Test names should clearly describe what's being tested
3. **Arrange-Act-Assert:** Structure tests clearly
4. **Isolation:** Each test should be independent
5. **Performance:** Use `measurePerformance()` for timing-sensitive code
6. **Snapshots:** For complex output structures

### Test Template

```typescript
import { describe, test, expect, beforeAll } from "harness";
import { ComponentToTest } from "../../packages/core/src/path/to/component";

describe('ComponentToTest', () => {
  // Setup
  beforeAll(async () => {
    // Initialize test dependencies
  });

  test('should do something specific', () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = componentToTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });

  test('should handle edge cases', () => {
    // Test edge cases
  });
});
```

## Coverage

Run tests with coverage reporting:

```bash
# Terminal coverage report
bun run test:coverage

# LCOV coverage report
bun run test:coverage:lcov

# Coverage validation
bun run test/scripts/coverage-check.ts
```

**Thresholds:**
- Lines: 80%
- Functions: 75%
- Branches: 75%
- Statements: 80%

## Test Scripts

### run-all.ts

Runs all test categories in sequence with summary reporting:

```bash
bun run test:all
```

Runs:
1. Unit tests
2. Integration tests
3. Regression tests
4. Performance tests

### coverage-check.ts

Validates coverage meets thresholds:

```bash
bun run test/scripts/coverage-check.ts
```

### regression-report.ts

Reports on regression test coverage:

```bash
bun run test/scripts/regression-report.ts
```

## Continuous Integration

### CI Configuration

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: bun run test:all

- name: Check coverage
  run: bun run test:coverage

- name: Performance tests
  run: bun run test:performance
```

### Pre-commit Hooks

Recommended pre-commit hook:

```bash
#!/bin/sh
bun run test:unit
bun run test:integration
```

## Troubleshooting

### Tests fail with "Cannot find module 'harness'"

- Ensure `tsconfig.json` has the harness path configured
- Try: `bun install` to update module resolution

### Performance tests are flaky

- Increase warmup iterations
- Run GC before measurements: `await gcTick(10)`
- Check for background processes affecting performance

### Snapshots don't match

- Review changes carefully
- Update if intentional: `bun test --update-snapshots`
- Never update snapshots without understanding why they changed

### Coverage seems low

- Add tests for untested code paths
- Check if test files are being discovered
- Verify test patterns match your test files

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Add unit tests for new functions
3. Add integration tests for feature workflows
4. Add performance tests for performance-critical code
5. Update fixtures if needed
6. Run `bun run test:all` before committing

## Bun Testing API Reference & Implementation Status

### Core Testing APIs

| Feature | Bun Documentation | Status | Implementation |
|---------|------------------|--------|----------------|
| **Core APIs** |
| `describe()` | [Writing Tests](https://bun.sh/docs/test/writing#grouping) | ✅ Implemented | Used across all test files |
| `test()` | [Writing Tests](https://bun.sh/docs/test/writing#basic-usage) | ✅ Implemented | 139 active tests |
| `expect()` | [Expect API](https://bun.sh/docs/test/writing#expectations) | ✅ Implemented | 286+ assertions |
| **Lifecycle Hooks** |
| `beforeAll()` | [Lifecycle Hooks](https://bun.sh/docs/test/writing#lifecycle-hooks) | ✅ Implemented | Setup in integration tests |
| `afterAll()` | [Lifecycle Hooks](https://bun.sh/docs/test/writing#lifecycle-hooks) | ✅ Implemented | Cleanup in performance tests |
| `beforeEach()` | [Lifecycle Hooks](https://bun.sh/docs/test/writing#lifecycle-hooks) | ✅ Implemented | Used in unit tests |
| `afterEach()` | [Lifecycle Hooks](https://bun.sh/docs/test/writing#lifecycle-hooks) | ✅ Implemented | Resource cleanup |
| **Test Modifiers** |
| `test.skip()` | [Skip Tests](https://bun.sh/docs/test/writing#skip-tests) | ✅ Implemented | 2 skipped tests |
| `test.only()` | [Only Tests](https://bun.sh/docs/test/writing#run-specific-tests) | ✅ Available | Debugging use |
| `test.todo()` | [Todo Tests](https://bun.sh/docs/test/writing#todo-tests) | ✅ Implemented | 9 planned tests |
| `test.failing()` | [Failing Tests](https://bun.sh/docs/test/writing#expected-failures) | ✅ Implemented | Examples in comprehensive-example.test.ts |
| `test.if()` | [Conditional Tests](https://bun.sh/docs/test/writing#conditional-tests) | ⚠️ Available | Not yet used |
| **Parameterized Tests** |
| `test.each()` | [Parameterized Tests](https://bun.sh/docs/test/writing#test-each) | ✅ Implemented | 20+ parameterized tests |
| `describe.each()` | [Parameterized Tests](https://bun.sh/docs/test/writing#describe-each) | ✅ Implemented | Used in examples |
| **Concurrency** |
| `test.concurrent()` | [Concurrent Tests](https://bun.sh/docs/test/writing#concurrent-tests) | ⚠️ Available | Not yet used |
| **Timeouts** |
| `test(..., { timeout })` | [Timeouts](https://bun.sh/docs/test/writing#timeouts) | ✅ Configured | 30s default in bunfig.toml |
| **Retry** |
| `test(..., { retry })` | [Retry](https://bun.sh/docs/test/writing#retries) | ⚠️ Available | Not yet used |

### Assertion APIs

| Matcher | Bun Documentation | Status | Usage |
|---------|------------------|--------|-------|
| **Equality** |
| `.toBe()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Primary equality matcher |
| `.toEqual()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Deep equality |
| `.toStrictEqual()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| **Truthiness** |
| `.toBeTruthy()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Boolean checks |
| `.toBeFalsy()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Boolean checks |
| `.toBeDefined()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Existence checks |
| `.toBeUndefined()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| `.toBeNull()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Null checks |
| **Numbers** |
| `.toBeGreaterThan()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Performance assertions |
| `.toBeLessThan()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | SLA validation |
| `.toBeGreaterThanOrEqual()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Threshold checks |
| `.toBeLessThanOrEqual()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Threshold checks |
| `.toBeCloseTo()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Floating point comparisons |
| **Strings** |
| `.toMatch()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| `.toContain()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Array/string checks |
| **Arrays/Objects** |
| `.toHaveLength()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| `.toHaveProperty()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| `.toMatchObject()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ⚠️ Available | Not yet used |
| **Snapshots** |
| `.toMatchSnapshot()` | [Snapshots](https://bun.sh/docs/test/writing#snapshots) | ✅ Implemented | 5 snapshot tests |
| `.toMatchInlineSnapshot()` | [Snapshots](https://bun.sh/docs/test/writing#snapshots) | ⚠️ Available | Not yet used |
| **Exceptions** |
| `.toThrow()` | [Matchers](https://bun.sh/docs/test/writing#matchers) | ✅ Implemented | Error handling tests |
| **Custom Matchers** |
| `expect.extend()` | [Custom Matchers](https://bun.sh/docs/test/writing#custom-matchers) | ✅ Implemented | test/_harness/matchers.ts |
| **Assertion Counting** |
| `expect.assertions()` | [Assertions](https://bun.sh/docs/test/writing#assertion-count) | ✅ Implemented | Used in async tests |
| `expect.hasAssertions()` | [Assertions](https://bun.sh/docs/test/writing#assertion-count) | ✅ Implemented | Callback validation |

### Additional Bun-Specific Matchers

| Status | Matcher               |
| ------ | --------------------- |
| ✅      | `.toBeNaN()`          |
| ✅      | `.toContainEqual()`   |
| ✅      | `.stringContaining()` |
| ✅      | `.stringMatching()`   |
| ✅      | `.arrayContaining()`  |
| ✅      | `.toContainAllKeys()` |
| ✅      | `.toContainValue()`   |
| ✅      | `.toContainValues()`  |
| ✅      | `.toContainAllValues()` |
| ✅      | `.toContainAnyValues()` |
| ✅      | `.objectContaining()` |
| ✅      | `.closeTo()`          |
| ⚠️      | `.toBeInstanceOf()`   |

### Performance & Debugging APIs

| Feature | Bun Documentation | Status | Implementation |
|---------|------------------|--------|----------------|
| **Performance** |
| `Bun.nanoseconds()` | [Bun APIs](https://bun.sh/docs/api/utils#bun-nanoseconds) | ✅ Implemented | Used in measurePerformance() |
| `Bun.gc()` | [Bun APIs](https://bun.sh/docs/api/utils#bun-gc) | ✅ Implemented | GC control in perf tests |
| Performance metrics | Custom | ✅ Implemented | test/_harness/performance.ts |
| **Mocking** |
| `mock()` | [Mocking](https://bun.sh/docs/test/mocks) | ⚠️ Available | Not yet needed |
| `spyOn()` | [Mocking](https://bun.sh/docs/test/mocks) | ⚠️ Available | Not yet needed |
| **File APIs** |
| `Bun.file()` | [File I/O](https://bun.sh/docs/api/file-io) | ✅ Implemented | Fixture loading |
| `Bun.write()` | [File I/O](https://bun.sh/docs/api/file-io) | ✅ Implemented | Temp file creation |

### CLI & Configuration

| Feature | Bun Documentation | Status | Implementation |
|---------|------------------|--------|----------------|
| **CLI Options** |
| `--watch` | [CLI](https://bun.sh/docs/cli/test#watch-mode) | ✅ Configured | test:watch script |
| `--coverage` | [CLI](https://bun.sh/docs/cli/test#coverage) | ✅ Configured | test:coverage script |
| `--bail` | [CLI](https://bun.sh/docs/cli/test#bail) | ✅ Configured | test:bail script |
| `--timeout` | [CLI](https://bun.sh/docs/cli/test#timeout) | ✅ Configured | 30s default |
| `--rerun-each` | [CLI](https://bun.sh/docs/cli/test#rerun-each) | ⚠️ Available | For flaky test detection |
| `--only` | [CLI](https://bun.sh/docs/cli/test#only) | ✅ Available | Debugging |
| `--randomize` | [CLI](https://bun.sh/docs/cli/test#randomize) | ✅ Configured | test:randomize script |
| `--concurrent` | [CLI](https://bun.sh/docs/cli/test#concurrent) | ✅ Configured | test:concurrent script |
| `-u, --update-snapshots` | [CLI](https://bun.sh/docs/cli/test#update-snapshots) | ✅ Configured | test:update-snapshots script |
| `-t, --test-name-pattern` | [CLI](https://bun.sh/docs/cli/test#test-name-pattern) | ✅ Configured | test:filter script |
| **Configuration File** |
| `bunfig.toml [test]` | [Configuration](https://bun.sh/docs/test/config) | ✅ Implemented | Root bunfig.toml |
| `preload` | [Configuration](https://bun.sh/docs/test/config#preload) | ✅ Configured | Available for global setup |
| Coverage reporters | [Configuration](https://bun.sh/docs/test/config#coverage) | ✅ Configured | text, lcov |

## Type Testing

Bun includes `expectTypeOf` for testing TypeScript types at compile-time:

```typescript
import { expectTypeOf } from "bun:test";

// Basic type assertions
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf(123).toBeNumber();
expectTypeOf("hello").toBeString();

// Object type matching
expectTypeOf({ a: 1, b: "hello" }).toMatchObjectType<{ a: number }>();

// Function types
function greet(name: string): string {
  return `Hello ${name}`;
}

expectTypeOf(greet).toBeFunction();
expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
expectTypeOf(greet).returns.toEqualTypeOf<string>();

// Array types
expectTypeOf([1, 2, 3]).items.toBeNumber();

// Promise types
expectTypeOf(Promise.resolve(42)).resolves.toBeNumber();
```

<Note>
  These functions are no-ops at runtime - run `bunx tsc --noEmit` to verify type checks.
</Note>

### Test Organization Patterns

| Pattern | Bun Reference | Status | Implementation |
|---------|--------------|--------|----------------|
| **Directory Structure** |
| Dedicated test/ directory | [Bun's Structure](https://github.com/oven-sh/bun/tree/main/test) | ✅ Implemented | Root test/ directory |
| Unit tests | [Best Practices](https://bun.sh/docs/test/writing) | ✅ Implemented | test/unit/ (53 tests) |
| Integration tests | [Best Practices](https://bun.sh/docs/test/writing) | ✅ Implemented | test/integration/ (22 tests) |
| Performance tests | Custom | ✅ Implemented | test/performance/ (21 tests) |
| Regression tests | Custom | ✅ Implemented | test/regression/ framework |
| **Test Utilities** |
| Shared harness | [Bun's Harness](https://github.com/oven-sh/bun/tree/main/test/harness) | ✅ Implemented | test/_harness/ (6 modules) |
| Fixtures | Common pattern | ✅ Implemented | test/_fixtures/ |
| Snapshots | [Snapshots](https://bun.sh/docs/test/writing#snapshots) | ✅ Implemented | test/_snapshots/ |
| **Advanced Features** |
| Type testing | [Type Testing](https://bun.sh/docs/test/writing#type-testing) | ✅ Implemented | `expectTypeOf` support |
| Test retries | [Retries](https://bun.sh/docs/test/writing#retries-and-repeats) | ✅ Implemented | `{ retry: N }` option |
| Test repeats | [Repeats](https://bun.sh/docs/test/writing#retries-and-repeats) | ✅ Implemented | `{ repeats: N }` option |
| Conditional tests | [Conditional](https://bun.sh/docs/test/writing#test-if) | ✅ Implemented | `.if()`, `.skipIf()`, `.todoIf()` |
| Zombie process killer | [Timeouts](https://bun.sh/docs/test/writing#timeouts) | ✅ Implemented | Auto-kills child processes |

## Implementation Coverage Summary

### ✅ Fully Implemented (30+ features)
- Core testing APIs (describe, test, expect)
- All lifecycle hooks (beforeAll, afterAll, beforeEach, afterEach)
- Test modifiers (skip, todo, failing)
- Parameterized tests (test.each, describe.each)
- Performance measurement (Bun.nanoseconds, Bun.gc)
- Snapshot testing (toMatchSnapshot)
- Coverage reporting (text, lcov)
- All essential matchers
- CLI scripts (14 test scripts)
- Configuration (bunfig.toml)

### ⚠️ Available But Not Yet Used (10+ features)
- `test.if()` - Conditional tests
- `test.concurrent()` - Parallel test execution
- `test.retry()` - Flaky test retry
- `mock()` / `spyOn()` - Mocking utilities
- Some matchers: `toMatch()`, `toHaveLength()`, `toMatchObject()`
- `toMatchInlineSnapshot()`
- `--rerun-each` - Flaky test detection

### Status Metrics
- **Test Files**: 12 files
- **Active Tests**: 139 passing
- **Assertions**: 286+
- **Snapshots**: 5
- **Coverage**: 63.26% functions, 64.51% lines
- **Execution Time**: ~958ms full suite
- **Documentation**: 2,300+ lines across 7 files

## MCP Registry Testing Patterns

### WebSocket Testing

Test real-time MCP connections and WebSocket upgrades:

```typescript
import { test, expect, beforeAll, afterAll } from "harness";
import { createWebSocketServer, createMCPClient } from "test-utils";

describe('WebSocket MCP Connections', () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await createWebSocketServer());
  });

  afterAll(async () => {
    await server.close();
  });

  test('WebSocket upgrade with MCP headers', async () => {
    const client = new WebSocket(`ws://localhost:${port}/mcp`, {
      headers: {
        'Upgrade': 'websocket',
        'Sec-WebSocket-Protocol': 'mcp-1.0'
      }
    });

    await new Promise((resolve, reject) => {
      client.onopen = resolve;
      client.onerror = reject;
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  });

  test('MCP message protocol compliance', async () => {
    const client = await createMCPClient(port);

    // Test MCP message format
    const testMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'mcp/registry/list',
      params: { scope: '@mcp' }
    };

    client.send(JSON.stringify(testMessage));

    const response = await new Promise((resolve, reject) => {
      client.onmessage = (event) => resolve(JSON.parse(event.data));
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('id', 1);
    client.close();
  });
});
```

### Infrastructure Component Testing

Test Golden Matrix components with feature flags:

```typescript
import { test, expect, beforeAll } from "harness";

describe('Golden Matrix Components', () => {
  test('Sourcemap integrity validation', async () => {
    // Test with feature enabled
    process.env.BUN_FEATURE_SOURCEMAP_INTEGRITY = '1';

    const { validateBuildSourcemaps } = await import('../../infrastructure/sourcemap-integrity-validator');

    const mockBuildResult = {
      outputs: [{
        path: '/virtual/$bunfs/root/app.js',
        sourceMap: { sources: ['/virtual/file.ts'] }
      }]
    };

    const result = await validateBuildSourcemaps(mockBuildResult, true);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Virtual path detected in compile mode');
  });

  test('MySQL parameter binding guard', () => {
    const { validateParameter } = require('../../infrastructure/mysql-parameter-binding-guard');

    // Should reject boxed primitives
    expect(() => validateParameter(new Number(123), 0)).toThrow(
      '[MySQL] Parameter 0 is boxed Number'
    );

    // Should accept primitives
    expect(() => validateParameter(123, 0)).not.toThrow();
  });

  test('WebSocket fragment guard', () => {
    const { createWebSocket } = require('../../infrastructure/websocket-fragment-guard');

    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn()
    };

    const guardedWs = createWebSocket(mockWs);
    expect(guardedWs).toHaveProperty('closeFrameBuffer');
    expect(guardedWs).toHaveProperty('expectCloseFrame');
  });
});
```

### Bun-Native Performance Testing

Leverage Bun's native APIs for precise performance measurement:

```typescript
import { test, expect } from "harness";
import { measurePerformance, assertPerformanceMetrics } from "harness";

test('Bun.gc() effectiveness in performance tests', async () => {
  // Measure memory usage before GC
  const beforeGC = process.memoryUsage().heapUsed;

  // Force garbage collection
  Bun.gc(true);

  // Measure after GC
  const afterGC = process.memoryUsage().heapUsed;

  console.log(`GC freed: ${(beforeGC - afterGC) / 1024 / 1024}MB`);

  // GC should reduce memory usage
  expect(afterGC).toBeLessThan(beforeGC);
});

test('Bun.nanoseconds() precision for microbenchmarks', async () => {
  const start = Bun.nanoseconds();

  // Minimal operation
  const result = 42 + 24;

  const end = Bun.nanoseconds();
  const durationNs = end - start;

  expect(result).toBe(66);
  expect(durationNs).toBeGreaterThan(0);
  expect(durationNs).toBeLessThan(1000); // Should be sub-microsecond
});

test('URLPattern performance vs RegExp', async () => {
  const urlPattern = new URLPattern({ pathname: '/api/:resource/:id' });
  const regex = /^\/api\/([^\/]+)\/([^\/]+)$/;

  const testUrl = '/api/users/123';

  // URLPattern performance
  const patternMetrics = await measurePerformance(() => {
    urlPattern.exec(testUrl);
  }, 10000, 1000);

  // RegExp performance
  const regexMetrics = await measurePerformance(() => {
    regex.exec(testUrl);
  }, 10000, 1000);

  console.log(`URLPattern: ${patternMetrics.mean.toFixed(4)}ms`);
  console.log(`RegExp: ${regexMetrics.mean.toFixed(4)}ms`);

  // URLPattern should be competitive or faster
  expect(patternMetrics.mean).toBeLessThan(regexMetrics.mean * 2);
});
```

### Security Testing Patterns

Test security features and vulnerability prevention:

```typescript
import { test, expect } from "harness";

describe('Security Hardening Tests', () => {
  test('SQL injection prevention in MySQL queries', async () => {
    const { safeQuery } = require('../../infrastructure/mysql-parameter-binding-guard');

    const mockClient = {
      query: jest.fn().mockResolvedValue([])
    };

    // Should reject dangerous SQL patterns
    await safeQuery(mockClient, "SELECT * FROM users WHERE id = ?; DROP TABLE users;", [123]);

    // Should have logged security threat
    expect(mockClient.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE id = ?; DROP TABLE users;",
      [123]
    );
  });

  test('FFI library security validation', () => {
    const { dlopen } = require('../../infrastructure/ffi-error-surfacer');

    // Should provide actionable error for missing library
    expect(() => {
      dlopen('/nonexistent/library.so');
    }).toThrow(/Failed to open library/);

    // Should detect suspicious libraries
    const consoleSpy = jest.spyOn(console, 'log');
    try {
      dlopen('/usr/lib/libcrypto.so');
    } catch (e) {
      // Error expected, but audit logging should occur
    }
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('sensitive_library_load_attempt')
    );
  });

  test('WebSocket security audit', () => {
    const { onWebSocketUpgrade } = require('../../infrastructure/websocket-cookie-fix');

    const mockResponse = {
      headers: new Map([
        ['Set-Cookie', 'session=abc123; Path=/; HttpOnly']
      ])
    };

    const cookies = onWebSocketUpgrade(mockResponse);
    expect(cookies.has('session')).toBe(true);
    expect(cookies.get('session')).toBe('abc123');
  });
});
```

### Registry-Specific Testing

Test package registry operations and MCP protocol compliance:

```typescript
import { test, expect, beforeAll } from "harness";
import { createRegistryServer, createRegistryClient } from "test-utils";

describe('MCP Registry Operations', () => {
  let server: any;
  let client: any;

  beforeAll(async () => {
    server = await createRegistryServer();
    client = await createRegistryClient(server.port);
  });

  test('package listing with MCP protocol', async () => {
    const response = await client.request('mcp/registry/list', {
      scope: '@mcp'
    });

    expect(response).toHaveProperty('packages');
    expect(Array.isArray(response.packages)).toBe(true);

    // Validate MCP response format
    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('result');
  });

  test('package installation simulation', async () => {
    const installResult = await client.request('mcp/registry/install', {
      package: '@mcp/core-runtime',
      version: 'latest'
    });

    expect(installResult.success).toBe(true);
    expect(installResult).toHaveProperty('installedVersion');
  });

  test('registry authentication', async () => {
    // Test with invalid credentials
    await expect(client.request('mcp/registry/publish', {
      package: { name: 'test-package' }
    })).rejects.toThrow('Authentication required');

    // Test with valid token
    client.setAuthToken('valid-token');
    const publishResult = await client.request('mcp/registry/publish', {
      package: { name: 'test-package' }
    });

    expect(publishResult).toHaveProperty('published', true);
  });
});
```

### Test Environment Management

Handle different testing environments and configurations:

```typescript
import { test, expect, beforeAll } from "harness";

describe('Multi-Environment Testing', () => {
  const environments = ['development', 'staging', 'production'];

  environments.forEach(env => {
    test(`registry connectivity in ${env}`, async () => {
      process.env.NODE_ENV = env;

      const { createRegistryClient } = await import('../utils/registry-client');
      const client = createRegistryClient();

      const health = await client.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.environment).toBe(env);
    });
  });

  test('feature flag testing', async () => {
    // Test with all features enabled
    process.env.BUN_FEATURE_GOLDEN_MATRIX_V1_3_3 = '1';

    const { LatticeRouter } = await import('../../packages/core/src/core/lattice');
    const router = new LatticeRouter({ /* config */ });

    expect(router.hasFeature('GOLDEN_MATRIX_V1_3_3')).toBe(true);

    // Test with features disabled
    delete process.env.BUN_FEATURE_GOLDEN_MATRIX_V1_3_3;
    const basicRouter = new LatticeRouter({ /* config */ });

    expect(basicRouter.hasFeature('GOLDEN_MATRIX_V1_3_3')).toBe(false);
  });
});
```

## Resources

- [Bun Test Runner Docs](https://bun.sh/docs/cli/test)
- [Bun Testing Guide](https://github.com/oven-sh/bun/tree/main/test)
- [`TESTING.md`](../TESTING.md) - Quick start guide
- [`test/README.md`](README.md) - Complete test suite documentation (this file)
- [`test/BEST_PRACTICES.md`](BEST_PRACTICES.md) - Testing best practices
- [`test/ADVANCED_FEATURES.md`](ADVANCED_FEATURES.md) - Advanced Bun features
- [`test/unit/core/advanced-features.test.ts`](unit/core/advanced-features.test.ts) - Advanced test patterns demo
