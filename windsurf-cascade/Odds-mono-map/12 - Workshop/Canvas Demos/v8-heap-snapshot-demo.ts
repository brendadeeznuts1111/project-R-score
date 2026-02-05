#!/usr/bin/env bun
/**
 * V8 Heap Snapshot Demo - Memory Leak Detection and Analysis
 * 
 * Demonstrates Bun's V8 heap snapshot API for:
 * - Creating heap snapshots at runtime
 * - Memory leak detection and analysis
 * - Memory usage monitoring over time
 * - Chrome DevTools integration
 * 
 * Usage:
 *   bun run v8-heap-snapshot-demo.ts
 *   bun run v8-heap-snapshot-demo.ts --expose-gc
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import v8 from "node:v8";
import fs from "node:fs";

console.log('🧠 V8 Heap Snapshot Demo - Memory Analysis');
console.log('============================================');

// =============================================================================
// BASIC HEAP SNAPSHOT CREATION
// =============================================================================

console.log('\n📸 Basic Heap Snapshot Creation:');
console.log('===================================');

// Create a heap snapshot with auto-generated name
const snapshotPath = v8.writeHeapSnapshot();
console.log(`✅ Auto-generated snapshot: ${snapshotPath}`);

// Create snapshots directory
if (!fs.existsSync('./memory-snapshots')) {
    fs.mkdirSync('./memory-snapshots', { recursive: true });
}

// Create a heap snapshot with custom name
const customSnapshotPath = v8.writeHeapSnapshot('./memory-snapshots/demo-initial.heapsnapshot');
console.log(`✅ Custom snapshot: ${customSnapshotPath}`);

// =============================================================================
// MEMORY PATTERN CREATION FOR ANALYSIS
// =============================================================================

console.log('\n🔍 Creating Memory Patterns for Analysis:');
console.log('==========================================');

// Create various memory patterns
const memoryPatterns = {
    // Large arrays
    arrays: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: new Array(100).fill(`array-item-${i}`),
        metadata: {
            created: Date.now(),
            type: 'large-array',
            size: 100
        }
    })),

    // Nested objects
    objects: Array.from({ length: 500 }, (_, i) => ({
        id: i,
        nested: {
            level1: {
                level2: {
                    level3: {
                        data: `deep-nested-${i}`,
                        timestamp: Date.now(),
                        properties: Array.from({ length: 20 }, (_, j) => `prop-${i}-${j}`)
                    }
                },
                properties: Array.from({ length: 30 }, (_, k) => `level1-prop-${i}-${k}`)
            }
        },
        methods: {
            calculate: () => i * 2,
            toString: () => `object-${i}`,
            getData: () => `data-${i}`
        }
    })),

    // String data
    strings: Array.from({ length: 2000 }, (_, i) =>
        `very-long-string-with-lots-of-data-and-content-for-memory-analysis-${i}-`.repeat(5)
    ),

    // Functions with closures
    functions: Array.from({ length: 100 }, (_, i) => {
        const closureData = new Array(50).fill(`closure-${i}`);
        return function createFunction() {
            return function innerFunction() {
                return closureData.join('-') + `-result-${i}`;
            };
        }();
    }),

    // Typed arrays
    typedArrays: {
        uint8: new Uint8Array(10000),
        float32: new Float32Array(5000),
        int16: new Int16Array(7500),
        buffer: new ArrayBuffer(1024 * 100) // 100KB
    },

    // Circular references (potential memory leaks)
    circular: createCircularReferences(200)
};

console.log(`✅ Created memory patterns:`);
console.log(`   • Arrays: ${memoryPatterns.arrays.length} objects`);
console.log(`   • Objects: ${memoryPatterns.objects.length} objects`);
console.log(`   • Strings: ${memoryPatterns.strings.length} strings`);
console.log(`   • Functions: ${memoryPatterns.functions.length} functions`);
console.log(`   • TypedArrays: 4 arrays with ${(10000 + 5000 + 7500 + 100) / 1000}k total elements`);
console.log(`   • Circular references: ${memoryPatterns.circular.length} objects`);

// =============================================================================
// MEMORY STATE SNAPSHOTS
// =============================================================================

console.log('\n📊 Creating Memory State Snapshots:');
console.log('====================================');

// Snapshot 1: After pattern creation
const afterPatternsPath = v8.writeHeapSnapshot('./memory-snapshots/after-patterns.heapsnapshot');
console.log(`📸 After patterns: ${afterPatternsPath}`);

// Create memory pressure
console.log('🔥 Creating additional memory pressure...');
const memoryPressure = createMemoryPressure();

// Snapshot 2: After memory pressure
const afterPressurePath = v8.writeHeapSnapshot('./memory-snapshots/after-pressure.heapsnapshot');
console.log(`📸 After pressure: ${afterPressurePath}`);

// Force garbage collection if available
if (global.gc) {
    console.log('🗑️ Forcing garbage collection...');
    global.gc();

    // Snapshot 3: After garbage collection
    const afterGCPath = v8.writeHeapSnapshot('./memory-snapshots/after-gc.heapsnapshot');
    console.log(`📸 After GC: ${afterGCPath}`);
} else {
    console.log('⚠️ Garbage collection not available (run with --expose-gc)');
}

// =============================================================================
// MEMORY LEAK SIMULATION
// =============================================================================

console.log('\n💧 Simulating Memory Leaks:');
console.log('============================');

// Create intentional memory leak
createMemoryLeak();

// Snapshot 4: Memory leak simulation
const leakPath = v8.writeHeapSnapshot('./memory-snapshots/memory-leak-simulation.heapsnapshot');
console.log(`📸 Memory leak simulation: ${leakPath}`);

// =============================================================================
// MEMORY MONITORING
// =============================================================================

console.log('\n📈 Real-time Memory Monitoring:');
console.log('=================================');

// Get current heap statistics
const heapStats = v8.getHeapStatistics();
console.log('📊 Current Heap Statistics:');
console.log(`   • Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   • Used Heap Size: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   • Heap Size Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
console.log(`   • Total Physical Size: ${(heapStats.total_physical_size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   • Total Available Size: ${(heapStats.total_available_size / 1024 / 1024).toFixed(2)} MB`);

// Get heap space statistics
const heapSpaceStats = v8.getHeapSpaceStatistics();
console.log('\n📊 Heap Space Statistics:');
heapSpaceStats.forEach((space: any, index: number) => {
    console.log(`   ${index + 1}. ${space.space_name}:`);
    console.log(`      Size: ${(space.space_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`      Used: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`      Available: ${(space.space_available_size / 1024 / 1024).toFixed(2)} MB`);
});

// Monitor memory usage over time
console.log('\n⏱️ Monitoring memory usage for 10 seconds...');
monitorMemoryUsage(v8, 10000);

// =============================================================================
// CHROME DEVTOOLS INSTRUCTIONS
// =============================================================================

console.log('\n💀 Chrome DevTools Analysis Instructions:');
console.log('==========================================');

console.log('🔧 How to analyze heap snapshots in Chrome DevTools:');
console.log('1. Open Chrome browser');
console.log('2. Open Chrome DevTools (F12 or right-click → Inspect)');
console.log('3. Go to the "Memory" tab');
console.log('4. Click the "Load" button (folder icon)');
console.log('5. Select any .heapsnapshot file from the memory-snapshots directory');
console.log('');
console.log('📊 Available Analysis Views:');
console.log('• Summary: Overview of memory usage by object type');
console.log('• Comparison: Compare two snapshots to find leaks');
console.log('• Containment: View object retention relationships');
console.log('• Statistics: Detailed memory statistics');
console.log('');
console.log('🎯 Snapshot Files Created:');
console.log(`   • ${snapshotPath}`);
console.log(`   • ${customSnapshotPath}`);
console.log(`   • ${afterPatternsPath}`);
console.log(`   • ${afterPressurePath}`);
console.log(`   • ./memory-snapshots/after-gc.heapsnapshot`);
console.log(`   • ${leakPath}`);
console.log('');
console.log('🔍 Memory Leak Detection Tips:');
console.log('• Compare "after-patterns" with "memory-leak-simulation"');
console.log('• Look for objects that should be freed but remain');
console.log('• Check for detached DOM nodes or event listeners');
console.log('• Analyze closure references and circular dependencies');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create circular references for memory leak testing
 */
