#!/usr/bin/env bun

/**
 * Simple demonstration of Bun's `peek` utility
 * 
 * peek() allows you to synchronously access a resolved promise's value without awaiting
 */

import { peek } from "bun";

console.log("🔍 Bun.peek() - Simple Demonstration");
console.log("=" .repeat(40));

// Your original example
console.log("\n1. Basic usage:");
const promise = Promise.resolve("hi");
const result = peek(promise);
console.log("Result:", result); // "hi"

// Different data types
console.log("\n2. Different data types:");
const stringPromise = Promise.resolve("Hello, World!");
const numberPromise = Promise.resolve(42);
const objectPromise = Promise.resolve({ name: "Bun", version: "1.3.8" });
const arrayPromise = Promise.resolve([1, 2, 3, 4, 5]);

console.log("String:", peek(stringPromise));
console.log("Number:", peek(numberPromise));
console.log("Object:", peek(objectPromise));
console.log("Array:", peek(arrayPromise));

// Pending promises
console.log("\n3. Pending promises:");
const pendingPromise = new Promise<string>((resolve) => {
  setTimeout(() => resolve("Delayed result"), 100);
});

const pendingResult = peek(pendingPromise);
console.log("Pending result:", pendingResult); // undefined

// Wait and check again
setTimeout(() => {
  const resolvedResult = peek(pendingPromise);
  console.log("Resolved result after delay:", resolvedResult);
}, 150);

// Performance comparison
console.log("\n4. Performance comparison:");

async function performanceTest() {
  const iterations = 100000;
  const promises = Array.from({ length: iterations }, (_, i) => 
    Promise.resolve(`item-${i}`)
  );

  console.time("peek() - synchronous access");
  for (const promise of promises) {
    peek(promise);
  }
  console.timeEnd("peek() - synchronous access");

  console.time("await() - asynchronous access");
  for (const promise of promises) {
    await promise;
  }
  console.timeEnd("await() - asynchronous access");
}

// Practical usage: Caching
console.log("\n5. Practical usage - Caching:");

class PromiseCache {
  private cache = new Map<Promise<any>, any>();

  get<T>(promise: Promise<T>): T | undefined {
    if (this.cache.has(promise)) {
      return this.cache.get(promise);
    }

    const value = peek(promise);
    if (value !== undefined) {
      this.cache.set(promise, value);
      return value as T;
    }

    return undefined;
  }
}

const cache = new PromiseCache();
const cachedPromise = Promise.resolve({ data: "cached data" });
console.log("Cached value:", cache.get(cachedPromise));
console.log("Cached value again:", cache.get(cachedPromise)); // From cache

// Promise aggregation
console.log("\n6. Promise aggregation:");
const promises = [
  Promise.resolve("first"),
  Promise.resolve("second"),
  new Promise(resolve => setTimeout(() => resolve("third"), 50)),
  Promise.resolve("fourth")
];

function getResolvedResults<T>(promises: Promise<T>[]): (T | undefined)[] {
  const results: (T | undefined)[] = [];
  
  for (const promise of promises) {
    const value = peek(promise);
    if (value !== undefined) {
      results.push(value as T);
    } else {
      results.push(undefined);
    }
  }
  
  return results;
}

console.log("Currently resolved results:", getResolvedResults(promises));

// Check again after delay
setTimeout(() => {
  console.log("All results after delay:", getResolvedResults(promises));
}, 100);

// Bun-specific examples
console.log("\n7. Bun-specific examples:");

// With Bun.file()
const filePromise = Bun.file("./demo-bun-peek-simple.ts").arrayBuffer().then(buffer => 
  new TextDecoder().decode(buffer)
);
const fileContent = peek(filePromise);
console.log("File content ready:", fileContent !== undefined ? "Yes" : "No");

// With Bun.serve() - using native fetch API as fallback
const serverResponse = fetch("http://localhost:3000")
  .then(res => res.text());
const responseText = peek(serverResponse);
console.log("Response ready:", responseText !== undefined ? "Yes" : "No");

// Run performance test
performanceTest().then(() => {
  console.log("\n✅ Demo completed!");
}).catch(console.error);

export { peek };
