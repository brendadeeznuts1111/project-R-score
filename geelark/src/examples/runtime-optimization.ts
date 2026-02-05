#!/usr/bin/env bun

/**
 * Runtime Optimization Examples
 *
 * Demonstrates Bun's runtime optimization flags:
 * - --smol: Memory-optimized mode
 * - --expose-gc: Expose garbage collector
 * - --console-depth: Control console.log depth
 *
 * Usage:
 *   bun --smol examples/runtime-optimization.ts
 *   bun --expose-gc examples/runtime-optimization.ts
 *   bun --console-depth=5 examples/runtime-optimization.ts
 */

import { RuntimeOptimization, getMemoryStats, forceGC } from "../src/utils/RuntimeOptimization";

// Check runtime flags
const isSmol = process.argv.includes('--smol');
const exposeGc = process.argv.includes('--expose-gc');
const consoleDepthMatch = process.argv.find(arg => arg.startsWith('--console-depth='));
const consoleDepth = consoleDepthMatch ? parseInt(consoleDepthMatch.split('=')[1]) : 2;

console.log('🔧 Runtime Optimization Examples\n');
console.log(`Configuration:`);
console.log(`  --smol: ${isSmol ? '✅ enabled' : '❌ disabled'}`);
console.log(`  --expose-gc: ${exposeGc ? '✅ enabled' : '❌ disabled'}`);
console.log(`  --console-depth: ${consoleDepth}\n`);

// Initialize optimizer
const optimizer = new RuntimeOptimization({
  exposeGc,
  consoleDepth,
});

// Example 1: Memory-optimized data processing
async function example1_MemoryOptimizedProcessing() {
  console.log('📊 Example 1: Memory-Optimized Processing');

  const memBefore = getMemoryStats();

  // Process data with memory optimization
  const result = await optimizer.withMemoryOptimization(async () => {
    const data = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      metadata: { timestamp: Date.now(), index: i },
    }));

    // Process in batches
    const processed = [];
    for (let i = 0; i < data.length; i += 1000) {
      const batch = data.slice(i, i + 1000);
      processed.push(...batch.map(item => ({ ...item, processed: true })));

      // Periodic GC in memory-optimized mode
      if (isSmol && i % 5000 === 0) {
        console.log(`  → GC at batch ${i / 1000}`);
        Bun.gc(false); // Non-blocking GC
      }
    }

    return processed;
  });

  const memAfter = getMemoryStats();
  const delta = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

  console.log(`  Processed: ${result.length} items`);
  console.log(`  Memory delta: ${delta.toFixed(2)} MB`);
  console.log();
}

// Example 2: Measuring memory impact
async function example2_MeasureMemoryImpact() {
  console.log('📈 Example 2: Measuring Memory Impact');

  const { memoryDelta, before, after } = await optimizer.measureMemoryUsage(() => {
    // Create temporary objects
    const temp = Array.from({ length: 5000 }, () => ({
      data: 'x'.repeat(100),
      nested: { value: Math.random(), array: [1, 2, 3] },
    }));
    return temp.length;
  });

  console.log(`  Memory before: ${(before.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory after: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)} MB`);
  console.log();
}

// Example 3: Console depth demonstration
function example3_ConsoleDepth() {
  console.log('📊 Example 3: Console Depth Control');

  const deepObject = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              value: 'deep nested value',
            },
          },
        },
      },
    },
  };

  console.log(`  With console-depth=${consoleDepth}:`);
  optimizer.logWithDepth(deepObject);
  console.log();
}

// Example 4: Garbage collection
function example4_GarbageCollection() {
  console.log('🗑️  Example 4: Garbage Collection');

  console.log('  Creating temporary objects...');
  const temp = Array.from({ length: 10000 }, () => ({ data: 'temp' }));

  const memBefore = getMemoryStats();
  console.log(`  Memory before GC: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  // Force garbage collection
  optimizer.forceGC(true); // Blocking GC

  const memAfter = getMemoryStats();
  console.log(`  Memory after GC: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Memory freed: ${((memBefore.heapUsed - memAfter.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  console.log();
}

// Example 5: Runtime configuration display
function example5_DisplayConfig() {
  console.log('⚙️  Example 5: Runtime Configuration');
  optimizer.displayConfig();
  console.log();
}

// Run all examples
async function main() {
  try {
    await example1_MemoryOptimizedProcessing();
    await example2_MeasureMemoryImpact();
    example3_ConsoleDepth();
    example4_GarbageCollection();
    example5_DisplayConfig();

    console.log('✅ All examples completed successfully!');
    console.log('\n💡 Tips:');
    console.log('  • Use --smol for memory-constrained environments');
    console.log('  • Use --expose-gc for Node.js compatibility');
    console.log('  • Use --console-depth=N to control object inspection depth');
    console.log('  • Bun.gc() is always available (better than global gc())');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

