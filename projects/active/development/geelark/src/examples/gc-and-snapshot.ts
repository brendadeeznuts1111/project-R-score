#!/usr/bin/env bun

/**
 * Garbage Collection & Heap Snapshot Demo
 * Demonstrates manual GC and heap analysis in Bun
 */

import { heapStats } from "bun:jsc";

async function runGCDemo() {
console.info("🗑️  Garbage Collection & Heap Snapshot Demo");
console.info("==========================================\n");

// Create some objects to work with
console.info("🏗️  Creating test objects...");
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

console.info(`✅ Created ${testObjects.length} normal objects`);
console.info(`💧 Created ${leakyObjects.length} persistent objects`);

// Show initial heap state
console.info("\n📊 Initial Heap State:");
const initialStats = heapStats();
console.info({
  heapSize: `${(initialStats.heapSize / 1024).toFixed(2)} KB`,
  objectCount: initialStats.objectCount,
  heapCapacity: `${(initialStats.heapCapacity / 1024).toFixed(2)} KB`
});

// Demonstrate synchronous garbage collection
console.info("\n🗑️  Running Synchronous Garbage Collection...");
console.info("Before sync GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

Bun.gc(true); // Synchronous garbage collection

console.info("After sync GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

// Clear normal objects but keep "leaky" ones
console.info("\n🧹 Clearing normal object references...");
testObjects.length = 0; // Clear array

// Demonstrate asynchronous garbage collection
console.info("\n🗑️  Running Asynchronous Garbage Collection...");
console.info("Before async GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

Bun.gc(false); // Asynchronous garbage collection

// Wait a bit for async GC to complete
await new Promise(resolve => setTimeout(resolve, 100));

console.info("After async GC:", `${(heapStats().heapSize / 1024).toFixed(2)} KB`);

// Show final heap state
console.info("\n📋 Final Heap State:");
const finalStats = heapStats();
console.info({
  heapSize: `${(finalStats.heapSize / 1024).toFixed(2)} KB`,
  objectCount: finalStats.objectCount,
  heapCapacity: `${(finalStats.heapCapacity / 1024).toFixed(2)} KB`
});

// Try to generate heap snapshot (if available)
console.info("\n📸 Attempting to generate heap snapshot...");
try {
  // Note: generateHeapSnapshot might not be available in all Bun versions
  const { generateHeapSnapshot } = await import("bun");

  if (typeof generateHeapSnapshot === 'function') {
    const snapshot = generateHeapSnapshot();
    await Bun.write("heap-snapshot.json", JSON.stringify(snapshot, null, 2));
    console.info("✅ Heap snapshot saved to: heap-snapshot.json");
    console.info("💡 Open this file in Safari Developer Tools > Profiles > Heap Snapshot");
  } else {
    console.info("⚠️  generateHeapSnapshot not available in this Bun version");
  }
} catch (error) {
  console.info("⚠️  Heap snapshot generation not available:", error.message);
}

// Show memory leak detection
console.info("\n🔍 Memory Leak Analysis:");
const memoryDiff = {
  objectCount: finalStats.objectCount - initialStats.objectCount,
  heapSize: finalStats.heapSize - initialStats.heapSize
};

console.info("Object count change:", memoryDiff.objectCount);
console.info("Heap size change:", `${(memoryDiff.heapSize / 1024).toFixed(2)} KB`);

if (memoryDiff.objectCount > 0) {
  console.info("💧 Potential memory leak detected!");
  console.info(`   ${memoryDiff.objectCount} extra objects remain`);
} else {
  console.info("✅ No obvious memory leaks detected");
}

// Show top object types after cleanup
console.info("\n🏷️  Top Object Types After Cleanup:");
const sortedTypes = Object.entries(finalStats.objectTypeCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10);

sortedTypes.forEach(([type, count]) => {
  console.info(`  ${type}: ${count}`);
});

console.info("\n🎯 GC & Snapshot Demo Complete!");
console.info("💡 Memory Management Tips:");
console.info("   - Use Bun.gc(true) for immediate cleanup in development");
console.info("   - Use Bun.gc(false) for non-blocking cleanup in production");
console.info("   - Monitor objectCount changes for leak detection");
console.info("   - Use heap snapshots for detailed memory analysis");
}

// Run the demo
runGCDemo().catch(console.error);
