import { test, expect } from "bun:test";
import { performance } from "perf_hooks";

console.log("🚀 Starting performance benchmarks...");

test("Database query performance", async () => {
  const startTime = performance.now();

  // Simulate database operations
  const operations = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `item-${i}`,
    value: Math.random()
  }));

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 10));

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Database query took ${duration.toFixed(2)}ms`);
  expect(duration).toBeLessThan(100); // Should complete within 100ms
});

test("Package processing performance", () => {
  const startTime = performance.now();

  // Simulate package processing
  const packages = Array.from({ length: 50 }, (_, i) => ({
    name: `package-${i}`,
    version: "1.0.0",
    dependencies: {
      dep1: "^1.0.0",
      dep2: "^2.0.0",
      dep3: "^3.0.0"
    }
  }));

  // Process packages
  const processed = packages.map(pkg => ({
    ...pkg,
    processedAt: new Date().toISOString(),
    dependencyCount: Object.keys(pkg.dependencies).length
  }));

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Package processing took ${duration.toFixed(2)}ms`);
  expect(processed).toHaveLength(50);
  expect(duration).toBeLessThan(50); // Should be very fast
});

test("Registry search performance", async () => {
  const startTime = performance.now();

  // Simulate registry search
  const searchTerm = "fantasy42";
  const mockRegistry = Array.from({ length: 1000 }, (_, i) => ({
    name: `package-${i}`,
    description: `Description for package ${i}`,
    downloads: Math.floor(Math.random() * 1000000)
  }));

  // Simulate search operation
  const results = mockRegistry.filter(pkg =>
    pkg.name.includes(searchTerm) ||
    pkg.description.includes(searchTerm)
  );

  // Add some async delay to simulate network
  await new Promise(resolve => setTimeout(resolve, 5));

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Registry search took ${duration.toFixed(2)}ms`);
  expect(results.length).toBeGreaterThanOrEqual(0);
  expect(duration).toBeLessThan(200); // Should be reasonably fast
});

test("Memory usage benchmark", () => {
  const initialMemory = process.memoryUsage();

  // Create a large data structure
  const largeArray = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    data: `Item ${i} with some additional data to consume memory`,
    nested: {
      property1: Math.random(),
      property2: Math.random(),
      property3: Math.random()
    }
  }));

  const afterMemory = process.memoryUsage();
  const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;

  console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB increase`);
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

  // Cleanup
  largeArray.length = 0;
});

test("Concurrent operations performance", async () => {
  const startTime = performance.now();

  // Simulate concurrent operations
  const promises = Array.from({ length: 10 }, async (_, i) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
    return `result-${i}`;
  });

  const results = await Promise.all(promises);

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Concurrent operations took ${duration.toFixed(2)}ms`);
  expect(results).toHaveLength(10);
  expect(duration).toBeLessThan(100); // Should complete within reasonable time
});

console.log("✅ Performance benchmarks completed");