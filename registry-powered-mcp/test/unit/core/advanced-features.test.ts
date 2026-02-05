/**
 * Advanced Bun Test Features Demo
 * Demonstrates Bun-specific test capabilities
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from "harness";

describe("Advanced Bun Test Features", () => {
  // Basic test
  test("basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  // Async test
  test("async operations", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  // Test with custom timeout (30 seconds)
  test(
    "long running operation",
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(true).toBe(true);
    },
    30000
  );

  // Skip tests during development
  test.skip("work in progress", () => {
    // This test will be skipped
    expect(false).toBe(true);
  });

  // Run only specific tests during debugging
  // Uncomment to run only this test
  // test.only("focused test", () => {
  //   expect(true).toBe(true);
  // });

  // Mark tests as TODO
  test.todo("implement feature X", () => {
    // TODO: implement this feature
  });

  // Parameterized tests with test.each
  test.each([
    [1, 2, 3],
    [2, 3, 5],
    [5, 5, 10],
  ])("add(%d, %d) should equal %d", (a, b, expected) => {
    expect(a + b).toBe(expected);
  });

  // Table-based tests
  test.each([
    { input: "hello", expected: 5 },
    { input: "world", expected: 5 },
    { input: "test", expected: 4 },
  ])("$input has length $expected", ({ input, expected }) => {
    expect(input.length).toBe(expected);
  });

  // Concurrent test execution (runs in parallel)
  test.concurrent("parallel test 1", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });

  test.concurrent("parallel test 2", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });

  // Force serial execution even with --concurrent flag
  test.serial("sequential test", () => {
    // This runs sequentially even if --concurrent is set
    expect(1).toBe(1);
  });
});

describe("Lifecycle Hooks", () => {
  let setupValue: number;

  // Runs once before all tests in this describe block
  beforeAll(() => {
    setupValue = 100;
  });

  // Runs before each test
  beforeEach(() => {
    // Reset or prepare state before each test
  });

  // Runs after each test
  afterEach(() => {
    // Cleanup after each test
  });

  // Runs once after all tests in this describe block
  afterAll(() => {
    // Final cleanup
  });

  test("uses setup value", () => {
    expect(setupValue).toBe(100);
  });
});

describe("Matchers", () => {
  test("equality matchers", () => {
    expect(1).toBe(1);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect({ a: 1, b: 2 }).toStrictEqual({ a: 1, b: 2 });
  });

  test("truthiness matchers", () => {
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect(1).toBeDefined();
  });

  test("number matchers", () => {
    expect(10).toBeGreaterThan(5);
    expect(10).toBeGreaterThanOrEqual(10);
    expect(5).toBeLessThan(10);
    expect(5).toBeLessThanOrEqual(5);
    expect(0.1 + 0.2).toBeCloseTo(0.3);
  });

  test("string matchers", () => {
    expect("hello world").toContain("world");
    expect("test@example.com").toMatch(/.*@.*/);
  });

  test("array matchers", () => {
    expect([1, 2, 3]).toContain(2);
    expect([1, 2, 3]).toHaveLength(3);
    expect([1, 2, 3]).toBeArray();
  });

  test("object matchers", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(obj).toHaveProperty("a");
    expect(obj).toHaveProperty("a", 1);
    expect(obj).toMatchObject({ a: 1, b: 2 });
  });

  test("error matchers", () => {
    const throwError = () => {
      throw new Error("test error");
    };

    expect(throwError).toThrow();
    expect(throwError).toThrow("test error");
    expect(throwError).toThrow(/test/);
    expect(throwError).toThrow(Error);
  });

  test("negation", () => {
    expect(1).not.toBe(2);
    expect([1, 2, 3]).not.toContain(4);
  });
});
