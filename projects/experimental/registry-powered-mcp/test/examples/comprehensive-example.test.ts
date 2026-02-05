/**
 * Comprehensive Test Example
 * Demonstrates all advanced Bun testing features
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "harness";

// ============================================================================
// test.each with Arrays
// ============================================================================

describe("test.each with arrays", () => {
  test.each([
    [1, 2, 3],
    [2, 3, 5],
    [5, 5, 10],
    [10, 20, 30],
  ])("add(%d, %d) should equal %d", (a, b, expected) => {
    expect(a + b).toBe(expected);
  });

  test.each([
    [0.1, 0.2, 0.3],
    [1.5, 2.5, 4.0],
  ])("%f + %f ≈ %f", (a, b, expected) => {
    expect(a + b).toBeCloseTo(expected, 1);
  });
});

// ============================================================================
// test.each with Table Format
// ============================================================================

describe("test.each with table format", () => {
  test.each([
    { input: "hello", expected: 5 },
    { input: "world", expected: 5 },
    { input: "test", expected: 4 },
    { input: "", expected: 0 },
  ])("'$input' has length $expected", ({ input, expected }) => {
    expect(input.length).toBe(expected);
  });

  test.each([
    { str: "hello", char: "l", count: 2 },
    { str: "world", char: "o", count: 1 },
    { str: "test", char: "x", count: 0 },
  ])(
    "'$str' contains '$char' $count times",
    ({ str, char, count }) => {
      const matches = str.split("").filter((c) => c === char).length;
      expect(matches).toBe(count);
    }
  );
});

// ============================================================================
// describe.each
// ============================================================================

describe.each([
  { env: "development", timeout: 5000 },
  { env: "production", timeout: 10000 },
  { env: "testing", timeout: 1000 },
])("$env environment", ({ env, timeout }) => {
  test("should have appropriate timeout", () => {
    expect(timeout).toBeGreaterThan(0);
  });

  test("should have valid environment name", () => {
    expect(["development", "production", "testing"]).toContain(env);
  });
});

// ============================================================================
// Format Specifiers
// ============================================================================

describe("format specifiers", () => {
  // %d - integer
  test.each([
    [1, 2],
    [10, 20],
    [100, 200],
  ])("%d is less than %d", (a, b) => {
    expect(a).toBeLessThan(b);
  });

  // %s - string
  test.each([
    ["hello"],
    ["world"],
  ])("string %s is defined", (str) => {
    expect(str).toBeDefined();
  });

  // %j - JSON
  test.each([
    [{ name: "Alice", age: 30 }],
    [{ name: "Bob", age: 25 }],
  ])("user %j is valid", (user) => {
    expect(user.name).toBeDefined();
    expect(user.age).toBeGreaterThan(0);
  });

  // %# - index
  test.each([["first"], ["second"], ["third"]])(
    "test case %# with value %s",
    (value) => {
      expect(value).toBeDefined();
    }
  );
});

// ============================================================================
// Assertion Counting
// ============================================================================

describe("assertion counting", () => {
  test("expect.hasAssertions() ensures at least one assertion", () => {
    expect.hasAssertions();

    const shouldRun = true;
    if (shouldRun) {
      expect(true).toBe(true);
    }
    // If shouldRun is false, test would fail
  });

  test("expect.assertions(n) ensures exact count", () => {
    expect.assertions(3);

    const items = [1, 2, 3];
    items.forEach((item) => {
      expect(item).toBeGreaterThan(0);
    });
    // Must have exactly 3 assertions
  });

  test("works with loops", () => {
    expect.assertions(5);

    for (let i = 0; i < 5; i++) {
      expect(i).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// test.failing - Expected Failures
// ============================================================================

describe("test.failing examples", () => {
  test.failing("known bug with edge case", () => {
    // This test is expected to fail
    const result = "buggy behavior";
    expect(result).toBe("correct behavior");
    // Test PASSES if it fails, FAILS if it passes
  });

  test.failing.each([
    { input: 1, expected: 2 },
    { input: 2, expected: 4 },
  ])("known issue with input $input", ({ input, expected }) => {
    expect(input * 3).toBe(expected); // Currently multiplies by 2 instead of 3
  });
});

// ============================================================================
// test.todo - Planned Tests
// ============================================================================

describe("test.todo examples", () => {
  test.todo("implement user authentication");
  test.todo("add rate limiting");

  test.todo("validate API responses", () => {
    // This won't be executed, just marked as TODO
    expect(true).toBe(true);
  });

  test.todo.each([
    { feature: "OAuth2" },
    { feature: "2FA" },
    { feature: "Password reset" },
  ])("implement $feature");
});

// ============================================================================
// Grouping with Lifecycle Hooks
// ============================================================================

describe("lifecycle hooks demonstration", () => {
  let setupValue: number;
  let testCount: number;

  beforeAll(() => {
    // Runs ONCE before all tests in this describe
    setupValue = 100;
    testCount = 0;
  });

  beforeEach(() => {
    // Runs BEFORE each test
    testCount++;
  });

  afterEach(() => {
    // Runs AFTER each test
    // Could cleanup test-specific resources
  });

  afterAll(() => {
    // Runs ONCE after all tests complete
    expect(testCount).toBeGreaterThan(0);
  });

  test("first test", () => {
    expect(setupValue).toBe(100);
    expect(testCount).toBe(1);
  });

  test("second test", () => {
    expect(setupValue).toBe(100);
    expect(testCount).toBe(2);
  });

  describe("nested group", () => {
    beforeEach(() => {
      // Runs after parent beforeEach
    });

    test("nested test", () => {
      expect(setupValue).toBe(100);
      expect(testCount).toBe(3);
    });
  });
});

// ============================================================================
// Complete Real-World Example
// ============================================================================

describe("Router Integration Tests", () => {
  // Simulated router for example
  const mockRouter = {
    match: (route: string, method: string) => {
      if (route === "/mcp/health" && method === "GET") {
        return { route: { target: "health" }, params: {} };
      }
      if (route.startsWith("/mcp/registry/") && method === "GET") {
        const parts = route.split("/");
        return {
          route: { target: "registry" },
          params: { name: parts[parts.length - 1] },
        };
      }
      return null;
    },
  };

  describe("route matching", () => {
    test.each([
      { route: "/mcp/health", method: "GET", shouldMatch: true },
      { route: "/invalid", method: "GET", shouldMatch: false },
      { route: "/mcp/registry/pkg", method: "GET", shouldMatch: true },
      { route: "/mcp/registry/pkg", method: "POST", shouldMatch: false },
    ])(
      "$route with $method -> $shouldMatch",
      ({ route, method, shouldMatch }) => {
        const match = mockRouter.match(route, method);
        expect(match !== null).toBe(shouldMatch);
      }
    );
  });

  describe("parameter extraction", () => {
    test("should extract package name", () => {
      expect.assertions(2);

      const match = mockRouter.match("/mcp/registry/test-pkg", "GET");

      expect(match).not.toBeNull();
      expect(match?.params.name).toBe("test-pkg");
    });
  });

  // Known limitation
  test.failing("regex routes not yet supported", () => {
    const match = mockRouter.match("/api/v1/users/123", "GET");
    expect(match?.params.id).toBe("123");
  });

  // Future feature
  test.todo("implement wildcard route matching");
  test.todo("add route priority/ordering");
});

// ============================================================================
// Skipped and Only Tests
// ============================================================================

describe("test control", () => {
  test("normal test", () => {
    expect(true).toBe(true);
  });

  test.skip("skipped test", () => {
    // This won't run
    expect(false).toBe(true);
  });

  // Uncomment to run only this test
  // test.only("focused test", () => {
  //   expect(true).toBe(true);
  // });
});
