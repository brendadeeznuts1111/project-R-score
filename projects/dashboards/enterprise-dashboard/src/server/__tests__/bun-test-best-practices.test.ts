import { test, expect, beforeAll, afterEach, jest, vi, it, describe } from "bun:test";

test("NODE_ENV is automatically set to 'test'", () => {
  expect(process.env.NODE_ENV).toBe("test");
});

test("timezone defaults to UTC for consistent testing", () => {
  const date = new Date();
  expect(date.getTimezoneOffset()).toBe(0); // UTC has 0 offset
});

test("global test timeout can be overridden per test", () => {
  // This test has a custom 1-second timeout
}, 1000);

test("async tests work with proper error handling", async () => {
  const result = await Promise.resolve("success");
  expect(result).toBe("success");
}, 2000);

test("cleanup between tests prevents state pollution", () => {
  // Set a test variable
  process.env.TEST_VAR = "test-value";
  expect(process.env.TEST_VAR).toBe("test-value");
});

// Cleanup happens automatically via afterEach in test-setup.ts
test("environment is clean for next test", () => {
  expect(process.env.TEST_VAR).toBeUndefined();
});

// Demonstrate Bun test compatibility (globals available when imported)
test("Bun test functions are available when imported", () => {
  expect(test).toBeDefined();
  expect(it).toBeDefined(); // alias for test
  expect(describe).toBeDefined();
  expect(beforeAll).toBeDefined();
  expect(expect).toBeDefined();
});

test("Jest compatibility functions work when imported", () => {
  const mockFn = jest.fn();
  mockFn("test");
  expect(mockFn).toHaveBeenCalledWith("test");
});

test("Vitest compatibility functions work when imported", () => {
  const mockFn = vi.fn();
  mockFn("test");
  expect(mockFn).toHaveBeenCalledWith("test");
});