function createCircularReferences(count: number): any[] {
    const objects: any[] = [];

    for (let i = 0; i < count; i++) {
        const obj = {
            id: i,
            name: `circular-${i}`,
            data: new Array(20).fill(`data-${i}`),
            timestamp: Date.now() + i
        };

        // Create circular references
        obj.self = obj;
        obj.parent = obj;
        obj.children = [obj];
        obj.reference = obj; // Multiple circular references

        objects.push(obj);
    }

    return objects;
}

/**
 * Create memory pressure for testing
 */
function createMemoryPressure(): any {
    const data = {
        largeArrays: Array.from({ length: 200 }, (_, i) =>
            new Array(1000).fill(`memory-pressure-data-${i}`)
        ),
        largeObjects: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            data: new Array(500).fill(`pressure-object-data-${i}`),
            nested: {
                level1: Array.from({ length: 100 }, (_, j) => ({
                    data: `nested-pressure-${i}-${j}`,
                    metadata: { created: Date.now(), type: 'pressure' }
                })),
                level2: Array.from({ length: 50 }, (_, k) => ({
                    deep: `deep-pressure-${i}-${k}`,
                    properties: new Array(20).fill(`prop-${k}`)
                }))
            }
        })),
        buffers: [
            new ArrayBuffer(1024 * 200), // 200KB
            new ArrayBuffer(1024 * 150), // 150KB
            new ArrayBuffer(1024 * 100)  // 100KB
        ]
    };

    console.log(`✅ Created memory pressure: ~${(450 * 1024) / 1024}KB of data`);
    return data;
}

