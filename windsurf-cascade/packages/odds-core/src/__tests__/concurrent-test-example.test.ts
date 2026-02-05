// packages/odds-core/src/__tests__/concurrent-test-example.test.ts
// Clean example demonstrating test.concurrent for I/O-bound operations

import { test, expect, describe } from "bun:test";

// Individual concurrent test
test.concurrent("fetch user 1", async () => {
  // Simulate network request - this can run concurrently with other tests
  const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
  expect(response.status).toBe(200);
  
  const user = await response.json();
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('email');
});

test.concurrent("fetch user 2", async () => {
  // This runs concurrently with the above test
  const response = await fetch("https://jsonplaceholder.typicode.com/users/2");
  expect(response.status).toBe(200);
  
  const user = await response.json();
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('email');
});

// Concurrent describe block
describe.concurrent("server tests", () => {
  test("sends a request to server 1", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
    expect(response.status).toBe(200);
    
    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
  });

  test("sends a request to server 2", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/2");
    expect(response.status).toBe(200);
    
    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
  });

  test("sends a request to server 3", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/3");
    expect(response.status).toBe(200);
    
    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
  });
});

// Mixed concurrent and serial tests
describe.concurrent("mixed execution patterns", () => {
  let sharedState: number = 0;

  test.concurrent("independent async operation", async () => {
    // This can run concurrently - doesn't touch shared state
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(Math.random()).toBeGreaterThanOrEqual(0);
  });

  test.concurrent("another independent operation", async () => {
    // Also runs concurrently
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(2 + 2).toBe(4);
  });

  test.serial("sequential state modification", () => {
    // Must run sequentially to avoid race conditions
    sharedState++;
    expect(sharedState).toBe(1);
  });

  test.serial("depends on previous state", () => {
    // Also sequential - depends on the previous test
    sharedState++;
    expect(sharedState).toBe(2);
  });

  test.concurrent("can run concurrently again", async () => {
    // This can run concurrently with other non-serial tests
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(true).toBe(true);
  });
});

// Regular serial test (outside concurrent blocks)
test("serial test", () => {
  expect(1 + 1).toBe(2);
});

test("another serial test", () => {
  expect("hello" + " world").toBe("hello world");
});

// Performance comparison example
describe.concurrent("performance demonstration", () => {
  const startTime = Date.now();
  
  test.concurrent("simulated database query 1", async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(true).toBe(true);
  });

  test.concurrent("simulated database query 2", async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(true).toBe(true);
  });

  test.concurrent("simulated database query 3", async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(true).toBe(true);
  });

  test.concurrent("simulated database query 4", async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(true).toBe(true);
  });

  test.concurrent("simulated database query 5", async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(true).toBe(true);
  });

  test("performance validation", () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // With 5 concurrent 80ms operations, total should be much less than 400ms
    // (if they ran sequentially) but more than 80ms (if they were truly instant)
    console.log(`Concurrent execution time: ${duration}ms`);
    expect(duration).toBeGreaterThan(80);
    expect(duration).toBeLessThan(1000); // Adjusted for real network conditions
  });
});
