/**
 * [BENCHMARK][CUSTOM-TYPED-ARRAY][META:{category: performance, target: sub-100ms}]
 * Comprehensive performance benchmarks for CustomTypedArray
 * #REF:CustomTypedArray, #REF:Bun.inspect.custom, #REF:surgical-precision]
 */

import { CustomTypedArray } from '../src/types/custom-typed-array';

console.log('=== CUSTOM TYPED ARRAY BENCHMARK SUITE ===\n');

// Test 1: Memory allocation performance
console.log('📊 1. Memory Allocation & Security:');
const startAlloc = performance.now();
for (let i = 0; i < 1000; i++) {
  new CustomTypedArray(1024, 'bench');
}
const allocTime = performance.now() - startAlloc;
console.log(`   ✓ 1000 x 1KB allocations: ${allocTime.toFixed(2)}ms`);
console.log(`   ✓ Per allocation: ${(allocTime / 1000).toFixed(4)}ms`);

// Test 2: Depth-aware inspection performance
console.log('\n📊 2. Depth-Aware Inspection Performance:');
const arr = new CustomTypedArray(256, 'test');
arr.fill(0xAB);

let time0: number | undefined, time1: number | undefined, time2: number | undefined;
const BunInspect = (globalThis as any).Bun?.inspect;
if (BunInspect) {
  // Depth 0 (shallow) - nested in objects
  const start0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    BunInspect(arr, { depth: 0 });
  }
  time0 = performance.now() - start0;
  console.log(`   ✓ Depth 0 (1000x): ${time0.toFixed(2)}ms - ${time0 < 100 ? '✅' : '⚠️'} <100ms target`);
  
  // Depth 1 (preview) - direct inspection
  const start1 = performance.now();
  for (let i = 0; i < 1000; i++) {
    BunInspect(arr, { depth: 1 });
  }
  time1 = performance.now() - start1;
  console.log(`   ✓ Depth 1 (1000x): ${time1.toFixed(2)}ms - ${time1 < 100 ? '✅' : '⚠️'} <100ms target`);
  
  // Depth 2+ (full dump) - debugging mode
  const start2 = performance.now();
  for (let i = 0; i < 100; i++) {
    BunInspect(arr, { depth: 2 });
  }
  time2 = performance.now() - start2;
  console.log(`   ✓ Depth 2 (100x): ${time2.toFixed(2)}ms - ${time2 < 50 ? '✅' : '⚠️'} <50ms target`);
}

// Test 3: Subarray performance
console.log('\n📊 3. Subarray Operations:');
const parent = new CustomTypedArray(1024, 'parent');
const startSub = performance.now();
for (let i = 0; i < 100; i++) {
  const sub = parent.subarray(i * 4, (i + 1) * 4);
  sub.toHex();
}
const subTime = performance.now() - startSub;
console.log(`   ✓ 100 subarray operations: ${subTime.toFixed(2)}ms`);
console.log(`   ✓ Per operation: ${(subTime / 100).toFixed(4)}ms`);

// Test 4: Security validation
console.log('\n📊 4. Security Validation:');
const startSecurity = performance.now();
const consoleWarnSpy = console.warn;
let warnCount = 0;
console.warn = (...args: any[]) => { warnCount++; };
new CustomTypedArray(11 * 1024 * 1024, 'large');
console.warn = consoleWarnSpy;
const securityTime = performance.now() - startSecurity;
console.log(`   ✓ Large allocation detection: ${securityTime.toFixed(2)}ms`);
console.log(`   ✓ Warnings triggered: ${warnCount}`);

// Test 5: Real-world scenario - Odds Feed Processing
console.log('\n📊 5. Real-World Scenario (Odds Feed):');
const feedData = new Uint8Array(256);
const view = new DataView(feedData.buffer);
view.setUint32(0, 0x42554655, true); // Magic
view.setBigUint64(4, BigInt(Date.now() * 1000), true); // Timestamp
view.setUint16(12, 2, true); // Market count
view.setUint32(14, 12345, true); // Market ID
view.setUint32(18, 67890, true); // Event ID
view.setFloat64(22, 1.85, true); // Odds

const startReal = performance.now();
for (let i = 0; i < 100; i++) {
  const custom = CustomTypedArray.fromUint8Array(feedData, 'feed');
  const parsed = {
    magic: view.getUint32(0, true),
    timestamp: view.getBigUint64(4, true),
    markets: view.getUint16(12, true),
    preview: custom.inspect(1, {}, (v: any) => JSON.stringify(v))
  };
}
const realTime = performance.now() - startReal;
console.log(`   ✓ 100 feed processing cycles: ${realTime.toFixed(2)}ms`);
console.log(`   ✓ Per cycle: ${(realTime / 100).toFixed(4)}ms`);

// Test 6: Factory methods
console.log('\n📊 6. Factory Methods:');
const sourceArray = new Uint8Array([1, 2, 3, 4, 5]);
const sourceBuffer = new ArrayBuffer(10);
new Uint8Array(sourceBuffer).set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

const startFactory = performance.now();
for (let i = 0; i < 1000; i++) {
  CustomTypedArray.fromUint8Array(sourceArray, 'factory-test');
  CustomTypedArray.fromBuffer(sourceBuffer, 2, 5, 'buffer-test');
}
const factoryTime = performance.now() - startFactory;
console.log(`   ✓ 1000 factory conversions: ${factoryTime.toFixed(2)}ms`);
console.log(`   ✓ Per conversion: ${(factoryTime / 1000).toFixed(4)}ms`);

// Test 7: Hex conversion performance
console.log('\n📊 7. Hex Conversion:');
const hexArray = new CustomTypedArray(64, 'hex-test');
hexArray.fill(0xAB);

const startHex = performance.now();
for (let i = 0; i < 1000; i++) {
  hexArray.toHex();
}
const hexTime = performance.now() - startHex;
console.log(`   ✓ 1000 hex conversions: ${hexTime.toFixed(2)}ms`);
console.log(`   ✓ Per conversion: ${(hexTime / 1000).toFixed(4)}ms`);

// Summary
console.log('\n📈 SUMMARY:');
const allTimes = [allocTime, subTime, securityTime, realTime, factoryTime, hexTime];
if (typeof time0 !== 'undefined') allTimes.push(time0);
if (typeof time1 !== 'undefined') allTimes.push(time1);
if (typeof time2 !== 'undefined') allTimes.push(time2);

const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
const maxTime = Math.max(...allTimes);

console.log(`   Average operation time: ${avgTime.toFixed(2)}ms`);
console.log(`   Slowest operation: ${maxTime.toFixed(2)}ms`);
console.log(`   All operations < 100ms: ${maxTime < 100 ? '✅ PASS' : '⚠️ REVIEW'}`);

// Memory usage
if (globalThis.process && globalThis.process.memoryUsage) {
  const mem = globalThis.process.memoryUsage();
  console.log(`\n💾 Memory Usage:`);
  console.log(`   RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}

console.log('\n✅ Benchmark completed successfully!');
