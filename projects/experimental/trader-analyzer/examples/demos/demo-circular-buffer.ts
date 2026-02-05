#!/usr/bin/env bun
/**
 * @fileoverview Demo script showcasing CircularBuffer with Bun.inspect.custom
 * @description Demonstrates CircularBuffer implementation with custom Bun.inspect.custom formatting for beautiful console output.
 * @module examples/demos/demo-circular-buffer
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.2.0.0.0.0;instance-id=EXAMPLE-CIRCULAR-BUFFER-001;version=6.4.2.0.0.0.0}]
 * [PROPERTIES:{example={value:"Circular Buffer Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.2.0.0.0.0"}}]
 * [CLASS:CircularBufferDemo][#REF:v-6.4.2.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.4.2.0.0.0.0
 * Ripgrep Pattern: 6\.4\.2\.0\.0\.0\.0|EXAMPLE-CIRCULAR-BUFFER-001|BP-EXAMPLE@6\.4\.2\.0\.0\.0\.0
 * 
 * @example 6.4.2.0.0.0.0.1: Basic Circular Buffer
 * // Test Formula:
 * // 1. Create CircularBuffer with capacity
 * // 2. Push items into buffer
 * // 3. Verify custom inspection output
 * // Expected Result: Buffer displays with custom formatting
 * //
 * // Snippet:
 * ```typescript
 * const buffer = new CircularBuffer<number>(10);
 * buffer.push(1, 2, 3);
 * console.log(buffer); // Custom formatted output
 * ```
 * 
 * // Ripgrep: 6.4.2.0.0.0.0
 * // Ripgrep: EXAMPLE-CIRCULAR-BUFFER-001
 * // Ripgrep: BP-EXAMPLE@6.4.2.0.0.0.0
 */

import { CircularBuffer, createCircularBuffer } from "../src/utils/circular-buffer";

console.log("\n" + "═".repeat(60));
console.log("  CircularBuffer Demo - Bun.inspect.custom Showcase");
console.log("═".repeat(60) + "\n");

// Example 1: Basic usage
console.log("📋 Example 1: Basic Circular Buffer");
console.log("-".repeat(60));
const buffer1 = new CircularBuffer<number>(10);
buffer1.push(1, 2, 3, 4, 5);
console.log(buffer1);
console.log();

// Example 2: Full buffer with overwrite
console.log("📋 Example 2: Full Buffer (Overwrites Oldest)");
console.log("-".repeat(60));
const buffer2 = new CircularBuffer<number>(5);
buffer2.push(1, 2, 3, 4, 5, 6, 7, 8); // Will overwrite oldest items
console.log(buffer2);
console.log();

// Example 3: Custom inspect with different options
console.log("📋 Example 3: Custom Inspect Options");
console.log("-".repeat(60));
const buffer3 = createCircularBuffer(20, Array.from({ length: 15 }, (_, i) => i + 1));

// Default inspection
console.log("Default:");
console.log(buffer3);
console.log();

// With showHidden option
console.log("With showHidden:");
console.log(Bun.inspect(buffer3, { showHidden: true }));
console.log();

// Compact format
console.log("Compact format:");
console.log(Bun.inspect(buffer3, { compact: true }));
console.log();

// Example 4: Large buffer (shows truncation)
console.log("📋 Example 4: Large Buffer (Truncation)");
console.log("-".repeat(60));
const buffer4 = new CircularBuffer<number>(1000);
for (let i = 1; i <= 500; i++) {
  buffer4.push(i);
}
console.log(buffer4);
console.log();

// Example 5: String buffer
console.log("📋 Example 5: String Buffer");
console.log("-".repeat(60));
const stringBuffer = new CircularBuffer<string>(5);
stringBuffer.push("apple", "banana", "cherry", "date", "elderberry");
console.log(stringBuffer);
console.log();

// Example 6: Object buffer
console.log("📋 Example 6: Object Buffer");
console.log("-".repeat(60));
interface Trade {
  symbol: string;
  price: number;
  volume: number;
}

const tradeBuffer = new CircularBuffer<Trade>(5);
tradeBuffer.push(
  { symbol: "BTC-USD", price: 50000, volume: 1.5 },
  { symbol: "ETH-USD", price: 3000, volume: 10 },
  { symbol: "SOL-USD", price: 100, volume: 50 }
);
console.log(tradeBuffer);
console.log();

// Example 7: Iteration
console.log("📋 Example 7: Iterator Support");
console.log("-".repeat(60));
const iterBuffer = createCircularBuffer(10, [1, 2, 3, 4, 5]);
console.log("Items via iterator:");
for (const item of iterBuffer) {
  process.stdout.write(`${item} `);
}
console.log("\n");

// Example 8: Performance stats
console.log("📋 Example 8: Buffer Statistics");
console.log("-".repeat(60));
const perfBuffer = new CircularBuffer<number>(1000);
const start = Bun.nanoseconds();
for (let i = 0; i < 10000; i++) {
  perfBuffer.push(i);
}
const duration = (Bun.nanoseconds() - start) / 1_000_000;

console.log(`Pushed 10,000 items in ${duration.toFixed(2)}ms`);
console.log(`Throughput: ${(10000 / duration * 1000).toFixed(0)} ops/sec`);
console.log(`Buffer size: ${perfBuffer.size}/${perfBuffer.capacity}`);
console.log(`Utilization: ${((perfBuffer.size / perfBuffer.capacity) * 100).toFixed(1)}%`);
console.log();

console.log("═".repeat(60));
console.log("  Demo Complete!");
console.log("═".repeat(60) + "\n");
