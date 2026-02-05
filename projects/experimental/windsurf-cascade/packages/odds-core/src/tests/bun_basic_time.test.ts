// packages/odds-core/src/tests/bun-basic-time-test.ts - Core Bun Time Testing Pattern

import { test, expect, setSystemTime, beforeAll, afterAll, describe } from "bun:test";

// Test 1: Exact Bun documentation example
test("party like it's 1999", () => {
  const date = new Date("1999-01-01T00:00:00.000Z");
  setSystemTime(date); // it's now January 1, 1999

  const now = new Date();
  expect(now.getFullYear()).toBe(1999);
  expect(now.getMonth()).toBe(0); // January (0-indexed)
  expect(now.getDate()).toBe(1);
  
  // Reset after test
  setSystemTime();
});

// Test 2: Demonstrate deterministic behavior
test("deterministic timestamps", () => {
  const fixedDate = new Date("2024-01-15T09:30:00.000Z");
  setSystemTime(fixedDate);

  const timestamp1 = Date.now();
  const timestamp2 = new Date().getTime();
  const timestamp3 = fixedDate.getTime();

  expect(timestamp1).toBe(timestamp2);
  expect(timestamp2).toBe(timestamp3);
  expect(timestamp1).toBe(1705311000000); // Exact timestamp for 2024-01-15T09:30:00.000Z

  setSystemTime();
});

// Test 3: Multiple time scenarios in same test
test("multiple time scenarios", () => {
  // Scenario 1: Market open
  setSystemTime(new Date("2024-01-15T14:30:00.000Z")); // 9:30 AM EST in UTC
  let now = new Date();
  expect(now.getUTCHours()).toBe(14);
  expect(now.getUTCMinutes()).toBe(30);

  // Scenario 2: Market close
  setSystemTime(new Date("2024-01-15T21:00:00.000Z")); // 4:00 PM EST in UTC
  now = new Date();
  expect(now.getUTCHours()).toBe(21);
  expect(now.getUTCMinutes()).toBe(0);

  // Scenario 3: After hours
  setSystemTime(new Date("2024-01-16T02:00:00.000Z")); // 9:00 PM EST in UTC
  now = new Date();
  expect(now.getUTCHours()).toBe(2);
  expect(now.getDate()).toBe(16);

  // Reset
  setSystemTime();
});

// Test 4: Using with lifecycle hooks
describe("Time testing with lifecycle hooks", () => {
  beforeAll(() => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    setSystemTime(date); // Set for all tests in this describe block
  });

  afterAll(() => {
    setSystemTime(); // Reset after all tests
  });

  test("all tests see the same time", () => {
    const now = new Date();
    expect(now.getFullYear()).toBe(2024);
    expect(now.getMonth()).toBe(0);
    expect(now.getDate()).toBe(1);
  });

  test("time consistency across tests", () => {
    const timestamp = Date.now();
    expect(timestamp).toBe(1704067200000); // 2024-01-01T00:00:00.000Z
  });
});

// Test 5: Edge cases
test("time testing edge cases", () => {
  // Test with a more recent date that works reliably
  setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
  expect(new Date().getFullYear()).toBe(2000);

  // Future date
  setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  expect(new Date().getFullYear()).toBe(2025);

  // Reset to present
  setSystemTime();
  expect(new Date().getFullYear()).toBeGreaterThan(2024);
});
