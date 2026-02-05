// packages/odds-core/src/__tests__/concurrent-serial-example.test.ts
// Example demonstrating test.serial for sequential execution within concurrent suites

import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe.concurrent("Concurrent Test Suite with Sequential Tests", () => {
  let sharedCounter = 0;
  let sharedState: Map<string, any> = new Map();

  beforeAll(() => {
    console.log("Setting up shared state...");
    sharedState.clear();
  });

  afterAll(() => {
    console.log("Cleaning up shared state...");
    sharedState.clear();
  });

  test("concurrent test #1 - Independent operation", async () => {
    // This test can run concurrently with others
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(1 + 1).toBe(2);
  });

  test("concurrent test #2 - Another independent operation", async () => {
    // This test can also run concurrently
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(2 + 2).toBe(4);
  });

  test.serial("sequential test #1 - Shared state modification", async () => {
    // This test must run sequentially to avoid race conditions
    sharedCounter++;
    expect(sharedCounter).toBe(1);
    
    // Write to shared state
    sharedState.set("counter", sharedCounter);
    const readValue = sharedState.get("counter");
    expect(readValue).toBe(1);
  });

  test.serial("sequential test #2 - Depends on previous state", async () => {
    // This test depends on the previous test's state
    sharedCounter++;
    expect(sharedCounter).toBe(2);
    
    // Read and update shared state
    const currentValue = sharedState.get("counter");
    expect(currentValue).toBe(1);
    
    sharedState.set("counter", sharedCounter);
    const newValue = sharedState.get("counter");
    expect(newValue).toBe(2);
  });

  test.serial("sequential test #3 - Cleanup and validation", async () => {
    // This test cleans up and validates final state
    sharedCounter++;
    expect(sharedCounter).toBe(3);
    
    const finalValue = sharedState.get("counter");
    expect(finalValue).toBe(2);
    
    // Reset for next test suite
    sharedCounter = 0;
    sharedState.delete("counter");
  });

  test("concurrent test #3 - Can run independently", () => {
    // This test doesn't depend on shared state and can run concurrently
    const operations = Array.from({ length: 5 }, (_, i) => i * 10);
    const results = operations.map(x => x + 5);
    expect(results).toEqual([5, 15, 25, 35, 45]);
  });

  test.serial("file operations - must be sequential", async () => {
    // File operations often need to be sequential to avoid conflicts
    const testFile = '/tmp/test-sequential.txt';
    
    // Write initial content
    await Bun.write(testFile, 'initial content');
    const content1 = await Bun.file(testFile).text();
    expect(content1).toBe('initial content');
    
    // Append content (create new file with combined content)
    const existingContent = await Bun.file(testFile).text();
    await Bun.write(testFile, existingContent + ' + appended');
    const content2 = await Bun.file(testFile).text();
    expect(content2).toBe('initial content + appended');
    
    // Cleanup
    await Bun.file(testFile).delete();
  });

  test("memory-intensive operation - can be concurrent", () => {
    // This test uses memory but doesn't share state
    const largeArray = Array.from({ length: 10000 }, (_, i) => i);
    const sum = largeArray.reduce((a, b) => a + b, 0);
    expect(sum).toBe((9999 * 10000) / 2); // Sum of 0 to 9999
  });
});

describe.concurrent("Another Concurrent Suite", () => {
  test("independent concurrent test", () => {
    expect(Math.random()).toBeGreaterThanOrEqual(0);
    expect(Math.random()).toBeLessThan(1);
  });

  test.serial("sequential validation in separate suite", () => {
    // Even in a different concurrent suite, this runs sequentially
    const steps = ['step1', 'step2', 'step3'];
    steps.forEach(step => {
      expect(step).toMatch(/^step\d+$/);
    });
  });
});

