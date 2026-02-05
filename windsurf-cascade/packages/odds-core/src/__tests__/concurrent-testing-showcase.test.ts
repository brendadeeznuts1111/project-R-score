// packages/odds-core/src/__tests__/concurrent-testing-showcase.test.ts
// Comprehensive demonstration of Bun 1.3 concurrent testing features

import { test, expect, describe, mock, beforeAll, afterAll } from "bun:test";
import { expectTypeOf } from "bun:test";

// ===== CONCURRENT TESTING BASICS =====
describe.concurrent("Concurrent Testing Basics", () => {
  test.concurrent("fetch user 1", async () => {
    const startTime = Date.now();
    const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
    const duration = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThan(0);
    console.log(`User 1 fetched in ${duration}ms`);
  });

  test.concurrent("fetch user 2", async () => {
    const startTime = Date.now();
    const response = await fetch("https://jsonplaceholder.typicode.com/users/2");
    const duration = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThan(0);
    console.log(`User 2 fetched in ${duration}ms`);
  });

  test.concurrent("fetch user 3", async () => {
    const startTime = Date.now();
    const response = await fetch("https://jsonplaceholder.typicode.com/users/3");
    const duration = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThan(0);
    console.log(`User 3 fetched in ${duration}ms`);
  });

  // Serial test within concurrent describe
  test.serial("validation test", () => {
    console.log("Serial test executing...");
    expect(1 + 1).toBe(2);
    expect(2 + 2).toBe(4);
    console.log("Serial test completed");
  });
});

// ===== DATABASE SIMULATION =====
describe.concurrent("Database Operations", () => {
  let queryCount = 0;

  test.concurrent("simulates database query 1", async () => {
    queryCount++;
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queryCount).toBeGreaterThanOrEqual(1);
    console.log(`Database query 1 completed (count: ${queryCount})`);
  });

  test.concurrent("simulates database query 2", async () => {
    queryCount++;
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queryCount).toBeGreaterThanOrEqual(1);
    console.log(`Database query 2 completed (count: ${queryCount})`);
  });

  test.concurrent("simulates database query 3", async () => {
    queryCount++;
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queryCount).toBeGreaterThanOrEqual(1);
    console.log(`Database query 3 completed (count: ${queryCount})`);
  });

  test.concurrent("simulates database query 4", async () => {
    queryCount++;
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queryCount).toBeGreaterThanOrEqual(1);
    console.log(`Database query 4 completed (count: ${queryCount})`);
  });

  test.concurrent("simulates database query 5", async () => {
    queryCount++;
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queryCount).toBeGreaterThanOrEqual(1);
    console.log(`Database query 5 completed (count: ${queryCount})`);
  });

  test.serial("validates all queries completed", () => {
    expect(queryCount).toBe(5);
    console.log(`All ${queryCount} database queries validated`);
  });
});

// ===== CHAINED QUALIFIERS DEMONSTRATION =====
describe("Chained Qualifiers", () => {
  test.failing.each([1, 2, 3])("expected failure for value %i", (value) => {
    if (value > 0) {
      throw new Error(`Expected failure for value ${value}`);
    }
  });

  test.skip.each(["skipped1", "skipped2"])("skipped test for %s", (testCase) => {
    expect(true).toBe(true);
  });

  test.each([
    [10, 10, 100, "multiplication"],
    [5, 5, 25, "multiplication"],
    [2, 2, 4, "multiplication"]
  ])("%i * %i = %i (%s)", (a, b, expected, operation) => {
    expect(a * b).toBe(expected);
    expect(operation).toBe("multiplication");
  });
});

// ===== MOCK RETURN VALUE TESTING =====
describe("Mock Return Values", () => {
  test("demonstrates new mock return value matchers", () => {
    const mockFunction = mock((value: number) => value * 2);
    
    // Call the mock multiple times
    mockFunction(5);   // Returns 10
    mockFunction(10);  // Returns 20
    mockFunction(15);  // Returns 30
    
    // Test return values with new matchers
    expect(mockFunction).toHaveReturnedWith(10);
    expect(mockFunction).toHaveLastReturnedWith(30);
    expect(mockFunction).toHaveNthReturnedWith(1, 10);
    expect(mockFunction).toHaveNthReturnedWith(2, 20);
    expect(mockFunction).toHaveNthReturnedWith(3, 30);
    
    expect(mockFunction).toHaveBeenCalledTimes(3);
  });

  test("demonstrates complex mock scenarios", () => {
    const mockApi = mock();
    
    // Mock different return values
    mockApi.mockReturnValueOnce("first_call");
    mockApi.mockReturnValueOnce("second_call");
    mockApi.mockReturnValue("default_call");
    
    expect(mockApi()).toBe("first_call");
    expect(mockApi()).toBe("second_call");
    expect(mockApi()).toBe("default_call");
    expect(mockApi()).toBe("default_call"); // Uses last mock value
    
    // Verify return values
    expect(mockApi).toHaveNthReturnedWith(1, "first_call");
    expect(mockApi).toHaveNthReturnedWith(2, "second_call");
    expect(mockApi).toHaveLastReturnedWith("default_call");
  });
});

// ===== EXPECTED FAILURES (TDD) =====
describe("Expected Failures", () => {
  test.failing("known bug: division by zero", () => {
    function divide(a: number, b: number): number {
      return a / b;
    }
    
    // This currently fails but is expected to fail
    expect(divide(10, 0)).toBe(Infinity);
    // Remove .failing when the bug is fixed
  });

  test.failing("TDD: feature not yet implemented", () => {
    function newFeature(): string {
      throw new Error("Not implemented yet");
    }
    
    expect(newFeature()).toBe("working");
    // Remove .failing once you implement newFeature()
  });
});

