#!/usr/bin/env bun
/**
 * V8 Heap Snapshot Demo - Bun Compatible Version
 * 
 * Demonstrates Bun's V8 heap snapshot API for:
 * - Creating heap snapshots at runtime
 * - Memory leak detection and analysis
 * - Memory usage monitoring
 * - Chrome DevTools integration
 * 
 * Usage:
 *   bun run v8-heap-snapshot-bun.ts
 *   bun run v8-heap-snapshot-bun.ts --expose-gc
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import v8 from "node:v8";
import fs from "node:fs";

console.info('🧠 V8 Heap Snapshot Demo - Bun Compatible Version');
console.info('===================================================');

// =============================================================================
// BASIC HEAP SNAPSHOT CREATION
// =============================================================================

console.info('\n📸 Basic Heap Snapshot Creation:');
console.info('===================================');

// Create a heap snapshot with auto-generated name
const snapshotPath = v8.writeHeapSnapshot();
console.info(`✅ Auto-generated snapshot: ${snapshotPath}`);

// Create snapshots directory
if (!fs.existsSync('./memory-snapshots')) {
    fs.mkdirSync('./memory-snapshots', { recursive: true });
}

// Create a heap snapshot with custom name
const customSnapshotPath = v8.writeHeapSnapshot('./memory-snapshots/demo-initial.heapsnapshot');
console.info(`✅ Custom snapshot: ${customSnapshotPath}`);

// =============================================================================
// MEMORY PATTERN CREATION FOR ANALYSIS
// =============================================================================

console.info('\n🔍 Creating Memory Patterns for Analysis:');
console.info('==========================================');

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

console.info(`✅ Created memory patterns:`);
console.info(`   • Arrays: ${memoryPatterns.arrays.length} objects`);
console.info(`   • Objects: ${memoryPatterns.objects.length} objects`);
console.info(`   • Strings: ${memoryPatterns.strings.length} strings`);
console.info(`   • Functions: ${memoryPatterns.functions.length} functions`);
console.info(`   • TypedArrays: 4 arrays with ${(10000 + 5000 + 7500 + 100) / 1000}k total elements`);
console.info(`   • Circular references: ${memoryPatterns.circular.length} objects`);

// =============================================================================
// MEMORY STATE SNAPSHOTS
// =============================================================================

console.info('\n📊 Creating Memory State Snapshots:');
console.info('====================================');

// Snapshot 1: After pattern creation
const afterPatternsPath = v8.writeHeapSnapshot('./memory-snapshots/after-patterns.heapsnapshot');
console.info(`📸 After patterns: ${afterPatternsPath}`);

// Create memory pressure
console.info('🔥 Creating additional memory pressure...');
const memoryPressure = createMemoryPressure();

// Snapshot 2: After memory pressure
const afterPressurePath = v8.writeHeapSnapshot('./memory-snapshots/after-pressure.heapsnapshot');
console.info(`📸 After pressure: ${afterPressurePath}`);

// Force garbage collection if available
if (global.gc) {
    console.info('🗑️ Forcing garbage collection...');
    global.gc();

    // Snapshot 3: After garbage collection
    const afterGCPath = v8.writeHeapSnapshot('./memory-snapshots/after-gc.heapsnapshot');
    console.info(`📸 After GC: ${afterGCPath}`);
} else {
    console.info('⚠️ Garbage collection not available (run with --expose-gc)');
}

// =============================================================================
// MEMORY LEAK SIMULATION
// =============================================================================

console.info('\n💧 Simulating Memory Leaks:');
console.info('============================');

// Create intentional memory leak
createMemoryLeak();

// Snapshot 4: Memory leak simulation
const leakPath = v8.writeHeapSnapshot('./memory-snapshots/memory-leak-simulation.heapsnapshot');
console.info(`📸 Memory leak simulation: ${leakPath}`);

// =============================================================================
// MEMORY MONITORING (Bun Compatible)
// =============================================================================

console.info('\n📈 Memory Monitoring (Bun Compatible):');
console.info('=========================================');

try {
    // Get current heap statistics (available in Bun)
    const heapStats = v8.getHeapStatistics();
    console.info('📊 Current Heap Statistics:');
    console.info(`   • Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   • Used Heap Size: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   • Heap Size Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   • Total Physical Size: ${(heapStats.total_physical_size / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   • Total Available Size: ${(heapStats.total_available_size / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
    console.info('⚠️ Heap statistics not available in this Bun version');
}

// Monitor memory usage over time (simplified version)
console.info('\n⏱️ Monitoring memory usage for 10 seconds...');
monitorMemoryUsageSimple(v8, 10000);

// =============================================================================
// CHROME DEVTOOLS INSTRUCTIONS
// =============================================================================

console.info('\n💀 Chrome DevTools Analysis Instructions:');
console.info('==========================================');

console.info('🔧 How to analyze heap snapshots in Chrome DevTools:');
console.info('1. Open Chrome browser');
console.info('2. Open Chrome DevTools (F12 or right-click → Inspect)');
console.info('3. Go to the "Memory" tab');
console.info('4. Click the "Load" button (folder icon)');
console.info('5. Select any .heapsnapshot file from the memory-snapshots directory');
console.info('');
console.info('📊 Available Analysis Views:');
console.info('• Summary: Overview of memory usage by object type');
console.info('• Comparison: Compare two snapshots to find leaks');
console.info('• Containment: View object retention relationships');
console.info('• Statistics: Detailed memory statistics');
console.info('');
console.info('🎯 Snapshot Files Created:');
console.info(`   • ${snapshotPath}`);
console.info(`   • ${customSnapshotPath}`);
console.info(`   • ${afterPatternsPath}`);
console.info(`   • ${afterPressurePath}`);
console.info(`   • ./memory-snapshots/after-gc.heapsnapshot`);
console.info(`   • ${leakPath}`);
console.info('');
console.info('🔍 Memory Leak Detection Tips:');
console.info('• Compare "after-patterns" with "memory-leak-simulation"');
console.info('• Look for objects that should be freed but remain');
console.info('• Check for detached DOM nodes or event listeners');
console.info('• Analyze closure references and circular dependencies');
console.info('');
console.info('🚀 Bun-Specific Features:');
console.info('• Fast heap snapshot generation');
console.info('• Compatible with Node.js V8 API');
console.info('• Works with Chrome DevTools');
console.info('• Memory leak detection capabilities');

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

    console.info(`✅ Created memory pressure: ~${(450 * 1024) / 1024}KB of data`);
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

    console.info(`💧 Added ${leakedMemory.length} objects to memory leak simulation`);
}

/**
 * Monitor memory usage over time (simplified for Bun)
 */