// Example of when to use test.serial:
describe.concurrent("Real-world Scenarios for test.serial", () => {
  let tempDir: string;
  let operationOrder: string[] = [];

  beforeAll(() => {
    tempDir = `/tmp/test-serial-${Date.now()}`;
    operationOrder = [];
  });

  test.concurrent("CPU-bound computation", () => {
    // Can run concurrently - no shared state
    const result = Array.from({ length: 1000 }, (_, i) => Math.sqrt(i));
    expect(result).toHaveLength(1000);
    operationOrder.push("cpu-computation");
  });

  test.serial("File system operations must be sequential", async () => {
    // File system operations should be sequential to avoid conflicts
    operationOrder.push("file-start");
    
    await Bun.write(`${tempDir}/file1.txt`, 'content1');
    await Bun.write(`${tempDir}/file2.txt`, 'content2');
    
    const content1 = await Bun.file(`${tempDir}/file1.txt`).text();
    const content2 = await Bun.file(`${tempDir}/file2.txt`).text();
    
    expect(content1).toBe('content1');
    expect(content2).toBe('content2');
    
    // Cleanup
    await Bun.file(`${tempDir}/file1.txt`).delete();
    await Bun.file(`${tempDir}/file2.txt`).delete();
    
    operationOrder.push("file-end");
  });

  test.serial("Database transaction sequence", async () => {
    // Database transactions often need ordering
    operationOrder.push("db-start");
    
    const mockDB = {
      transactions: [] as string[],
      execute: async (sql: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        mockDB.transactions.push(sql);
      }
    };

    await mockDB.execute("BEGIN");
    await mockDB.execute("INSERT INTO users VALUES (1, 'test')");
    await mockDB.execute("UPDATE users SET name = 'updated' WHERE id = 1");
    await mockDB.execute("COMMIT");

    expect(mockDB.transactions).toEqual([
      "BEGIN",
      "INSERT INTO users VALUES (1, 'test')",
      "UPDATE users SET name = 'updated' WHERE id = 1",
      "COMMIT"
    ]);
    
    operationOrder.push("db-end");
  });

  test.concurrent("Network request simulation can be concurrent", async () => {
    // Network requests can often run concurrently
    operationOrder.push("network-start");
    
    await new Promise(resolve => setTimeout(resolve, 25)); // Shorter delay
    expect(true).toBe(true); // Simulate successful network request
    
    operationOrder.push("network-end");
  });

  test("operation order validation", () => {
    // This test runs after all others and validates the execution order
    console.log("Operation order:", operationOrder);
    
    // Sequential operations should maintain order
    const fileStartIndex = operationOrder.indexOf("file-start");
    const fileEndIndex = operationOrder.indexOf("file-end");
    expect(fileStartIndex).toBeLessThan(fileEndIndex);
    
    const dbStartIndex = operationOrder.indexOf("db-start");
    const dbEndIndex = operationOrder.indexOf("db-end");
    expect(dbStartIndex).toBeLessThan(dbEndIndex);
    
    // Concurrent operations should be present
    expect(operationOrder).toContain("cpu-computation");
    expect(operationOrder).toContain("network-start");
    
    // Network operation may or may not have completed depending on timing
    // The important thing is that sequential operations maintain order
  });
});

// Demonstrate mixed concurrent and serial tests
describe.concurrent("Mixed Execution Patterns", () => {
  let executionLog: number[] = [];

  test.concurrent("concurrent test A", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionLog.push(1);
  });

  test.concurrent("concurrent test B", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionLog.push(2);
  });

  test.serial("serial test C", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionLog.push(3);
  });

  test.concurrent("concurrent test D", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionLog.push(4);
  });

  test.serial("serial test E", async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    executionLog.push(5);
  });

  test("validate execution pattern", () => {
    console.log("Execution log:", executionLog);
    
    // Serial tests (3 and 5) should execute in order
    const index3 = executionLog.indexOf(3);
    const index5 = executionLog.indexOf(5);
    expect(index3).toBeLessThan(index5);
    
    // All tests should have executed
    expect(executionLog).toContain(1);
    expect(executionLog).toContain(2);
    expect(executionLog).toContain(3);
    expect(executionLog).toContain(4);
    expect(executionLog).toContain(5);
  });
});