// ===== PERFORMANCE COMPARISON =====
describe("Performance Comparison", () => {
  let concurrentStartTime: number;
  let sequentialResults: number[] = [];

  beforeAll(() => {
    concurrentStartTime = Date.now();
  });

  test.concurrent("concurrent operation 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    sequentialResults.push(1);
  });

  test.concurrent("concurrent operation 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    sequentialResults.push(2);
  });

  test.concurrent("concurrent operation 3", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    sequentialResults.push(3);
  });

  test.concurrent("concurrent operation 4", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    sequentialResults.push(4);
  });

  test.concurrent("concurrent operation 5", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    sequentialResults.push(5);
  });

  test("measures concurrent performance", () => {
    const concurrentDuration = Date.now() - concurrentStartTime;
    console.log(`Concurrent execution time: ${concurrentDuration}ms`);
    
    // With 5 concurrent 50ms operations, total should be much less than 250ms
    expect(concurrentDuration).toBeGreaterThan(50);
    expect(concurrentDuration).toBeLessThan(200); // Allow some overhead
    
    // All operations should have completed
    expect(sequentialResults).toHaveLength(5);
    expect(sequentialResults).toContain(1);
    expect(sequentialResults).toContain(2);
    expect(sequentialResults).toContain(3);
    expect(sequentialResults).toContain(4);
    expect(sequentialResults).toContain(5);
  });
});

// ===== SHARED STATE MANAGEMENT =====
describe.concurrent("Shared State Management", () => {
  let sharedCounter = 0;
  let operationLog: string[] = [];

  test.concurrent("independent operation 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    operationLog.push("independent1");
    expect(true).toBe(true);
  });

  test.concurrent("independent operation 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    operationLog.push("independent2");
    expect(true).toBe(true);
  });

  test.serial("sequential state modification 1", () => {
    sharedCounter++;
    operationLog.push("sequential1");
    expect(sharedCounter).toBe(1);
  });

  test.serial("sequential state modification 2", () => {
    sharedCounter++;
    operationLog.push("sequential2");
    expect(sharedCounter).toBe(2);
  });

  test.serial("sequential state modification 3", () => {
    sharedCounter++;
    operationLog.push("sequential3");
    expect(sharedCounter).toBe(3);
  });

  test.concurrent("independent operation 3", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    operationLog.push("independent3");
    expect(true).toBe(true);
  });

  test("validates execution order and state", () => {
    console.log("Operation log:", operationLog);
    console.log("Final counter:", sharedCounter);
    
    // Sequential operations should maintain order
    const seq1Index = operationLog.indexOf("sequential1");
    const seq2Index = operationLog.indexOf("sequential2");
    const seq3Index = operationLog.indexOf("sequential3");
    
    expect(seq1Index).toBeLessThan(seq2Index);
    expect(seq2Index).toBeLessThan(seq3Index);
    
    // All operations should be present
    expect(operationLog).toContain("independent1");
    expect(operationLog).toContain("independent2");
    expect(operationLog).toContain("independent3");
    expect(operationLog).toContain("sequential1");
    expect(operationLog).toContain("sequential2");
    expect(operationLog).toContain("sequential3");
    
    // Final state should be correct
    expect(sharedCounter).toBe(3);
  });
});

// ===== TYPE TESTING DEMONSTRATION =====
describe("Type Testing", () => {
  test("demonstrates expectTypeOf", () => {
    // Basic type equality
    expectTypeOf<string>().toEqualTypeOf<string>();
    expectTypeOf<number>().toEqualTypeOf<number>();
    
    // Object properties
    expectTypeOf({ foo: 1 }).toHaveProperty("foo");
    expectTypeOf({ foo: 1 }).not.toHaveProperty("bar");
    
    // Promise types
    expectTypeOf<Promise<number>>().resolves.toBeNumber();
    expectTypeOf<Promise<string>>().resolves.toBeString();
    
    // Array types
    expectTypeOf<number[]>().toBeArray();
    expectTypeOf<string[]>().toBeArray();
    
    // Function types
    expectTypeOf<() => void>().toBeFunction();
    expectTypeOf<(x: number) => string>().toBeFunction();
    
    // Union types
    expectTypeOf<string | number>().toEqualTypeOf<string | number>();
    expectTypeOf<string>().toMatchTypeOf<string | number>();
  });
});

// ===== REAL-WORLD API TESTING =====
describe.concurrent("Real-World API Testing", () => {
  const apiResults: any[] = [];

  test.concurrent("fetches posts from API", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
    expect(response.status).toBe(200);
    
    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('body');
    
    apiResults.push({ type: 'post', id: post.id });
  });

  test.concurrent("fetches comments from API", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/comments/1");
    expect(response.status).toBe(200);
    
    const comment = await response.json();
    expect(comment).toHaveProperty('id');
    expect(comment).toHaveProperty('email');
    expect(comment).toHaveProperty('body');
    
    apiResults.push({ type: 'comment', id: comment.id });
  });

  test.concurrent("fetches albums from API", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/albums/1");
    expect(response.status).toBe(200);
    
    const album = await response.json();
    expect(album).toHaveProperty('id');
    expect(album).toHaveProperty('title');
    
    apiResults.push({ type: 'album', id: album.id });
  });

  test.serial("validates all API results", () => {
    expect(apiResults).toHaveLength(3);
    
    const types = apiResults.map(r => r.type);
    expect(types).toContain('post');
    expect(types).toContain('comment');
    expect(types).toContain('album');
    
    console.log("API Results:", apiResults);
  });
});
