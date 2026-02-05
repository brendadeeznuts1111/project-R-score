#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-advanced-demo
 * 
 * Bun Advanced Demo
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
import { estimateShallowMemoryUsageOf, serialize, deserialize } from 'bun:jsc';

console.log(chalk.blue.bold('🔧 Advanced Bun Utilities Demo'));
console.log(chalk.gray('Demonstrating compression, inspection, streams, and memory utilities\n'));

// Compression utilities
console.log(chalk.yellow('📦 Compression Utilities:'));

const testData = 'Hello World! '.repeat(100);
const buffer = Buffer.from(testData);

console.log(chalk.gray(`   📊 Original data: ${buffer.length} bytes`));

// GZIP
const gzipped = Bun.gzipSync(buffer);
const gunzipped = Bun.gunzipSync(gzipped);
console.log(chalk.gray(`   🗜️  GZIP: ${gzipped.length} bytes (${Math.round((1 - gzipped.length / buffer.length) * 100)}% reduction)`));

// DEFLATE
const deflated = Bun.deflateSync(buffer);
const inflated = Bun.inflateSync(deflated);
console.log(chalk.gray(`   🗜️  DEFLATE: ${deflated.length} bytes (${Math.round((1 - deflated.length / buffer.length) * 100)}% reduction)`));

// Zstandard
const zstdCompressed = Bun.zstdCompressSync(buffer, { level: 6 });
const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
console.log(chalk.gray(`   🗜️  ZSTD: ${zstdCompressed.length} bytes (${Math.round((1 - zstdCompressed.length / buffer.length) * 100)}% reduction)`));

// Verify decompression
console.log(chalk.gray(`   ✅ All decompression successful: ${gunzipped.toString() === buffer.toString() && inflated.toString() === buffer.toString() && zstdDecompressed.toString() === buffer.toString()}`));

// Inspect utilities
console.log(chalk.yellow('\n📊 Inspect Utilities:'));

const testObject = {
    name: 'Demo',
    version: '1.0.0',
    config: { debug: true, timeout: 5000 },
    features: ['compression', 'inspection', 'streams']
};

const testArray = new Uint8Array([10, 20, 30, 40, 50]);

console.log(chalk.gray('   📋 Object inspection:'));
console.log(chalk.gray(`      ${Bun.inspect(testObject).replace(/\n/g, '\n      ')}`));

console.log(chalk.gray(`   📋 Typed array inspection: ${Bun.inspect(testArray)}`));

// Table formatting
const validationResults = [
    { file: 'validate.ts', errors: 5, warnings: 12, status: '⚠️', score: 85 },
    { file: 'demo.md', errors: 0, warnings: 2, status: '✅', score: 98 },
    { file: 'test.js', errors: 3, warnings: 1, status: '❌', score: 72 },
    { file: 'config.json', errors: 0, warnings: 0, status: '✅', score: 100 }
];

console.log(chalk.gray('\n   📊 Table format (all columns):'));
const fullTable = Bun.inspect.table(validationResults);
console.log(chalk.gray(`      ${fullTable.replace(/\n/g, '\n      ')}`));

console.log(chalk.gray('\n   📊 Table format (selected columns):'));
const selectedTable = Bun.inspect.table(validationResults, ['file', 'errors', 'status']);
console.log(chalk.gray(`      ${selectedTable.replace(/\n/g, '\n      ')}`));

// Path utilities
console.log(chalk.yellow('\n🗂️  Path Utilities:'));

const currentPath = import.meta.path;
const fileUrl = Bun.pathToFileURL(currentPath);
const backToPath = Bun.fileURLToPath(fileUrl);

console.log(chalk.gray(`   📁 Current path: ${currentPath}`));
console.log(chalk.gray(`   🌐 File URL: ${fileUrl}`));
console.log(chalk.gray(`   🔄 Back to path: ${backToPath}`));
console.log(chalk.gray(`   ✅ Round-trip successful: ${currentPath === backToPath}`));

// Module resolution
console.log(chalk.yellow('\n🔧 Module Resolution:'));

try {
    const resolvedPath = Bun.resolveSync('./validate.ts', import.meta.dir);
    console.log(chalk.gray(`   🔍 Resolved validate.ts: ${resolvedPath}`));
} catch (error) {
    console.log(chalk.red(`   ❌ Resolution failed: ${error.message}`));
}

