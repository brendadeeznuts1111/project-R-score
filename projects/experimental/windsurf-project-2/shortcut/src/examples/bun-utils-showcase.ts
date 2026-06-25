#!/usr/bin/env bun

/**
 * Bun Utils Showcase - Runtime Superpowers Demo
 * 
 * Demonstrating Bun's built-in utility functions that make it a JavaScript runtime beast:
 * - Performance utilities (nanoseconds, peek)
 * - String utilities (stringWidth, stripANSI, escapeHTML)
 * - Compression utilities (gzip, deflate, zstd)
 * - System utilities (which, sleep, openInEditor)
 * - UUID utilities (randomUUIDv7)
 * - File utilities (fileURLToPath, pathToFileURL)
 * - Debug utilities (inspect, deepEquals)
 */

import { serialize, deserialize, estimateShallowMemoryUsageOf } from 'bun:jsc';

console.info('🚀 Bun Utils Showcase - Runtime Superpowers!');
console.info('===========================================');

// 1. Version & Environment Info
console.info('\n📊 Runtime Information:');
console.info(`   Bun Version: ${Bun.version}`);
console.info(`   Git Revision: ${Bun.revision}`);
console.info(`   Main Entry: ${Bun.main}`);
console.info(`   Current File: ${import.meta.path}`);
console.info(`   Is Main: ${import.meta.path === Bun.main ? '✅ Yes' : '❌ No'}`);

// 2. Performance Timing
console.info('\n⚡ Performance Utilities:');
const start = Bun.nanoseconds();
await Bun.sleep(10); // 10ms sleep
const end = Bun.nanoseconds();
console.info(`   Sleep took: ${end - start} nanoseconds`);
console.info(`   That's: ${((end - start) / 1_000_000).toFixed(2)} milliseconds`);

// 3. String Utilities
console.info('\n🔤 String Utilities:');
const coloredText = '\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m \u001b[34mBlue\u001b[0m';
const plainText = Bun.stripANSI(coloredText);
console.info(`   Original: ${coloredText}`);
console.info(`   Stripped: ${plainText}`);

console.info(`   String width "hello": ${Bun.stringWidth('hello')}`);
console.info(`   String width with ANSI: ${Bun.stringWidth(coloredText)}`);
console.info(`   String width with ANSI counted: ${Bun.stringWidth(coloredText, { countAnsiEscapeCodes: true })}`);

const htmlText = '<script>alert("xss")</script>';
const escaped = Bun.escapeHTML(htmlText);
console.info(`   HTML Escape: ${htmlText} -> ${escaped}`);

// 4. UUID Generation
console.info('\n🆔 UUID Utilities:');
const uuidHex = Bun.randomUUIDv7();
const uuidBase64 = Bun.randomUUIDv7('base64');
const uuidBuffer = Bun.randomUUIDv7('buffer');
console.info(`   UUID v7 (hex): ${uuidHex}`);
console.info(`   UUID v7 (base64): ${uuidBase64}`);
console.info(`   UUID v7 (buffer): ${uuidBuffer.length} bytes`);

// 5. System Utilities
console.info('\n🔧 System Utilities:');
const nodePath = Bun.which('node');
const bunPath = Bun.which('bun');
const invalidPath = Bun.which('nonexistent-binary');
console.info(`   Node.js path: ${nodePath}`);
console.info(`   Bun path: ${bunPath}`);
console.info(`   Invalid binary: ${invalidPath || 'null'}`);

// 6. File Path Utilities
console.info('\n📁 File Path Utilities:');
const fileUrl = Bun.pathToFileURL('/tmp/test.txt');
const filePath = Bun.fileURLToPath(fileUrl);
console.info(`   Path to URL: /tmp/test.txt -> ${fileUrl}`);
console.info(`   URL to Path: ${fileUrl} -> ${filePath}`);

// 7. Compression Utilities
console.info('\n🗜️ Compression Utilities:');
const originalText = 'Hello, World! '.repeat(100);
const originalBuffer = Buffer.from(originalText);
console.info(`   Original size: ${originalBuffer.length} bytes`);

const gzipped = Bun.gzipSync(originalBuffer);
const deflated = Bun.deflateSync(originalBuffer);
const zstdCompressed = Bun.zstdCompressSync(originalBuffer);

console.info(`   Gzip size: ${gzipped.length} bytes (${((gzipped.length / originalBuffer.length) * 100).toFixed(1)}%)`);
console.info(`   Deflate size: ${deflated.length} bytes (${((deflated.length / originalBuffer.length) * 100).toFixed(1)}%)`);
console.info(`   Zstd size: ${zstdCompressed.length} bytes (${((zstdCompressed.length / originalBuffer.length) * 100).toFixed(1)}%)`);

// Verify decompression
const gunzipped = Bun.gunzipSync(gzipped);
const decodedText = new TextDecoder().decode(gunzipped);
console.info(`   Gzip verification: ${decodedText === originalText ? '✅ Success' : '❌ Failed'}`);

