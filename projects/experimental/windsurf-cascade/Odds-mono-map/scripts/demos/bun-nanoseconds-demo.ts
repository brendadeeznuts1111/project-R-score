#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-nanoseconds-demo
 * 
 * Bun Nanoseconds Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,bun,runtime,performance
 */

#!/usr/bin/env bun

import chalk from 'chalk';

console.info(chalk.blue.bold('🕐 Bun.nanoseconds() High-Precision Timing Demo'));
console.info(chalk.gray('Demonstrating nanosecond-precision performance measurement\n'));

// Basic timing demonstration
console.info(chalk.yellow('⚡ Basic Timing:'));
const start1 = Bun.nanoseconds();
await Bun.sleep(10); // 10ms
const end1 = Bun.nanoseconds();
const duration1 = end1 - start1;

console.info(chalk.gray(`   🕐 Start: ${start1.toLocaleString()} nanoseconds`));
console.info(chalk.gray(`   🕐 End: ${end1.toLocaleString()} nanoseconds`));
console.info(chalk.gray(`   ⏱️  Duration: ${duration1.toLocaleString()} nanoseconds (${(duration1 / 1_000_000).toFixed(2)}ms)`));

// Multiple operations timing
console.info(chalk.yellow('\n🔄 Multiple Operations:'));
const start2 = Bun.nanoseconds();

// Simulate some work
let sum = 0;
for (let i = 0; i < 1000000; i++) {
    sum += i;
}

const midPoint = Bun.nanoseconds();

// More work
const result = Array(1000).fill(0).map((_, i) => Math.sqrt(i));

const end2 = Bun.nanoseconds();

console.info(chalk.gray(`   🕐 Start: ${start2.toLocaleString()}ns`));
console.info(chalk.gray(`   🕐 Mid-point: ${midPoint.toLocaleString()}ns`));
console.info(chalk.gray(`   🕐 End: ${end2.toLocaleString()}ns`));
console.info(chalk.gray(`   ⏱️  First phase: ${(midPoint - start2).toLocaleString()}ns`));
console.info(chalk.gray(`   ⏱️  Second phase: ${(end2 - midPoint).toLocaleString()}ns`));
console.info(chalk.gray(`   ⏱️  Total: ${(end2 - start2).toLocaleString()}ns (${((end2 - start2) / 1_000_000).toFixed(2)}ms)`));

// Comparison with Date.now()
console.info(chalk.yellow('\n📊 Precision Comparison:'));
const startNano = Bun.nanoseconds();
const startMs = Date.now();

await Bun.sleep(5); // 5ms

const endNano = Bun.nanoseconds();
const endMs = Date.now();

const nanoDuration = endNano - startNano;
const msDuration = endMs - startMs;

console.info(chalk.gray(`   🕐 Bun.nanoseconds(): ${nanoDuration.toLocaleString()}ns (${(nanoDuration / 1_000_000).toFixed(3)}ms)`));
console.info(chalk.gray(`   📅 Date.now(): ${msDuration}ms`));
console.info(chalk.gray(`   📏 Precision difference: ${(nanoDuration / 1_000_000 - msDuration).toFixed(3)}ms`));

// Real-world usage example
console.info(chalk.yellow('\n💡 Real-World Usage Example:'));

async function measureFunction<T>(fn: () => T | Promise<T>, name: string): Promise<{ result: T; duration: number }> {
    const start = Bun.nanoseconds();
    const result = await fn();
    const end = Bun.nanoseconds();
    const duration = end - start;

    console.info(chalk.gray(`   ⏱️  ${name}: ${(duration / 1_000_000).toFixed(3)}ms (${duration.toLocaleString()}ns)`));
    return { result, duration };
}

// Test different operations
const operations = [
    { fn: () => Array(1000).fill(0).map(Math.random), name: 'Array generation' },
    { fn: () => JSON.stringify({ data: Array(100).fill('test') }), name: 'JSON serialization' },
    { fn: () => Buffer.alloc(1024).toString('base64'), name: 'Base64 encoding' },
    { fn: async () => Bun.sleep(1), name: '1ms sleep' }
];

console.info(chalk.gray('   🔄 Measuring various operations:'));
for (const op of operations) {
    await measureFunction(op.fn, op.name);
}

// Performance characteristics
console.info(chalk.blue('\n📊 Performance Characteristics:'));
console.info(chalk.gray('   • Precision: Nanosecond-level (1,000,000x more precise than milliseconds)'));
console.info(chalk.gray('   • Overhead: Minimal (native implementation)'));
console.info(chalk.gray('   • Use case: Performance profiling, benchmarking, optimization'));
console.info(chalk.gray('   • Reliability: Monotonic clock (not affected by system time changes)'));

// Best practices
console.info(chalk.blue('\n✅ Best Practices:'));
console.info(chalk.gray('   // Measure async operations'));
console.info(chalk.gray('   const start = Bun.nanoseconds();'));
console.info(chalk.gray('   await someAsyncOperation();'));
console.info(chalk.gray('   const duration = Bun.nanoseconds() - start;'));
console.info(chalk.gray(''));
console.info(chalk.gray('   // Measure synchronous operations'));
console.info(chalk.gray('   const start = Bun.nanoseconds();'));
console.info(chalk.gray('   const result = expensiveComputation();'));
console.info(chalk.gray('   const duration = Bun.nanoseconds() - start;'));
console.info(chalk.gray(''));
console.info(chalk.gray('   // Convert to human-readable format'));
console.info(chalk.gray('   const ms = duration / 1_000_000; // milliseconds'));
console.info(chalk.gray('   const μs = duration / 1_000; // microseconds'));

console.info(chalk.green('\n✅ High-precision timing demo completed!'));