// Memory utilities
console.log(chalk.yellow('\n💾 Memory Utilities:'));

const smallObject = { name: 'test', value: 42 };
const mediumArray = Array(100).fill(0).map((_, i) => ({ id: i, data: `item-${i}` }));
const largeBuffer = Buffer.alloc(10 * 1024); // 10KB

console.log(chalk.gray(`   📊 Small object: ~${estimateShallowMemoryUsageOf(smallObject)} bytes`));
console.log(chalk.gray(`   📊 Medium array (100 items): ~${estimateShallowMemoryUsageOf(mediumArray)} bytes`));
console.log(chalk.gray(`   📊 Large buffer (10KB): ~${estimateShallowMemoryUsageOf(largeBuffer)} bytes`));

// Serialization
console.log(chalk.yellow('\n🔄 Serialization Utilities:'));

const complexObject = {
    metadata: { version: '1.0.0', created: new Date().toISOString() },
    data: { numbers: [1, 2, 3], text: 'Hello World', nested: { active: true } },
    features: ['serialize', 'deserialize', 'memory-efficient']
};

const serialized = serialize(complexObject);
const deserialized = deserialize(serialized);

console.log(chalk.gray(`   📦 Serialized size: ${serialized.byteLength} bytes`));
console.log(chalk.gray(`   ✅ Deserialization successful: ${Bun.deepEquals(complexObject, deserialized)}`));

// String utilities
console.log(chalk.yellow('\n🎨 String Utilities:'));

const coloredText = '\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m \u001b[34mBlue\u001b[0m';
const plainText = Bun.stripANSI(coloredText);
const ansiWidth = Bun.stringWidth(coloredText, { countAnsiEscapeCodes: true });
const displayWidth = Bun.stringWidth(coloredText);

console.log(chalk.gray(`   🎨 Original: "${coloredText}"`));
console.log(chalk.gray(`   🎨 Stripped: "${plainText}"`));
console.log(chalk.gray(`   📏 Width with ANSI codes: ${ansiWidth}`));
console.log(chalk.gray(`   📏 Visual display width: ${displayWidth}`));

// HTML escaping
console.log(chalk.yellow('\n🛡️  HTML Security:'));

const unsafeHTML = '<script>alert("XSS")</script>';
const safeHTML = Bun.escapeHTML(unsafeHTML);

console.log(chalk.gray(`   ⚠️  Unsafe: ${unsafeHTML}`));
console.log(chalk.gray(`   ✅ Safe: ${safeHTML}`));

// Performance timing
console.log(chalk.yellow('\n🕐 Performance Timing:'));

const startNanos = Bun.nanoseconds();
await Bun.sleep(10); // 10ms
const endNanos = Bun.nanoseconds();
const durationNanos = endNanos - startNanos;

console.log(chalk.gray(`   🕐 Start: ${startNanos} nanoseconds`));
console.log(chalk.gray(`   🕐 End: ${endNanos} nanoseconds`));
console.log(chalk.gray(`   ⏱️  Duration: ${durationNanos} nanoseconds (${(durationNanos / 1_000_000).toFixed(2)}ms)`));

// Practical examples
console.log(chalk.blue('\n💡 Practical Usage Examples:'));

console.log(chalk.gray('   // Data compression for storage'));
console.log(chalk.gray('   function compressData(data) {'));
console.log(chalk.gray('     const buffer = Buffer.from(JSON.stringify(data));'));
console.log(chalk.gray('     return Bun.gzipSync(buffer);'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // Pretty table formatting'));
console.log(chalk.gray('   function formatReport(data) {'));
console.log(chalk.gray('     return Bun.inspect.table(data, ["name", "score", "status"]);'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // Memory usage monitoring'));
console.log(chalk.gray('   function checkMemoryUsage(obj) {'));
console.log(chalk.gray('     return estimateShallowMemoryUsageOf(obj);'));
console.log(chalk.gray('   }'));

console.log(chalk.gray('\n   // High-precision timing'));
console.log(chalk.gray('   function measureTime(fn) {'));
console.log(chalk.gray('     const start = Bun.nanoseconds();'));
console.log(chalk.gray('     const result = fn();'));
console.log(chalk.gray('     const end = Bun.nanoseconds();'));
console.log(chalk.gray('     return { result, duration: end - start };'));
console.log(chalk.gray('   }'));

console.log(chalk.green('\n✅ Advanced utilities demo completed!'));
