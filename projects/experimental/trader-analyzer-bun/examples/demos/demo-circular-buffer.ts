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
 * console.info(buffer); // Custom formatted output
 * ```
 * 
 * // Ripgrep: 6.4.2.0.0.0.0
 * // Ripgrep: EXAMPLE-CIRCULAR-BUFFER-001
 * // Ripgrep: BP-EXAMPLE@6.4.2.0.0.0.0
 */

import { CircularBuffer, createCircularBuffer } from "../src/utils/circular-buffer";

console.info("\n" + "═".repeat(60));
console.info("  CircularBuffer Demo - Bun.inspect.custom Showcase");
console.info("═".repeat(60) + "\n");

// Example 1: Basic usage
console.info("📋 Example 1: Basic Circular Buffer");
console.info("-".repeat(60));
const buffer1 = new CircularBuffer<number>(10);
buffer1.push(1, 2, 3, 4, 5);
console.info(buffer1);
console.info();

// Example 2: Full buffer with overwrite
console.info("📋 Example 2: Full Buffer (Overwrites Oldest)");
console.info("-".repeat(60));
const buffer2 = new CircularBuffer<number>(5);
buffer2.push(1, 2, 3, 4, 5, 6, 7, 8); // Will overwrite oldest items
console.info(buffer2);
console.info();

// Example 3: Custom inspect with different options
console.info("📋 Example 3: Custom Inspect Options");
console.info("-".repeat(60));
const buffer3 = createCircularBuffer(20, Array.from({ length: 15 }, (_, i) => i + 1));

// Default inspection
console.info("Default:");
console.info(buffer3);
console.info();

// With showHidden option
console.info("With showHidden:");
console.info(Bun.inspect(buffer3, { showHidden: true }));
console.info();

// Compact format
console.info("Compact format:");
console.info(Bun.inspect(buffer3, { compact: true }));
console.info();

// Example 4: Large buffer (shows truncation)
console.info("📋 Example 4: Large Buffer (Truncation)");
console.info("-".repeat(60));
const buffer4 = new CircularBuffer<number>(1000);
for (let i = 1; i <= 500; i++) {
  buffer4.push(i);
}
console.info(buffer4);
console.info();

// Example 5: String buffer
console.info("📋 Example 5: String Buffer");
console.info("-".repeat(60));
const stringBuffer = new CircularBuffer<string>(5);
stringBuffer.push("apple", "banana", "cherry", "date", "elderberry");
console.info(stringBuffer);
console.info();

// Example 6: Object buffer
console.info("📋 Example 6: Object Buffer");
console.info("-".repeat(60));
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
console.info(tradeBuffer);
console.info();

// Example 7: Iteration
console.info("📋 Example 7: Iterator Support");
console.info("-".repeat(60));
const iterBuffer = createCircularBuffer(10, [1, 2, 3, 4, 5]);
console.info("Items via iterator:");
for (const item of iterBuffer) {
  process.stdout.write(`${item} `);
}
console.info("\n");

// Example 8: Performance stats
console.info("📋 Example 8: Buffer Statistics");
console.info("-".repeat(60));
const perfBuffer = new CircularBuffer<number>(1000);
const start = Bun.nanoseconds();
for (let i = 0; i < 10000; i++) {
  perfBuffer.push(i);
}
const duration = (Bun.nanoseconds() - start) / 1_000_000;

console.info(`Pushed 10,000 items in ${duration.toFixed(2)}ms`);
console.info(`Throughput: ${(10000 / duration * 1000).toFixed(0)} ops/sec`);
console.info(`Buffer size: ${perfBuffer.size}/${perfBuffer.capacity}`);
console.info(`Utilization: ${((perfBuffer.size / perfBuffer.capacity) * 100).toFixed(1)}%`);
console.info();

console.info("═".repeat(60));
console.info("  Demo Complete!");
console.info("═".repeat(60) + "\n");
