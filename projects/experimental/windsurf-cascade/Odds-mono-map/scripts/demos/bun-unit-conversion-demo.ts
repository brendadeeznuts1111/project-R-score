#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-unit-conversion-demo
 * 
 * Bun Unit Conversion Demo
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

console.info(chalk.blue.bold('🕐 Bun.nanoseconds() Unit Conversion Demo'));
console.info(chalk.gray('Demonstrating nanosecond to various time unit conversions\n'));

// Get current nanoseconds
const nanoseconds = Bun.nanoseconds();

console.info(chalk.yellow('🔄 Unit Conversions:'));
console.info(chalk.gray(`   🕐 Raw nanoseconds: ${nanoseconds.toLocaleString()}ns`));

// Convert to different units
const milliseconds = nanoseconds / 1_000_000;
const microseconds = nanoseconds / 1_000;
const seconds = nanoseconds / 1_000_000_000;

console.info(chalk.gray(`   📅 Milliseconds: ${milliseconds.toFixed(3)}ms`));
console.info(chalk.gray(`   📐 Microseconds: ${microseconds.toFixed(0)}μs`));
console.info(chalk.gray(`   ⏰ Seconds: ${seconds.toFixed(6)}s`));

// Practical timing example
console.info(chalk.yellow('\n⏱️  Practical Timing Example:'));
const start = Bun.nanoseconds();

// Simulate some work
await Bun.sleep(5); // 5ms

const end = Bun.nanoseconds();
const duration = end - start;

console.info(chalk.gray(`   🕐 Duration (raw): ${duration.toLocaleString()}ns`));
console.info(chalk.gray(`   📅 Duration (ms): ${(duration / 1_000_000).toFixed(3)}ms`));
console.info(chalk.gray(`   📐 Duration (μs): ${(duration / 1_000).toFixed(0)}μs`));
console.info(chalk.gray(`   ⏰ Duration (s): ${(duration / 1_000_000_000).toFixed(6)}s`));

// Conversion functions
console.info(chalk.yellow('\n🔧 Conversion Functions:'));

function toMs(ns: number): number {
    return ns / 1_000_000;
}

function toμs(ns: number): number {
    return ns / 1_000;
}

function toSeconds(ns: number): number {
    return ns / 1_000_000_000;
}

// Test conversion functions
const testDuration = 5_123_456_789; // ~5.123 seconds

console.info(chalk.gray(`   🧪 Test duration: ${testDuration.toLocaleString()}ns`));
console.info(chalk.gray(`   📅 toMs(): ${toMs(testDuration).toFixed(3)}ms`));
console.info(chalk.gray(`   📐 toμs(): ${toμs(testDuration).toFixed(0)}μs`));
console.info(chalk.gray(`   ⏰ toSeconds(): ${toSeconds(testDuration).toFixed(6)}s`));

// Real-world usage patterns
console.info(chalk.yellow('\n💡 Real-World Usage Patterns:'));

console.info(chalk.gray('   // Performance monitoring'));
console.info(chalk.gray('   const start = Bun.nanoseconds();'));
console.info(chalk.gray('   await operation();'));
console.info(chalk.gray('   const duration = Bun.nanoseconds() - start;'));
console.info(chalk.gray('   console.info(`Operation took: ${(duration / 1_000_000).toFixed(2)}ms`);'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // High-precision benchmarking'));
console.info(chalk.gray('   const start = Bun.nanoseconds();'));
console.info(chalk.gray('   const result = expensiveFunction();'));
console.info(chalk.gray('   const μs = (Bun.nanoseconds() - start) / 1_000;'));
console.info(chalk.gray('   console.info(`Function took: ${μs.toFixed(0)}μs`);'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Rate limiting'));
console.info(chalk.gray('   const start = Bun.nanoseconds();'));
console.info(chalk.gray('   const elapsed = (Bun.nanoseconds() - start) / 1_000_000;'));
console.info(chalk.gray('   if (elapsed < 100) await Bun.sleep(100 - elapsed);'));

// Precision comparison table
console.info(chalk.yellow('\n📊 Precision Comparison:'));

const timings = [
    { name: 'Fast operation', ns: 123_456 },
    { name: 'Medium operation', ns: 1_234_567_890 },
    { name: 'Slow operation', ns: 12_345_678_901 }
];

console.info(chalk.gray('   ┌─────────────────┬──────────────┬────────────┬─────────────┬───────────┐'));
console.info(chalk.gray('   │ Operation       │ Nanoseconds  │ Milliseconds│ Microseconds│ Seconds    │'));
console.info(chalk.gray('   ├─────────────────┼──────────────┼────────────┼─────────────┼───────────┤'));

timings.forEach(timing => {
    const ms = timing.ns / 1_000_000;
    const μs = timing.ns / 1_000;
    const s = timing.ns / 1_000_000_000;

    console.info(chalk.gray(`   │ ${timing.name.padEnd(15)} │ ${timing.ns.toLocaleString().padEnd(12)} │ ${ms.toFixed(3).padEnd(10)} │ ${μs.toFixed(0).padEnd(11)} │ ${s.toFixed(6).padEnd(9)} │`));
});

console.info(chalk.gray('   └─────────────────┴──────────────┴────────────┴─────────────┴───────────┘'));

// Best practices summary
console.info(chalk.blue('\n✅ Unit Conversion Best Practices:'));
console.info(chalk.gray('   • Use / 1_000_000 for milliseconds (most common)'));
console.info(chalk.gray('   • Use / 1_000 for microseconds (fine-grained timing)'));
console.info(chalk.gray('   • Use / 1_000_000_000 for seconds (long operations)'));
console.info(chalk.gray('   • Use toLocaleString() for readable large numbers'));
console.info(chalk.gray('   • Use toFixed() for consistent decimal places'));
console.info(chalk.gray('   • Consider the precision needed for your use case'));

console.info(chalk.green('\n✅ Unit conversion demo completed!'));
