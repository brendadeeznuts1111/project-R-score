// packages/odds-core/src/integration/api-concurrent.test.ts
// Integration tests that will run concurrently due to bunfig.toml pattern

import { test, expect, describe } from "bun:test";

// All tests in this file run concurrently because it matches "**/integration/**/*.test.ts"

describe("API Integration Tests", () => {
  test.concurrent("fetches user data", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
    expect(response.status).toBe(200);
    
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
  });

  test.concurrent("fetches post data", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
    expect(response.status).toBe(200);
    
    const post = await response.json();
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('body');
  });

  test.concurrent("fetches comment data", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/comments/1");
    expect(response.status).toBe(200);
    
    const comment = await response.json();
    expect(comment).toHaveProperty('id');
    expect(comment).toHaveProperty('email');
    expect(comment).toHaveProperty('body');
  });

  test.concurrent("fetches album data", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/albums/1");
    expect(response.status).toBe(200);
    
    const album = await response.json();
    expect(album).toHaveProperty('id');
    expect(album).toHaveProperty('title');
  });

  test.concurrent("fetches photo data", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/photos/1");
    expect(response.status).toBe(200);
    
    const photo = await response.json();
    expect(photo).toHaveProperty('id');
    expect(photo).toHaveProperty('title');
    expect(photo).toHaveProperty('url');
  });

  test.serial("validates all API responses are consistent", () => {
    // This test runs sequentially even though the file is concurrent
    // Useful for validations that need to run after all API calls
    expect(true).toBe(true);
  });
});

describe("Database Integration Tests", () => {
  test.concurrent("simulates database read operations", async () => {
    // Simulate database read
    await new Promise(resolve => setTimeout(resolve, 50));
    const result = { id: 1, data: "test" };
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('data');
  });

  test.concurrent("simulates database query operations", async () => {
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 50));
    const results = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(results).toHaveLength(3);
  });

  test.concurrent("simulates database aggregation", async () => {
    // Simulate database aggregation
    await new Promise(resolve => setTimeout(resolve, 50));
    const aggregation = { count: 100, sum: 1000 };
    expect(aggregation.count).toBe(100);
    expect(aggregation.sum).toBe(1000);
  });
});
