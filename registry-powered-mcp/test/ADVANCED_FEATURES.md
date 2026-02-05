# Advanced Bun Test Features Reference

Complete reference for advanced Bun testing features based on [official documentation](https://bun.sh/docs/test/writing).

## Table of Contents
1. [test.each & describe.each](#testeach--describeeach)
2. [Format Specifiers](#format-specifiers)
3. [Assertion Counting](#assertion-counting)
4. [test.failing](#testfailing)
5. [test.todo](#testtodo)
6. [Grouping Tests](#grouping-tests)
7. [Configuration File](#configuration-file)

---

## test.each & describe.each

Parameterized tests to reduce repetition.

### test.each with Arrays

```typescript
import { test, expect } from "harness";

// Array of arrays
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [5, 5, 10],
])("add(%d, %d) should equal %d", (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

### test.each with Table Format

More readable for complex data:

```typescript
test.each([
  { route: "/mcp/health", method: "GET", shouldMatch: true },
  { route: "/invalid", method: "GET", shouldMatch: false },
  { route: "/mcp/registry/@scope/pkg", method: "GET", shouldMatch: true },
  { route: "/mcp/registry/@scope/pkg", method: "POST", shouldMatch: false },
])("$route with $method -> $shouldMatch", ({ route, method, shouldMatch }) => {
  const match = router.match(route, method);
  expect(match !== null).toBe(shouldMatch);
});
```

### describe.each

Apply same tests to multiple configurations:

```typescript
import { describe, test, expect } from "harness";

describe.each([
  { name: "production", config: prodConfig },
  { name: "development", config: devConfig },
  { name: "testing", config: testConfig },
])("$name environment", ({ name, config }) => {
  test("should have valid config", () => {
    expect(config.version).toBeDefined();
    expect(config.servers).toBeArray();
  });

  test("should initialize router", async () => {
    const router = new LatticeRouter(config);
    await router.initialize();
    expect(router.routeCount).toBeGreaterThan(0);
  });
});
```

**Real-world example:**

```typescript
// Test multiple HTTP methods
describe.each([
  { method: "GET" },
  { method: "POST" },
  { method: "PUT" },
  { method: "DELETE" },
])("HTTP $method", ({ method }) => {
  test("should validate method", () => {
    expect(["GET", "POST", "PUT", "DELETE"]).toContain(method);
  });

  test("should create request", () => {
    const req = new Request("http://test.com", { method });
    expect(req.method).toBe(method);
  });
});
```

---

## Format Specifiers

Template placeholders in test names (similar to printf).

### Available Specifiers

| Specifier | Type | Description |
|-----------|------|-------------|
| `%s` | string | String value |
| `%d` | number | Integer value |
| `%i` | number | Integer value (alias for %d) |
| `%f` | number | Floating point value |
| `%j` | any | JSON.stringify() |
| `%o` | any | Object inspection |
| `%#` | index | Index of current test case (0-based) |
| `%%` | - | Literal percent sign |

### Examples

```typescript
// String specifier
test.each([
  ["hello", 5],
  ["world", 5],
  ["test", 4],
])("%s has length %d", (str, len) => {
  expect(str.length).toBe(len);
});

// Number specifiers
test.each([
  [1, 2, 3],
  [10, 20, 30],
  [100, 200, 300],
])("%d + %d = %d", (a, b, sum) => {
  expect(a + b).toBe(sum);
});

// Float specifier
test.each([
  [0.1, 0.2, 0.3],
  [1.5, 2.5, 4.0],
])("%f + %f ≈ %f", (a, b, expected) => {
  expect(a + b).toBeCloseTo(expected);
});

// JSON specifier
test.each([
  [{ name: "Alice", age: 30 }],
  [{ name: "Bob", age: 25 }],
])("user %j should be valid", (user) => {
  expect(user.name).toBeDefined();
  expect(user.age).toBeGreaterThan(0);
});

// Index specifier
test.each([
  ["first"],
  ["second"],
  ["third"],
])("test case %# with value %s", (value) => {
  expect(value).toBeDefined();
});
// Output: "test case 0 with value first"
//         "test case 1 with value second"
//         "test case 2 with value third"
```

### Table Format Specifiers

Use `$property` syntax:

```typescript
test.each([
  { input: "hello", expected: 5 },
  { input: "world", expected: 5 },
])("$input has length $expected", ({ input, expected }) => {
  expect(input.length).toBe(expected);
});
```

---

## Assertion Counting

Ensure expected number of assertions run (prevents silent failures).

### expect.hasAssertions()

Requires at least one assertion:

```typescript
test("callback is called", () => {
  expect.hasAssertions();

  const callback = (value: number) => {
    expect(value).toBeGreaterThan(0);
  };

  processWithCallback(callback);
  // If callback is never called, test fails
});
```

### expect.assertions(n)

Requires exact number of assertions:

```typescript
test("processes array items", () => {
  expect.assertions(3);

  const items = [1, 2, 3];
  items.forEach((item) => {
    expect(item).toBeGreaterThan(0);
  });
  // Must have exactly 3 assertions, or test fails
});
```

### Async Example

```typescript
test("async callback assertions", async () => {
  expect.assertions(2);

  await fetch("/api/data")
    .then((res) => res.json())
    .then((data) => {
      expect(data.status).toBe("ok");
      expect(data.value).toBeDefined();
    });
  // Ensures both assertions ran even if promise resolves
});
```

### Practical Use Case

```typescript
test("event handler is called correct number of times", () => {
  expect.assertions(5);

  const emitter = new EventEmitter();
  const handler = (value: number) => {
    expect(value).toBeGreaterThan(0);
  };

  emitter.on("data", handler);

  // Emit 5 events
  for (let i = 1; i <= 5; i++) {
    emitter.emit("data", i);
  }

  // If handler is called < 5 or > 5 times, test fails
});
```

---

## test.failing

Mark tests that are expected to fail (useful for known bugs).

### Basic Usage

```typescript
import { test, expect } from "harness";

// This test is expected to fail
test.failing("known bug in edge case", () => {
  const result = buggyFunction();
  expect(result).toBe(expectedValue);
  // Test passes if it throws/fails
  // Test fails if it passes (bug is fixed!)
});
```

### Practical Examples

```typescript
// Document known limitation
test.failing("URLPattern doesn't support negative lookbehind", () => {
  const pattern = new URLPattern({ pathname: "/(?<!admin)/users" });
  expect(pattern).toBeDefined();
  // Currently fails - waiting for browser API support
});

// Known performance issue
test.failing("large dataset processing exceeds SLA", async () => {
  const metrics = await measurePerformance(
    () => processLargeDataset(10000),
    100
  );
  assertPerformanceMetrics(metrics, { maxMean: 10 }); // Currently ~50ms
});

// Bug documented with issue number
test.failing("issue #42: regex matching fails on Unicode", () => {
  const result = matchPattern("café");
  expect(result).not.toBeNull();
  // See: https://github.com/org/repo/issues/42
});
```

### Combined with test.each

```typescript
test.failing.each([
  { input: "🎉", expected: 1 },
  { input: "👨‍👩‍👧‍👦", expected: 1 },
])("Unicode grapheme counting: $input", ({ input, expected }) => {
  expect(countGraphemes(input)).toBe(expected);
  // Currently fails for multi-codepoint graphemes
});
```

### When Test Starts Passing

If a `test.failing` test passes, Bun will fail the test with a message:
```
Expected test to fail, but it passed
```

This alerts you that the bug is fixed and you can remove the `.failing` qualifier.

---

## test.todo

Mark tests that need implementation (documentation).

### Basic Usage

```typescript
import { test } from "harness";

// Just a description
test.todo("implement user authentication");

// With test body (won't be executed)
test.todo("add rate limiting", () => {
  // TODO: implement rate limiting tests
  expect(rateLimiter.check()).toBe(true);
});
```

### Organizing TODO Tests

```typescript
describe("User Management", () => {
  test("should create user", () => {
    // Implemented
  });

  test.todo("should update user profile");
  test.todo("should delete user");
  test.todo("should handle user permissions");

  test("should validate user input", () => {
    // Implemented
  });
});
```

### Test Output

```
✓ should create user
⊘ should update user profile (todo)
⊘ should delete user (todo)
⊘ should handle user permissions (todo)
✓ should validate user input

4 pass, 3 todo
```

### Use with test.each

```typescript
test.todo.each([
  { feature: "OAuth2 login" },
  { feature: "2FA authentication" },
  { feature: "Password reset" },
])("implement $feature");
```

### Best Practices

```typescript
// Good: Specific description
test.todo("add snapshot test for /api/health response");

// Bad: Vague description
test.todo("fix tests");

// Good: Link to issue
test.todo("implement #123: add WebSocket support");

// Good: Group related TODOs
describe.todo("Admin Dashboard", () => {
  test("should display user stats");
  test("should allow user management");
  test("should show system metrics");
});
```

---

## Grouping Tests

Organize tests with `describe()` blocks.

### Basic Grouping

```typescript
import { describe, test, expect } from "harness";

describe("LatticeRouter", () => {
  test("should initialize", () => {
    // Test implementation
  });

  test("should match routes", () => {
    // Test implementation
  });
});
```

### Nested Grouping

```typescript
describe("LatticeRouter", () => {
  describe("route matching", () => {
    test("should match simple routes", () => {});
    test("should match parameterized routes", () => {});
    test("should match wildcard routes", () => {});
  });

  describe("server resolution", () => {
    test("should resolve server by name", () => {});
    test("should return null for unknown server", () => {});
  });

  describe("health checks", () => {
    test("should report healthy status", () => {});
    test("should detect issues", () => {});
  });
});
```

### Shared Setup with Hooks

```typescript
describe("Database Operations", () => {
  let db: Database;

  beforeAll(async () => {
    db = await initDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  describe("user operations", () => {
    beforeEach(async () => {
      await db.clear();
      await db.seed();
    });

    test("should create user", async () => {
      await db.createUser({ name: "Alice" });
      expect(await db.countUsers()).toBe(1);
    });

    test("should delete user", async () => {
      await db.createUser({ name: "Bob" });
      await db.deleteUser("Bob");
      expect(await db.countUsers()).toBe(0);
    });
  });
});
```

### describe.skip & describe.only

```typescript
// Skip entire group
describe.skip("Work in Progress", () => {
  test("feature A", () => {});
  test("feature B", () => {});
  // All tests skipped
});

// Focus on specific group
describe.only("Debugging This", () => {
  test("test 1", () => {});
  test("test 2", () => {});
  // Only these tests run
});
```

---

## Configuration File

Configure test behavior in `bunfig.toml`.

### Complete Configuration Reference

```toml
[test]
# Test file discovery
# Files matching these patterns are discovered as tests
# Default patterns:
# - *.test.{ts,tsx,js,jsx}
# - *_test.{ts,tsx,js,jsx}
# - *.spec.{ts,tsx,js,jsx}
# - *_spec.{ts,tsx,js,jsx}

# Preload scripts before tests run
preload = ["./test/_harness/setup.ts"]

# Default timeout for all tests (milliseconds)
timeout = 30000

# Coverage settings
coverage = false  # Enable by default (usually set via CLI)
coverageDir = "./coverage"
coverageReporter = ["text", "lcov"]  # Available: text, lcov
coverageSkipTestFiles = true  # Don't include test files in coverage

# Test execution
concurrent = false  # Run all tests concurrently
maxConcurrency = 20  # Max concurrent test workers
bail = 0  # Exit after N failures (0 = run all)

# Randomization
randomize = false  # Randomize test order
seed = 0  # Seed for randomization (0 = random)

# Snapshot settings
updateSnapshots = false  # Auto-update snapshots (dangerous in CI!)

# Reporter settings
# Available: "junit", "dots"
# reporter = "junit"
# reporterOutfile = "./test-results.xml"
```

### Environment-Specific Configs

```toml
# bunfig.toml (development)
[test]
timeout = 30000
preload = ["./test/_harness/setup.ts"]

# bunfig.ci.toml (CI environment)
[test]
timeout = 60000
bail = 1  # Fail fast in CI
coverage = true
coverageReporter = ["lcov"]
```

Run with specific config:
```bash
bun test --config bunfig.ci.toml
```

### Per-Project Configuration

Different configs for different packages:

```toml
# packages/core/bunfig.toml
[test]
timeout = 5000
preload = ["./test/setup.ts"]

# packages/benchmarks/bunfig.toml
[test]
timeout = 60000  # Benchmarks need more time
```

### Override via CLI

CLI flags override config file:

```bash
# Override timeout
bun test --timeout 60000

# Override coverage settings
bun test --coverage --coverage-reporter=text

# Override preload
bun test --preload ./custom-setup.ts
```

---

## Complete Examples

### Comprehensive Test Suite

```typescript
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from "harness";

describe("Router Performance Tests", () => {
  let router: LatticeRouter;

  beforeAll(async () => {
    const config = await loadConfig();
    router = new LatticeRouter(config);
    await router.initialize();
  });

  // Parameterized tests with format specifiers
  test.each([
    { route: "/mcp/health", method: "GET", expectedTime: 0.03 },
    { route: "/mcp/registry/@scope/pkg", method: "GET", expectedTime: 0.03 },
    { route: "/mcp/tools/fs/read", method: "POST", expectedTime: 0.03 },
  ])(
    "$route with $method should complete in < $expectedTime ms",
    async ({ route, method, expectedTime }) => {
      expect.assertions(1);

      const metrics = await measurePerformance(
        () => router.match(route, method),
        10000
      );

      expect(metrics.mean).toBeLessThan(expectedTime);
    }
  );

  // Known performance issue
  test.failing("wildcard routes exceed SLA under heavy load", async () => {
    const metrics = await measurePerformance(
      () => {
        for (let i = 0; i < 1000; i++) {
          router.match(`/mcp/tools/fs/deep/path/${i}`, "POST");
        }
      },
      100
    );

    expect(metrics.mean).toBeLessThan(1); // Currently ~2ms
  });

  // TODO: Future test
  test.todo("add caching layer to improve repeated lookups");

  afterAll(async () => {
    await router.cleanup();
  });
});
```

### Advanced Assertion Counting

```typescript
test("event emitter fires correct number of events", () => {
  expect.assertions(5);

  const emitter = new EventEmitter();
  let callCount = 0;

  emitter.on("test", (value: number) => {
    callCount++;
    expect(value).toBe(callCount);
  });

  for (let i = 1; i <= 5; i++) {
    emitter.emit("test", i);
  }
  // Ensures all 5 events were handled
});
```

---

## References

- [Bun Test Documentation](https://bun.sh/docs/test)
- [Bun Writing Tests](https://bun.sh/docs/test/writing)
- [Bun Test Configuration](https://bun.sh/docs/test/configuration)
- [Project Testing Guide](../TESTING.md)
- [Project Best Practices](./BEST_PRACTICES.md)
