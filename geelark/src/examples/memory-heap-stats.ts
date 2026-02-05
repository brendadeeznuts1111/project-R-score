#!/usr/bin/env bun

/**
 * JavaScript Heap Statistics Demo
 * Demonstrates Bun's heap stats and memory monitoring capabilities
 */

import { heapStats } from "bun:jsc";

console.log("🧠 JavaScript Heap Statistics Demo");
console.log("=====================================\n");

// Initial heap state
console.log("📊 Initial Heap State:");
console.log(JSON.stringify(heapStats(), null, 2));

// Create some objects to see the heap grow
console.log("\n🏗️  Creating objects to observe heap growth...");

const objects = [];
for (let i = 0; i < 1000; i++) {
  objects.push({
    id: i,
    data: new Array(100).fill(Math.random()),
    timestamp: Date.now(),
    metadata: {
      type: "demo",
      index: i,
      tags: [`tag-${i % 10}`, `category-${i % 5}`]
    }
  });
}

console.log(`✅ Created ${objects.length} objects`);

// Heap state after object creation
console.log("\n📈 Heap State After Object Creation:");
const afterCreation = heapStats();
console.log({
  heapSize: `${(afterCreation.heapSize / 1024 / 1024).toFixed(2)} MB`,
  heapCapacity: `${(afterCreation.heapCapacity / 1024 / 1024).toFixed(2)} MB`,
  objectCount: afterCreation.objectCount,
  extraMemorySize: `${(afterCreation.extraMemorySize / 1024).toFixed(2)} KB`
});

// Show top object types
console.log("\n🏷️  Top Object Types:");
const sortedTypes = Object.entries(afterCreation.objectTypeCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10);

sortedTypes.forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Force garbage collection
console.log("\n🗑️  Forcing garbage collection...");
const beforeGC = heapStats().heapSize;
Bun.gc(true); // synchronous garbage collection
const afterGC = heapStats().heapSize;

console.log(`📉 Heap size reduced by: ${((beforeGC - afterGC) / 1024).toFixed(2)} KB`);

// Clear references and GC again
console.log("\n🧹 Clearing object references...");
objects.length = 0;
Bun.gc(true);

const finalStats = heapStats();
console.log("\n📋 Final Heap State:");
console.log({
  heapSize: `${(finalStats.heapSize / 1024 / 1024).toFixed(2)} MB`,
  heapCapacity: `${(finalStats.heapCapacity / 1024 / 1024).toFixed(2)} MB`,
  objectCount: finalStats.objectCount,
  protectedObjectCount: finalStats.protectedObjectCount,
  globalObjectCount: finalStats.globalObjectCount
});

// Memory usage comparison with process.memoryUsage()
console.log("\n🔍 Process Memory Usage (Node.js compatible):");
const nodeMemory = process.memoryUsage();
console.log({
  rss: `${(nodeMemory.rss / 1024 / 1024).toFixed(2)} MB`,
  heapTotal: `${(nodeMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  heapUsed: `${(nodeMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  external: `${(nodeMemory.external / 1024 / 1024).toFixed(2)} MB`,
  arrayBuffers: `${(nodeMemory.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
});

console.log("\n🎯 Heap Stats Demo Complete!");
console.log("💡 Tips:");
console.log("   - Use heapStats() for real-time memory monitoring");
console.log("   - Use Bun.gc() to force garbage collection in development");
console.log("   - Monitor objectCount to detect memory leaks");
