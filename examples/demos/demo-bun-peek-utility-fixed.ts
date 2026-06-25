#!/usr/bin/env bun

/**
 * Comprehensive demonstration of Bun's `peek` utility and related promise features
 * 
 * peek() allows you to synchronously access a resolved promise's value without awaiting
 * This is particularly useful for performance optimization and certain async patterns
 */

import { peek } from "bun";

console.info("🔍 Bun.peek() Utility Demonstration");
console.info("=" .repeat(50));

// Basic usage example
console.info("\n1. Basic peek() usage:");
const promise = Promise.resolve("hi");
const result = peek(promise);
console.info("Result:", result); // "hi"

// peek() with different data types
console.info("\n2. peek() with different data types:");

const stringPromise = Promise.resolve("Hello, World!");
const numberPromise = Promise.resolve(42);
const objectPromise = Promise.resolve({ name: "Bun", version: "1.3.8" });
const arrayPromise = Promise.resolve([1, 2, 3, 4, 5]);
const booleanPromise = Promise.resolve(true);

console.info("String:", peek(stringPromise));
console.info("Number:", peek(numberPromise));
console.info("Object:", peek(objectPromise));
console.info("Array:", peek(arrayPromise));
console.info("Boolean:", peek(booleanPromise));

// peek() with rejected promises (wrapped in function to avoid top-level errors)
console.info("\n3. peek() with rejected promises:");

function demonstrateRejectedPeek() {
  const rejectedPromise = Promise.reject(new Error("Something went wrong"));
  try {
    const rejectedResult = peek(rejectedPromise);
    console.info("Rejected result:", rejectedResult);
  } catch (error) {
    console.info("Caught error:", error.message);
  }
}

demonstrateRejectedPeek();

// peek() with pending promises
console.info("\n4. peek() with pending promises:");

const pendingPromise = new Promise<string>((resolve) => {
  setTimeout(() => resolve("Delayed result"), 100);
});

const pendingResult = peek(pendingPromise);
console.info("Pending result:", pendingResult); // undefined

// Wait for promise to resolve, then peek again
setTimeout(() => {
  const resolvedResult = peek(pendingPromise);
  console.info("Resolved result after delay:", resolvedResult);
}, 150);

// Performance comparison: peek() vs await
console.info("\n5. Performance comparison:");

async function performanceComparison() {
  const iterations = 100000;
  
  // Test with resolved promises
  const resolvedPromises = Array.from({ length: iterations }, (_, i) => 
    Promise.resolve(`item-${i}`)
  );

  console.time("peek() performance");
  for (const promise of resolvedPromises) {
    peek(promise);
  }
  console.timeEnd("peek() performance");

  console.time("await performance");
  for (const promise of resolvedPromises) {
    await promise;
  }
  console.timeEnd("await performance");
}

// peek() in practical scenarios
console.info("\n6. Practical usage scenarios:");

// Scenario 1: Caching resolved values
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
console.info("Cached value:", cache.get(cachedPromise));

// Scenario 2: Synchronous promise inspection
function inspectPromise<T>(promise: Promise<T>): { status: string; value?: T; error?: Error } {
  try {
    const value = peek(promise);
    if (value !== undefined) {
      return { status: "resolved", value: value as T };
    } else {
      return { status: "pending" };
    }
  } catch (error) {
    return { status: "rejected", error: error as Error };
  }
}

function demonstrateInspection() {
  const resolved = Promise.resolve("success");
  
  // Create rejected promise inside function
  const rejected = Promise.reject(new Error("failure"));
  const pending = new Promise(() => {}); // Never resolves

  console.info("Resolved promise:", inspectPromise(resolved));
  
  try {
    console.info("Rejected promise:", inspectPromise(rejected));
  } catch (e) {
    console.info("Rejected promise caused error during creation");
  }
  
  console.info("Pending promise:", inspectPromise(pending));
}

demonstrateInspection();

// Scenario 3: Conditional async processing
function processData(data: string) {
  const processedPromise = Promise.resolve(data.toUpperCase());
  
  // Try to get result synchronously first
  const syncResult = peek(processedPromise);
  if (syncResult !== undefined) {
    console.info("Processed synchronously:", syncResult);
    return syncResult as string;
  }
  
  // Fall back to async if not ready
  console.info("Processing asynchronously...");
  return processedPromise;
}

// Scenario 4: Promise aggregation with peek
function aggregateResults<T>(promises: Promise<T>[]): (T | undefined)[] {
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

const promises = [
  Promise.resolve("first"),
  Promise.resolve("second"),
  new Promise(resolve => setTimeout(() => resolve("third"), 50)),
  Promise.resolve("fourth")
];

console.info("Aggregated resolved results:", aggregateResults(promises));

// Demonstrate async scenarios
async function demonstrateAsyncScenarios() {
  console.info("\n7. Async scenario demonstrations:");
  
  await processData("hello world");
  
  // Wait for pending promise and check again
  await new Promise(resolve => setTimeout(resolve, 100));
  console.info("Final aggregated results:", aggregateResults(promises));
  
  // Performance comparison
  await performanceComparison();
}

// Error handling patterns
console.info("\n8. Error handling patterns:");

function safePeek<T>(promise: Promise<T>): T | undefined {
  try {
    const value = peek(promise);
    return value !== undefined ? value as T : undefined;
  } catch (error) {
    console.error("Error peeking promise:", error);
    return undefined;
  }
}

function demonstrateSafePeek() {
  // Create rejected promise inside function to avoid top-level error
  const safeRejected = Promise.reject(new Error("Safe error test"));
  console.info("Safe peek result:", safePeek(safeRejected));
}

demonstrateSafePeek();

// Additional demonstration: peek() with Bun-specific features
console.info("\n9. peek() with Bun-specific features:");

// peek() with Bun.file() results
const filePromise = Bun.file("./demo-bun-peek-utility-fixed.ts").arrayBuffer().then(buffer => 
  new TextDecoder().decode(buffer)
);
const fileContent = peek(filePromise);
if (fileContent !== undefined) {
  console.info("File content length:", (fileContent as string).length);
} else {
  console.info("File content not ready yet");
}

// peek() with fetch API as Bun.serve() alternative
const fetchPromise = fetch("http://localhost:3000")
  .then(res => res.text());
const fetchResult = peek(fetchPromise);
console.info("Fetch result ready:", fetchResult !== undefined ? "Yes" : "No");

// Advanced usage: peek() with promise chains
console.info("\n10. Advanced usage: Promise chains");

const chainPromise = Promise.resolve("start")
  .then(s => s + "-middle")
  .then(s => s + "-end");

console.info("Chain result:", peek(chainPromise));

// peek() with Promise.all()
const allPromise = Promise.all([
  Promise.resolve("a"),
  Promise.resolve("b"),
  Promise.resolve("c")
]);

console.info("Promise.all result:", peek(allPromise));

// peek() with Promise.race()
const racePromise = Promise.race([
  new Promise(resolve => setTimeout(() => resolve("slow"), 100)),
  Promise.resolve("fast")
]);

console.info("Promise.race result:", peek(racePromise));

// Run async demonstrations
demonstrateAsyncScenarios().then(() => {
  console.info("\n✅ Demo completed!");
}).catch(console.error);

export { peek };