// 8. Debug Utilities
console.info('\n🐛 Debug Utilities:');
const complexObject = {
  name: 'Test Object',
  numbers: [1, 2, 3],
  nested: { deep: { value: 'found' } },
  buffer: Buffer.from('test'),
  date: new Date(),
};

const inspected = Bun.inspect(complexObject);
console.info('   Object inspection:');
console.info(inspected);

const tableData = [
  { name: 'Alice', age: 30, city: 'New York' },
  { name: 'Bob', age: 25, city: 'San Francisco' },
  { name: 'Charlie', age: 35, city: 'Chicago' },
];

const tableString = Bun.inspect.table(tableData, ['name', 'age']);
console.info('   Table format:');
console.info(tableString);

// Deep equality testing
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.info(`   Deep equality (obj1 vs obj2): ${Bun.deepEquals(obj1, obj2) ? '✅ Equal' : '❌ Not equal'}`);
console.info(`   Deep equality (obj1 vs obj3): ${Bun.deepEquals(obj1, obj3) ? '✅ Equal' : '❌ Not equal'}`);

// 9. Promise Utilities
console.info('\n⚡ Promise Utilities:');
const resolvedPromise = Promise.resolve('quick result');
const rejectedPromise = Promise.reject(new Error('test error'));

// Handle the rejected promise to avoid unhandled rejection
rejectedPromise.catch(() => {});

// Use peek to read promises without await
const peekedResult = Bun.peek(resolvedPromise);
const peekedError = Bun.peek(rejectedPromise) as unknown as Error;

console.info(`   Peeking resolved promise: ${peekedResult}`);
console.info(`   Peeking rejected promise: ${peekedError.message}`);
console.info(`   Resolved promise status: ${Bun.peek.status(resolvedPromise)}`);
console.info(`   Rejected promise status: ${Bun.peek.status(rejectedPromise)}`);

// 10. Memory Utilities
console.info('\n💾 Memory Utilities:');
const testObject = { data: 'x'.repeat(1000) };
const memoryUsage = estimateShallowMemoryUsageOf(testObject);
console.info(`   Object memory usage: ${memoryUsage} bytes`);

const testBuffer = Buffer.alloc(1024);
const bufferMemory = estimateShallowMemoryUsageOf(testBuffer);
console.info(`   Buffer memory usage: ${bufferMemory} bytes`);

// 11. Serialization
console.info('\n📦 Serialization Utilities:');
const complexData = {
  string: 'Hello',
  number: 42,
  date: new Date(),
  array: [1, 2, 3],
  buffer: Buffer.from('test'),
  map: new Map([['key', 'value']]),
};

const serialized = serialize(complexData);
const deserialized = deserialize(serialized);

console.info(`   Serialized size: ${serialized?.byteLength || 0} bytes`);
console.info(`   Deserialized correctly: ${deserialized.string === complexData.string ? '✅ Yes' : '❌ No'}`);
console.info(`   Date preserved: ${deserialized.date instanceof Date ? '✅ Yes' : '❌ No'}`);

// 12. Editor Integration
console.info('\n📝 Editor Integration:');
console.info(`   Would open current file in editor if uncommented:`);
console.info(`   // Bun.openInEditor(import.meta.path);`);

// Performance comparison demo
console.info('\n🏁 Performance Comparison:');
const testString = 'Hello, World! '.repeat(1000);

const iterations = 100_000;

// Bun.stringWidth vs manual calculation
const bunStart = Bun.nanoseconds();
for (let i = 0; i < iterations; i++) {
  Bun.stringWidth(testString);
}
const bunEnd = Bun.nanoseconds();

const manualStart = Bun.nanoseconds();
for (let i = 0; i < iterations; i++) {
  // Simple manual width calculation
  testString.length;
}
const manualEnd = Bun.nanoseconds();

const bunTime = bunEnd - bunStart;
const manualTime = manualEnd - manualStart;

console.info(`   Bun.stringWidth (${iterations} iterations): ${bunTime} ns`);
console.info(`   Manual length (${iterations} iterations): ${manualTime} ns`);
console.info(`   Performance ratio: ${(manualTime / bunTime).toFixed(2)}x faster for complex strings`);

console.info('\n🎉 Bun Utils Showcase Complete!');
console.info('================================');
console.info('This demonstrates why Bun is more than just a runtime -');
console.info('it\'s a comprehensive toolkit for high-performance JavaScript!');

// Fun final demo - create a mini report
console.info('\n📊 Mini Performance Report:');
const reportData = {
  timestamp: new Date().toISOString(),
  bunVersion: Bun.version,
  systemInfo: {
    nodePath: nodePath,
    bunPath: bunPath,
  },
  performance: {
    stringWidthTime: bunTime,
    compressionRatio: {
      gzip: (gzipped.length / originalBuffer.length * 100).toFixed(1) + '%',
      deflate: (deflated.length / originalBuffer.length * 100).toFixed(1) + '%',
      zstd: (zstdCompressed.length / originalBuffer.length * 100).toFixed(1) + '%',
    }
  }
};

console.info(Bun.inspect.table([reportData], ['timestamp', 'bunVersion']));