/**
 * Create a memory leak for demonstration
 */
function createMemoryLeak(): void {
    // Global array that grows (simulated leak)
    if (!(global as any).leakedMemory) {
        (global as any).leakedMemory = [];
    }

    const leakedMemory = (global as any).leakedMemory;

    // Add objects that won't be garbage collected
    for (let i = 0; i < 200; i++) {
        const leakObj = {
            id: Date.now() + i,
            data: new Array(100).fill(`leaked-data-${i}`),
            timestamp: new Date(),
            callback: function () {
                return `leaked-callback-${i}-${Date.now()}`;
            },
            closure: (function () {
                const closureData = new Array(50).fill(`closure-leak-${i}`);
                return function () {
                    return closureData.join('-');
                };
            })()
        };

        leakedMemory.push(leakObj);
    }

    console.log(`💧 Added ${leakedMemory.length} objects to memory leak simulation`);
}

/**
 * Monitor memory usage over time
 */
function monitorMemoryUsage(v8: any, duration: number): void {
    const startTime = Date.now();
    const interval = 1000; // 1 second intervals
    let measurements: any[] = [];

    const monitor = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
            clearInterval(monitor);
            console.log('\n📈 Memory Usage Summary:');
            console.log('==========================');

            if (measurements.length > 0) {
                const initial = measurements[0];
                const final = measurements[measurements.length - 1];
                const peak = measurements.reduce((max, curr) =>
                    curr.used > max.used ? curr : max, measurements[0]);

                console.log(`   • Initial Memory: ${(initial.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Final Memory: ${(final.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Peak Memory: ${(peak.used / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Memory Change: ${((final.used - initial.used) / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   • Measurements Taken: ${measurements.length}`);

                // Memory trend analysis
                const trend = final.used > initial.used ? '📈 Increasing' :
                    final.used < initial.used ? '📉 Decreasing' : '➡️ Stable';
                console.log(`   • Memory Trend: ${trend}`);
            }

            return;
        }

        const stats = v8.getHeapStatistics();
        const measurement = {
            timestamp: elapsed,
            used: stats.used_heap_size,
            total: stats.total_heap_size,
            limit: stats.heap_size_limit
        };

        measurements.push(measurement);

        console.log(`   ${(elapsed / 1000).toFixed(0)}s: Used ${(stats.used_heap_size / 1024 / 1024).toFixed(2)} MB / Total ${(stats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);

    }, interval);
}

console.log('\n🎉 V8 Heap Snapshot Demo Complete!');
console.log('🧠 Memory analysis files created in memory-snapshots/');
console.log('💀 Use Chrome DevTools to analyze the heap snapshots');
console.log('🔍 Compare snapshots to detect memory leaks and optimization opportunities');

// Export functions for programmatic use
export {
    createCircularReferences,
    createMemoryPressure,
    createMemoryLeak,
    monitorMemoryUsage
};