function monitorMemoryUsageSimple(v8: any, duration: number): void {
    const startTime = Date.now();
    const interval = 1000; // 1 second intervals
    let measurements: any[] = [];

    const monitor = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
            clearInterval(monitor);
            console.info('\n📈 Memory Usage Summary:');
            console.info('==========================');

            if (measurements.length > 0) {
                const initial = measurements[0];
                const final = measurements[measurements.length - 1];
                const peak = measurements.reduce((max, curr) =>
                    curr.used > max.used ? curr : max, measurements[0]);

                console.info(`   • Initial Memory: ${(initial.used / 1024 / 1024).toFixed(2)} MB`);
                console.info(`   • Final Memory: ${(final.used / 1024 / 1024).toFixed(2)} MB`);
                console.info(`   • Peak Memory: ${(peak.used / 1024 / 1024).toFixed(2)} MB`);
                console.info(`   • Memory Change: ${((final.used - initial.used) / 1024 / 1024).toFixed(2)} MB`);
                console.info(`   • Measurements Taken: ${measurements.length}`);

                // Memory trend analysis
                const trend = final.used > initial.used ? '📈 Increasing' :
                    final.used < initial.used ? '📉 Decreasing' : '➡️ Stable';
                console.info(`   • Memory Trend: ${trend}`);
            }

            return;
        }

        try {
            const stats = v8.getHeapStatistics();
            const measurement = {
                timestamp: elapsed,
                used: stats.used_heap_size,
                total: stats.total_heap_size,
                limit: stats.heap_size_limit
            };

            measurements.push(measurement);

            console.info(`   ${(elapsed / 1000).toFixed(0)}s: Used ${(stats.used_heap_size / 1024 / 1024).toFixed(2)} MB / Total ${(stats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
        } catch (error) {
            console.info(`   ${(elapsed / 1000).toFixed(0)}s: Memory monitoring not available`);
        }

    }, interval);
}

console.info('\n🎉 V8 Heap Snapshot Demo Complete!');
console.info('🧠 Memory analysis files created in memory-snapshots/');
console.info('💀 Use Chrome DevTools to analyze the heap snapshots');
console.info('🔍 Compare snapshots to detect memory leaks and optimization opportunities');

// Export functions for programmatic use
export {
    createCircularReferences,
    createMemoryPressure,
    createMemoryLeak,
    monitorMemoryUsageSimple
};
