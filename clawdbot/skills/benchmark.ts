#!/usr/bin/env bun
/**
 * benchmark.ts
 * Benchmark Bun v1.3.6 JSON serialization improvements
 * Usage: bun run benchmark.ts
 */

import skills from "./skills.json";

const ITERATIONS = 1000;

// Large payload similar to skills data
const largePayload = {
  id: Bun.randomUUIDv7(),
  timestamp: new Date().toISOString(),
  skills: skills.skills,
  meta: skills.meta,
  categories: skills.categories,
  tags: skills.tags,
  combos: skills.combos,
  nested: {
    deep: {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        tags: ["tag1", "tag2", "tag3"],
        config: { enabled: true, priority: i % 5 },
      })),
    },
  },
};

console.log("Bun JSON Serialization Benchmark");
console.log("═".repeat(50));
console.log(`Bun version: ${Bun.version}`);
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Payload size: ~${JSON.stringify(largePayload).length} bytes`);
console.log("");

// Benchmark 1: JSON.stringify
console.log("1. JSON.stringify()");
const start1 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  JSON.stringify(largePayload);
}
const time1 = (Bun.nanoseconds() - start1) / 1_000_000;
console.log(`   ${time1.toFixed(2)}ms total, ${(time1 / ITERATIONS).toFixed(3)}ms per op`);

// Benchmark 2: Response.json() - 3.5x faster
console.log("\n2. Response.json() [3.5x faster path]");
const start2 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  Response.json(largePayload);
}
const time2 = (Bun.nanoseconds() - start2) / 1_000_000;
console.log(`   ${time2.toFixed(2)}ms total, ${(time2 / ITERATIONS).toFixed(3)}ms per op`);
console.log(`   Speedup: ${(time1 / time2).toFixed(2)}x`);

// Benchmark 3: console.log with %j - SIMD FastStringifier
console.log("\n3. console.log('%j') [SIMD FastStringifier]");
const devNull = Bun.file("/dev/null").writer();
const origLog = console.log;
console.log = (...args) => devNull.write(args.join(" ")); // Suppress output

const start3 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  console.log("%j", largePayload);
}
const time3 = (Bun.nanoseconds() - start3) / 1_000_000;
console.log = origLog;
console.log(`   ${time3.toFixed(2)}ms total, ${(time3 / ITERATIONS).toFixed(3)}ms per op`);
console.log(`   Speedup vs stringify: ${(time1 / time3).toFixed(2)}x`);

// Benchmark 4: Bun.hash.crc32 - hardware accelerated
console.log("\n4. Bun.hash.crc32() [Hardware accelerated]");
const testData = new TextEncoder().encode(JSON.stringify(largePayload));
const start4 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  Bun.hash.crc32(testData);
}
const time4 = (Bun.nanoseconds() - start4) / 1_000_000;
console.log(`   ${time4.toFixed(2)}ms total, ${(time4 / ITERATIONS).toFixed(3)}ms per op`);
console.log(`   Throughput: ${((testData.length * ITERATIONS) / (time4 / 1000) / 1_000_000).toFixed(2)} MB/s`);

// Benchmark 5: Bun.color parsing
console.log("\n5. Bun.color() parsing");
const colors = ["#22c55e", "#f97316", "#eab308", "#dc2626", "#a855f7"];
const start5 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  colors.forEach(c => Bun.color(c, "{rgba}"));
}
const time5 = (Bun.nanoseconds() - start5) / 1_000_000;
console.log(`   ${time5.toFixed(2)}ms total, ${(time5 / ITERATIONS).toFixed(3)}ms per ${colors.length} colors`);

// Summary
console.log("\n" + "═".repeat(50));
console.log("Summary:");
console.log(`  JSON.stringify:    ${(time1 / ITERATIONS).toFixed(3)}ms/op (baseline)`);
console.log(`  Response.json():   ${(time1 / time2).toFixed(2)}x faster`);
console.log(`  console.log(%j):   ${(time1 / time3).toFixed(2)}x faster`);
console.log(`  CRC32 throughput:  ${((testData.length * ITERATIONS) / (time4 / 1000) / 1_000_000).toFixed(0)} MB/s`);
