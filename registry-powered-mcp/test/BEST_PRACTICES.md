# Bun Testing Best Practices

Official guidelines from [Bun's Test Documentation](https://bun.sh/docs/test/writing-tests#best-practices) applied to this project.

## 1. Use Descriptive Test Names

**Good:**
```typescript
test("should return 404 when route does not exist", () => {
  const match = router.match('/invalid/path', 'GET');
  expect(match).toBeNull();
});

test("should match registry route with scoped package name", () => {
  const match = router.match('/mcp/registry/@scope/package', 'GET');
  expect(match?.params.scope).toBe('@scope');
  expect(match?.params.name).toBe('package');
});
```

**Bad:**
```typescript
test("test1", () => { /* ... */ });
test("routing", () => { /* ... */ });
test("it works", () => { /* ... */ });
```

### Why Descriptive Names Matter

1. **Test filtering**: `bun test -t "should match registry"` - easy to run related tests
2. **Failure clarity**: Immediately understand what broke without reading code
3. **Documentation**: Test names serve as executable specifications
4. **Debugging**: `--randomize` mode makes it easier to identify flaky tests

## 2. Group Related Tests with `describe()`

```typescript
describe('LatticeRouter', () => {
  describe('route matching', () => {
    test('should match simple routes', () => { /* ... */ });
    test('should match parameterized routes', () => { /* ... */ });
    test('should match wildcard routes', () => { /* ... */ });
  });

  describe('server resolution', () => {
    test('should resolve server by name', () => { /* ... */ });
    test('should return null for unknown server', () => { /* ... */ });
  });
});
```

**Benefits:**
- Logical organization
- Shared setup with `beforeAll` / `beforeEach`
- Better test output structure
- Easier to navigate large test suites

## 3. Use Lifecycle Hooks Appropriately

```typescript
describe('Database Tests', () => {
  let db: Database;

  // Run ONCE before all tests in this describe block
  beforeAll(async () => {
    db = await initializeTestDatabase();
  });

  // Run ONCE after all tests complete
  afterAll(async () => {
    await db.close();
  });

  // Run before EACH test
  beforeEach(async () => {
    await db.clear();
    await db.seed();
  });

  // Run after EACH test
  afterEach(() => {
    // Cleanup test-specific state
  });

  test('should insert record', async () => {
    await db.insert({ id: 1, name: 'test' });
    expect(await db.count()).toBe(1);
  });
});
```

**Hook Execution Order:**
1. `beforeAll` (once)
2. `beforeEach` → test → `afterEach` (for each test)
3. `afterAll` (once)

## 4. Keep Tests Independent and Isolated

**Good:**
```typescript
test('test A', () => {
  const state = createCleanState();
  state.setValue(10);
  expect(state.getValue()).toBe(10);
});

test('test B', () => {
  const state = createCleanState();  // Fresh state
  state.setValue(20);
  expect(state.getValue()).toBe(20);
});
```

**Bad:**
```typescript
let sharedState = 0;  // ❌ Shared mutable state

test('test A', () => {
  sharedState = 10;  // Modifies global state
  expect(sharedState).toBe(10);
});

test('test B', () => {
  sharedState += 5;  // Depends on test A running first
  expect(sharedState).toBe(15);  // ❌ Will fail if run alone
});
```

**Why:**
- Tests should pass in any order
- `bun test --randomize` should not break tests
- Easier to debug individual tests
- Enables `--concurrent` for faster execution

## 5. Use `test.concurrent()` for Independent Async Tests

```typescript
// These can run in parallel - no shared state
test.concurrent('fetch user 1', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBeDefined();
});

test.concurrent('fetch user 2', async () => {
  const user = await fetchUser(2);
  expect(user.name).toBeDefined();
});

// Force sequential for tests with shared state
test.serial('create user', async () => {
  await db.insert({ id: 1, name: 'test' });
  expect(await db.count()).toBe(1);
});
```

**Run all tests concurrently:**
```bash
bun test --concurrent
bun test --concurrent --max-concurrency=4
```

## 6. Handle Async Operations Properly

```typescript
// ✅ Good: Return promise
test('async test', () => {
  return fetchData().then(data => {
    expect(data).toBeDefined();
  });
});

// ✅ Good: Use async/await
test('async test with await', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ Good: Assertion counting for async tests
test('async test with assertions', async () => {
  expect.hasAssertions(); // Ensures at least one assertion runs

  const data = await fetchData();
  expect(data).toBeDefined();
});

// ❌ Bad: Forgot to await
test('broken async test', async () => {
  fetchData().then(data => {
    expect(data).toBeDefined();  // Won't be checked!
  });
});

// ✅ Good: Exact assertion counting
test('exact assertion count', async () => {
  expect.assertions(2); // Must have exactly 2 assertions

  const data = await fetchData();
  expect(data).toBeDefined();
  expect(data.length).toBeGreaterThan(0);
});
```

## 7. Use `test.each()` for Parameterized Tests

**Array format:**
```typescript
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [5, 5, 10],
])('add(%d, %d) = %d', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});
```

**Table format (more readable):**
```typescript
test.each([
  { route: '/mcp/health', method: 'GET', shouldMatch: true },
  { route: '/invalid', method: 'GET', shouldMatch: false },
  { route: '/mcp/registry/@scope/name', method: 'POST', shouldMatch: false },
])('route $route with $method', ({ route, method, shouldMatch }) => {
  const match = router.match(route, method);
  expect(match !== null).toBe(shouldMatch);
});
```

## 8. Use Snapshots for Complex Structures

```typescript
test('API response structure', () => {
  const response = api.getHealth();

  // Snapshot captures exact structure
  expect(response).toMatchSnapshot();
});

test('with inline snapshot', () => {
  const stats = router.getStats();

  // Inline snapshot (written directly in test file)
  expect(stats).toMatchInlineSnapshot(`
    {
      "version": "2.4.1",
      "tier": "hardened",
      ...
    }
  `);
});
```

**Update snapshots:**
```bash
bun test -u
```

**When to use snapshots:**
- ✅ API response formats
- ✅ Generated code/HTML output
- ✅ Complex object structures
- ❌ Non-deterministic data (timestamps, IDs)
- ❌ Large outputs that change frequently

## 9. Set Appropriate Timeouts

```typescript
// Per-test timeout (30 seconds)
test('slow operation', async () => {
  await verySlowOperation();
  expect(true).toBe(true);
}, 30000);

// In bunfig.toml (global default)
[test]
timeout = 30000
```

**Default: 5000ms (5 seconds)**

## 10. Use `test.skip()` and `test.only()` Strategically

```typescript
// Skip during development
test.skip('work in progress', () => {
  // TODO: implement
});

// Skip conditionally
const shouldSkip = process.env.CI === 'true';
test.skipIf(shouldSkip)('flaky test', () => {
  // Might be flaky in CI
});

// Focus on specific test during debugging
test.only('debugging this', () => {
  // Only this test runs
});
```

**⚠️ Never commit `test.only()`** - it will prevent other tests from running!

### Advanced Conditional Test Execution

```typescript
const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

// Run only on macOS
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

// Conditional test suites
describe.if(isMacOS)("macOS-specific tests", () => {
  test("macOS feature", () => { /* ... */ });
});

describe.skipIf(isWindows)("Unix tests", () => {
  test("Unix feature", () => { /* ... */ });
});
```

### Test Retries and Repeats

```typescript
// Retry flaky tests up to 3 times
test(
  "unreliable network call",
  async () => {
    const response = await fetch("https://api.example.com");
    expect(response.ok).toBe(true);
  },
  { retry: 3 }
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

### Zombie Process Killer

Bun automatically terminates child processes spawned in timed-out tests:

```typescript
test('process operations', async () => {
  const process = Bun.spawn(['long-running-command']);
  // If test times out, Bun automatically kills the process
  await process.exited;
}, 5000); // 5 second timeout

// Processes are cleaned up automatically - no zombie processes!
```

### Type Testing with expectTypeOf

Test TypeScript types at compile-time:

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

<Note>Run `bunx tsc --noEmit` to verify type assertions.</Note>

## 11. Clean Up Resources

```typescript
test('file operations', async () => {
  const tempFile = await createTempFile();

  try {
    const content = await Bun.file(tempFile).text();
    expect(content).toBeDefined();
  } finally {
    // Always cleanup, even if test fails
    await Bun.write(tempFile, '');
    await fs.unlink(tempFile);
  }
});

// Better: Use afterEach
describe('File Tests', () => {
  let tempFiles: string[] = [];

  afterEach(async () => {
    // Cleanup all temp files
    await Promise.all(
      tempFiles.map(f => fs.unlink(f).catch(() => {}))
    );
    tempFiles = [];
  });

  test('create file', async () => {
    const file = await createTempFile();
    tempFiles.push(file);
    // Test logic...
  });
});
```

## 12. Use Meaningful Assertions

```typescript
// ✅ Good: Specific assertions
test('user validation', () => {
  const user = validateUser({ name: 'John', age: 30 });

  expect(user.name).toBe('John');
  expect(user.age).toBe(30);
  expect(user.isValid).toBe(true);
  expect(user.errors).toHaveLength(0);
});

// ❌ Bad: Generic assertions
test('user validation', () => {
  const user = validateUser({ name: 'John', age: 30 });

  expect(user).toBeTruthy();  // Not specific enough
  expect(user).toBeDefined();  // Doesn't verify correctness
});
```

## 13. Test Edge Cases and Error Conditions

```typescript
describe('Route Matching', () => {
  test('should match valid route', () => {
    const match = router.match('/mcp/health', 'GET');
    expect(match).toBeDefined();
  });

  test('should handle null for invalid route', () => {
    const match = router.match('/invalid', 'GET');
    expect(match).toBeNull();
  });

  test('should handle empty string route', () => {
    const match = router.match('', 'GET');
    expect(match).toBeNull();
  });

  test('should handle invalid HTTP method', () => {
    const match = router.match('/mcp/health', 'INVALID');
    expect(match).toBeNull();
  });

  test('should handle special characters in route', () => {
    const match = router.match('/mcp/registry/@scope/name', 'GET');
    expect(match?.params.scope).toBe('@scope');
  });
});
```

## 14. Run Tests in Different Modes

```bash
# Normal execution
bun test

# Watch mode (during development)
bun test --watch

# Randomized order (catch test interdependencies)
bun test --randomize

# Concurrent execution (faster)
bun test --concurrent

# Bail on first failure (faster feedback)
bun test --bail

# Filter by name
bun test -t "route matching"

# With coverage
bun test --coverage
```

## 15. Performance Testing Best Practices

```typescript
import { measurePerformance, assertPerformanceMetrics } from "harness";

test('route dispatch performance', async () => {
  const metrics = await measurePerformance(
    () => router.match('/mcp/health', 'GET'),
    10000,  // iterations
    1000    // warmup
  );

  // Use specific SLA assertions
  assertPerformanceMetrics(metrics, {
    maxMean: 0.03,   // 30μs average
    maxP99: 0.1,     // 100μs 99th percentile
  });
});
```

**Performance test guidelines:**
- Use warmup iterations to stabilize JIT
- Run GC before measurements: `await gcTick(10)`
- Use sufficient iterations (1000+) for statistical significance
- Test both hot and cold paths

## Project-Specific Patterns

### Import from Harness

```typescript
// ✅ Good
import { describe, test, expect, beforeAll } from "harness";

// ❌ Bad
import { describe, test, expect } from "bun:test";
```

### Performance Tests

```typescript
// Use the performance harness utilities
import { measurePerformance, assertPerformanceMetrics } from "harness";

test('meets SLA', async () => {
  const metrics = await measurePerformance(fn, 10000);
  assertPerformanceMetrics(metrics, { maxMean: 0.03 });
});
```

### Fixtures

```typescript
// Load test fixtures
import { loadFixture, mockRegistryConfig } from "harness";

test('with fixture', async () => {
  const config = await loadFixture('configs/minimal.toml');
  expect(config).toBeDefined();
});
```

## Anti-Patterns to Avoid

❌ **Don't use `test.only()` in commits**
❌ **Don't share mutable state between tests**
❌ **Don't forget to await async operations**
❌ **Don't write vague test names**
❌ **Don't snapshot non-deterministic data**
❌ **Don't test implementation details**
❌ **Don't write mega-tests that test everything**
❌ **Don't ignore flaky tests - fix them**
❌ **Don't overuse test retries - fix root causes**
❌ **Don't use `test.failing()` for tests you won't fix**
❌ **Don't rely on platform-specific tests for core functionality**
❌ **Don't forget to run `bunx tsc --noEmit` for type tests**
❌ **Don't create test dependencies that prevent concurrent execution**

## Resources

- [Bun Test Documentation](https://bun.sh/docs/test)
- [Bun Test Writing Guide](https://bun.sh/docs/test/writing)
- [Bun Test Retries & Repeats](https://bun.sh/docs/test/writing#retries-and-repeats)
- [Bun Conditional Tests](https://bun.sh/docs/test/writing#test-if)
- [Bun Type Testing](https://bun.sh/docs/test/writing#type-testing)
- [Project Testing Guide](./TESTING.md)
- [Test Suite Documentation](./test/README.md)
- [Advanced Test Patterns](./test/unit/core/advanced-features.test.ts)
