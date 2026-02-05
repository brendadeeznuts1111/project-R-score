#!/usr/bin/env bun

/**
 * Garbage Collection & Heap Snapshot Demo
 * Demonstrates manual GC and heap analysis in Bun
 */

import { heapStats } from "bun:jsc";

async function runGCDemo() {
console.log("🗑️  Garbage Collection & Heap Snapshot Demo");
console.log("==========================================\n");

// Create some objects to work with
console.log("🏗️  Creating test objects...");
const testObjects = [];
const leakyObjects = [];

for (let i = 0; i < 500; i++) {
  // Normal objects that will be cleaned up
  testObjects.push({
    id: i,
    data: new Array(50).fill(Math.random()),
    timestamp: Date.now()
  });

  // Some objects that might "leak" (intentionally kept)
  if (i % 10 === 0) {
    leakyObjects.push({
      leakId: i,
      persistent: true,
      data: new Array(100).fill(`leak-data-${i}`)
    });
  }
}

console.log(`✅ Created ${testObjects.length} normal objects`);
console.log(`💧 Created ${leakyObjects.length} persistent objects`);

// Show initial heap state
console.log("\n📊 Initial Heap State:");
const initialStats = heapStats();
console.log({
  heapSize: `${(initialStats.heapSize / 1024).toFixed(2)} KB`,
  objectCount: initialStats.objectCount,
  heapCapacity: `${(initialStats.heapCapacity / 1024).toFixed(2)} KB`
});

// Demonstrate synchronous garbage collection
console.log("\n🗑️  Running Synchronous Garbage Collection...");
console.log("Before sync GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

Bun.gc(true); // Synchronous garbage collection

console.log("After sync GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

// Clear normal objects but keep "leaky" ones
console.log("\n🧹 Clearing normal object references...");
testObjects.length = 0; // Clear array

// Demonstrate asynchronous garbage collection
console.log("\n🗑️  Running Asynchronous Garbage Collection...");
console.log("Before async GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

Bun.gc(false); // Asynchronous garbage collection

// Wait a bit for async GC to complete
await new Promise(resolve => setTimeout(resolve, 100));

console.log("After async GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

// Show final heap state
console.log("\n📋 Final Heap State:");
const finalStats = heapStats();
console.log({
  heapSize: `${(finalStats.heapSize / 1024).toFixed(2)} KB`,
  objectCount: finalStats.objectCount,
  heapCapacity: `${(finalStats.heapCapacity / 1024).toFixed(2)} KB`
});

// Try to generate heap snapshot (if available)
console.log("\n📸 Attempting to generate heap snapshot...");
try {
  // Note: generateHeapSnapshot might not be available in all Bun versions
  const { generateHeapSnapshot } = await import("bun");

  if (typeof generateHeapSnapshot === 'function') {
    const snapshot = generateHeapSnapshot();
    await Bun.write("heap-snapshot.json", JSON.stringify(snapshot, null, 2));
    console.log("✅ Heap snapshot saved to: heap-snapshot.json");
    console.log("💡 Open this file in Safari Developer Tools > Profiles > Heap Snapshot");
  } else {
    console.log("⚠️  generateHeapSnapshot not available in this Bun version");
  }
} catch (error) {
  console.log("⚠️  Heap snapshot generation not available:", error.message);
}

// Show memory leak detection
console.log("\n🔍 Memory Leak Analysis:");
const memoryDiff = {
  objectCount: finalStats.objectCount - initialStats.objectCount,
  heapSize: finalStats.heapSize - initialStats.heapSize
};

console.log("Object count change:", memoryDiff.objectCount);
console.log("Heap size change:", `${(memoryDiff.heapSize / 1024).toFixed(2)} KB`);

if (memoryDiff.objectCount > 0) {
  console.log("💧 Potential memory leak detected!");
  console.log(`   ${memoryDiff.objectCount} extra objects remain`);
} else {
  console.log("✅ No obvious memory leaks detected");
}

// Show top object types after cleanup
console.log("\n🏷️  Top Object Types After Cleanup:");
const sortedTypes = Object.entries(finalStats.objectTypeCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10);

sortedTypes.forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log("\n🎯 GC & Snapshot Demo Complete!");
console.log("💡 Memory Management Tips:");
console.log("   - Use Bun.gc(true) for immediate cleanup in development");
console.log("   - Use Bun.gc(false) for non-blocking cleanup in production");
console.log("   - Monitor objectCount changes for leak detection");
console.log("   - Use heap snapshots for detailed memory analysis");
}

// Run the demo
runGCDemo().catch(console.error);
