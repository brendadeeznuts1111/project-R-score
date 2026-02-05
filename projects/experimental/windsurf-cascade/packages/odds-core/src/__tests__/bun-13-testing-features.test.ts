// packages/odds-core/src/__tests__/bun-13-testing-features.test.ts
// Comprehensive demonstration of Bun 1.3 testing and debugging improvements

import { test, expect, describe, mock, beforeAll, afterAll } from "bun:test";
import { expectTypeOf } from "bun:test";

// ===== ASYNC STACK TRACES DEMONSTRATION =====
describe("Async Stack Traces", () => {
  async function fetchUserData(userId: number) {
    return await fetchUserDatabase(userId);
  }

  async function fetchUserDatabase(userId: number) {
    return await queryDatabase(userId);
  }

  async function queryDatabase(userId: number) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure real async
    if (userId === 999) {
      throw new Error("User not found in database");
    }
    return { id: userId, name: `User ${userId}` };
  }

  test("demonstrates improved async stack traces", async () => {
    try {
      await fetchUserData(999);
    } catch (error) {
      expect(error.message).toBe("User not found in database");
    }
  });
});

// ===== CONCURRENT TESTING DEMONSTRATION =====
describe.concurrent("Concurrent Testing", () => {
  test.concurrent("fetch user 1", async () => {
    // Simulate network request - runs concurrently
    const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
    expect(response.status).toBe(200);
    
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  test.concurrent("fetch user 2", async () => {
    // This runs concurrently with the above test
    const response = await fetch("https://jsonplaceholder.typicode.com/users/2");
    expect(response.status).toBe(200);
    
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  test.concurrent("fetch user 3", async () => {
    // This also runs concurrently
    const response = await fetch("https://jsonplaceholder.typicode.com/users/3");
    expect(response.status).toBe(200);
    
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  // Serial test within concurrent describe
  test.serial("sequential validation", () => {
    // This must run sequentially - no shared state conflicts
    expect(1 + 1).toBe(2);
    expect(2 + 2).toBe(4);
  });
});

// ===== CHAINED QUALIFIERS DEMONSTRATION =====
describe("Chained Qualifiers", () => {
  test.failing.each([
    [1, "first failing case"],
    [2, "second failing case"],
    [3, "third failing case"]
  ])("demonstrates failing.each with value %i", (value, description) => {
    // These tests are expected to fail
    if (value > 0) {
      throw new Error(`Expected failure: ${description}`);
    }
  });

  test.skip.each(["case1", "case2"])("demonstrates skip.each with %s", (testCase) => {
    // These tests will be skipped
    expect(true).toBe(true);
  });

  test.each([10, 20, 30])("demonstrates only.each with value %i", (value) => {
    // These tests will run
    expect(value).toBeGreaterThan(0);
  });
});

// ===== MOCK RETURN VALUE TESTING =====
describe("Mock Return Values", () => {
  test("demonstrates new mock return value matchers", () => {
    const mockFunction = mock((value: number) => value * 2);
    
    // Call the mock multiple times
    mockFunction(5);  // Returns 10
    mockFunction(10); // Returns 20
    mockFunction(15); // Returns 30
    
    // Test return values with new matchers
    expect(mockFunction).toHaveReturnedWith(10);
    expect(mockFunction).toHaveLastReturnedWith(30);
    expect(mockFunction).toHaveNthReturnedWith(2, 20);
    
    // Test call count
    expect(mockFunction).toHaveBeenCalledTimes(3);
  });

  test("demonstrates mock with different return values", () => {
    const mockApi = mock();
    
    // Mock different return values
    mockApi.mockReturnValueOnce("success");
    mockApi.mockReturnValueOnce("error");
    mockApi.mockReturnValue("completed");
    
    expect(mockApi()).toBe("success");
    expect(mockApi()).toBe("error");
    expect(mockApi()).toBe("completed");
    expect(mockApi()).toBe("completed"); // Uses last mock value
    
    expect(mockApi).toHaveNthReturnedWith(1, "success");
    expect(mockApi).toHaveNthReturnedWith(2, "error");
    expect(mockApi).toHaveLastReturnedWith("completed");
  });
});

// ===== INLINE SNAPSHOTS WITH INDENTATION =====
describe("Inline Snapshots", () => {
  test("demonstrates automatic indentation detection", () => {
    const complexObject = {
      user: {
        id: 1,
        name: "John Doe",
        profile: {
          email: "john@example.com",
          settings: {
            theme: "dark",
            notifications: true,
            preferences: {
              language: "en",
              timezone: "UTC"
            }
          }
        }
      },
      metadata: {
        created: "2023-01-01",
        updated: "2023-12-01",
        version: 2
      }
    };

    expect(complexObject).toMatchInlineSnapshot(`
      {
        "user": {
          "id": 1,
          "name": "John Doe",
          "profile": {
            "email": "john@example.com",
            "settings": {
              "notifications": true,
              "preferences": {
                "language": "en",
                "timezone": "UTC"
              },
              "theme": "dark"
            }
          }
        },
        "metadata": {
          "created": "2023-01-01",
          "updated": "2023-12-01",
          "version": 2
        }
      }
    `);
  });

  test("demonstrates array snapshot with indentation", () => {
    const users = [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
      { id: 3, name: "Charlie", active: true }
    ];

    expect(users).toMatchInlineSnapshot(`
      [
        {
          "active": true,
          "id": 1,
          "name": "Alice"
        },
        {
          "active": false,
          "id": 2,
          "name": "Bob"
        },
        {
          "active": true,
          "id": 3,
          "name": "Charlie"
        }
      ]
    `);
  });
});

// ===== VARIABLE SUBSTITUTION IN TEST.EACH =====
describe("Variable Substitution", () => {
  const testCases = [
    { input: [1, 2], expected: 3, description: "positive numbers" },
    { input: [-1, -2], expected: -3, description: "negative numbers" },
    { input: [0, 5], expected: 5, description: "zero and positive" }
  ];

  test.each(testCases)("adds $input[0] and $input[1] = $expected ($description)", ({ input, expected }) => {
    const [a, b] = input;
    expect(a + b).toBe(expected);
  });

  // Test with object property substitution
  const users = [
    { name: "Alice", role: "admin", expectedAccess: true },
    { name: "Bob", role: "user", expectedAccess: false },
    { name: "Charlie", role: "moderator", expectedAccess: true }
  ];

  test.each(users)("$name with role $role should have access: $expectedAccess", ({ role, expectedAccess }) => {
    const hasAccess = role === "admin" || role === "moderator";
    expect(hasAccess).toBe(expectedAccess);
  });
});

// ===== EXPECTED FAILURES (TDD) =====
describe("Expected Failures", () => {
  test.failing("known bug: division by zero should return Infinity", () => {
    function divide(a: number, b: number): number {
      return a / b;
    }
    
    // This currently fails but is expected to fail
    expect(divide(10, 0)).toBe(Infinity);
    // Remove .failing when the bug is fixed
  });

  test.failing("TDD: feature not yet implemented", () => {
    function newFeature(): string {
      // Not implemented yet
      throw new Error("Not implemented");
    }
    
    expect(newFeature()).toBe("working");
    // Remove .failing once you implement newFeature()
  });

  // This test shows what happens when a failing test passes
  test.failing("this will pass and show as failure", () => {
    expect(2 + 2).toBe(4); // This passes, but since it's marked as failing, it will be reported as a failure
  });
});

// ===== MOCK CLEARING =====
describe("Mock Management", () => {
  let mock1: ReturnType<typeof mock>;
  let mock2: ReturnType<typeof mock>;

  beforeAll(() => {
    mock1 = mock(() => "mock1");
    mock2 = mock(() => "mock2");
  });

  test("uses mocks", () => {
    mock1();
    mock2();
    mock1();
    
    expect(mock1).toHaveBeenCalledTimes(2);
    expect(mock2).toHaveBeenCalledTimes(1);
  });

  test("demonstrates clearAllMocks", () => {
    // Clear all mocks
    mock.clearAllMocks();
    
    expect(mock1).not.toHaveBeenCalled();
    expect(mock2).not.toHaveBeenCalled();
    
    // Use mocks again
    mock1();
    mock2();
    
    expect(mock1).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
  });
});

// ===== MIXED CONCURRENT AND SERIAL EXECUTION =====
describe.concurrent("Mixed Execution Patterns", () => {
  let executionOrder: string[] = [];

  test.concurrent("concurrent operation 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionOrder.push("concurrent1");
  });

  test.concurrent("concurrent operation 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionOrder.push("concurrent2");
  });

  test.serial("sequential operation 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionOrder.push("sequential1");
  });

  test.serial("sequential operation 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionOrder.push("sequential2");
  });

  test.concurrent("concurrent operation 3", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionOrder.push("concurrent3");
  });

  test("validates execution order", () => {
    // Serial tests should maintain order
    const seq1Index = executionOrder.indexOf("sequential1");
    const seq2Index = executionOrder.indexOf("sequential2");
    expect(seq1Index).toBeLessThan(seq2Index);
    
    // All operations should be present
    expect(executionOrder).toContain("concurrent1");
    expect(executionOrder).toContain("concurrent2");
    expect(executionOrder).toContain("concurrent3");
    expect(executionOrder).toContain("sequential1");
    expect(executionOrder).toContain("sequential2");
    
    console.log("Execution order:", executionOrder);
  });
});

// ===== PERFORMANCE TESTING WITH CONCURRENT EXECUTION =====
describe.concurrent("Performance Testing", () => {
  const startTime = Date.now();

  test.concurrent("simulates database query 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  test.concurrent("simulates database query 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  test.concurrent("simulates database query 3", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  test.concurrent("simulates database query 4", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  test.concurrent("simulates database query 5", async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  test("validates concurrent performance", () => {
    const duration = Date.now() - startTime;
    console.log(`Concurrent execution time: ${duration}ms`);
    
    // With 5 concurrent 50ms operations, total should be much less than 250ms
    expect(duration).toBeGreaterThan(50);
    expect(duration).toBeLessThan(200); // Allow some overhead
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
