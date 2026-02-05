#!/usr/bin/env bun

/**
 * Bun.write() Comprehensive Demo - Enhanced Version
 * Demonstrates all data types and advanced file operations
 * 
 * Features:
 * - All data types supported by Bun.write()
 * - File streaming with progress tracking
 * - Async iteration for large files
 * - File metadata and statistics
 * - Batch file operations
 */

import { mkdir } from 'fs/promises';

const OUTPUT_DIR = "./bun-write-demo";
await mkdir(OUTPUT_DIR, { recursive: true });

console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

// ============================================================================
// 1. Write string
// ============================================================================
console.log("1️⃣  Writing string to file...");

const textContent = `Hello from Bun.write()!
This is a text file written using a string.
Timestamp: ${new Date().toISOString()}
`;

const textPath = `${OUTPUT_DIR}/text-file.txt`;
const bytesWritten1 = await Bun.write(textPath, textContent);
console.log(`   ✅ Wrote ${bytesWritten1} bytes to: ${textPath}`);

// ============================================================================
// 2. Write Blob
// ============================================================================
console.log("\n2️⃣  Writing Blob to file...");

const blobContent = new Blob(["This is blob content!\n", "Written using Bun.write()\n"], { type: "text/plain" });
const blobPath = `${OUTPUT_DIR}/blob-file.txt`;
const bytesWritten2 = await Bun.write(blobPath, blobContent);
console.log(`   ✅ Wrote ${bytesWritten2} bytes to: ${blobPath}`);

// ============================================================================
// 3. Write ArrayBuffer
// ============================================================================
console.log("\n3️⃣  Writing ArrayBuffer to file...");

const arrayBuffer = new ArrayBuffer(100);
const view = new Uint8Array(arrayBuffer);
for (let i = 0; i < 100; i++) view[i] = i % 256;

const arrayBufferPath = `${OUTPUT_DIR}/arraybuffer.bin`;
const bytesWritten3 = await Bun.write(arrayBufferPath, arrayBuffer);
console.log(`   ✅ Wrote ${bytesWritten3} bytes to: ${arrayBufferPath}`);

// ============================================================================
// 4. Write TypedArray (Uint8Array)
// ============================================================================
console.log("\n4️⃣  Writing TypedArray (Uint8Array) to file...");

const uint8Array = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]); // "Hello World!"
const uint8Path = `${OUTPUT_DIR}/typedarray.txt`;
const bytesWritten4 = await Bun.write(uint8Path, uint8Array);
console.log(`   ✅ Wrote ${bytesWritten4} bytes to: ${uint8Path}`);

// ============================================================================
// 5. Write TypedArray (Float64Array)
// ============================================================================
console.log("\n5️⃣  Writing TypedArray (Float64Array) to file...");

const float64Array = new Float64Array([3.14159, 2.71828, 1.61803, 1.41421]);
const float64Path = `${OUTPUT_DIR}/float64array.bin`;
const bytesWritten5 = await Bun.write(float64Path, float64Array);
console.log(`   ✅ Wrote ${bytesWritten5} bytes to: ${float64Path}`);

// ============================================================================
// 6. Write BunFile
// ============================================================================
console.log("\n6️⃣  Writing BunFile to file...");

const sourceFile = Bun.file(textPath);
const bunFilePath = `${OUTPUT_DIR}/bunfile-copy.txt`;
const bytesWritten6 = await Bun.write(bunFilePath, sourceFile);
console.log(`   ✅ Wrote ${bytesWritten6} bytes to: ${bunFilePath}`);

// ============================================================================
// 7. Write Response
// ============================================================================
console.log("\n7️⃣  Writing Response body to file...");

const response = new Response("This is response content!\nWritten using Bun.write()", {
  headers: { "Content-Type": "text/plain" },
});
const responsePath = `${OUTPUT_DIR}/response-file.txt`;
const bytesWritten7 = await Bun.write(responsePath, response);
console.log(`   ✅ Wrote ${bytesWritten7} bytes to: ${responsePath}`);

// ============================================================================
// 8. Write JSON
// ============================================================================
console.log("\n8️⃣  Writing JSON object to file...");

const jsonData = {
  name: "Bun.write() Demo",
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  features: [
    "Write strings",
    "Write Blobs",
    "Write ArrayBuffers",
    "Write TypedArrays",
    "Write Response objects",
    "Write BunFile objects"
  ]
};

const jsonPath = `${OUTPUT_DIR}/json-file.json`;
const bytesWritten8 = await Bun.write(jsonPath, JSON.stringify(jsonData, null, 2));
console.log(`   ✅ Wrote ${bytesWritten8} bytes to: ${jsonPath}`);

// ============================================================================
// 9. Write binary data (PNG header simulation)
// ============================================================================
console.log("\n9️⃣  Writing binary data (PNG header simulation)...");

const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR length
  0x49, 0x48, 0x44, 0x52, // "IHDR"
  0x00, 0x00, 0x00, 0x01, // width: 1
  0x00, 0x00, 0x00, 0x01, // height: 1
  0x08, 0x02, // bit depth: 8, color type: 2 (RGB)
  0x00, 0x00, 0x00, // compression, filter, interlace
  0xA2, 0x5C, 0x18, 0x08 // CRC
]);

const pngPath = `${OUTPUT_DIR}/fake-png.bin`;
const bytesWritten9 = await Bun.write(pngPath, pngHeader);
console.log(`   ✅ Wrote ${bytesWritten9} bytes to: ${pngPath}`);

// ============================================================================
// 10. Advanced: Stream large data with progress
// ============================================================================
console.log("\n🔟 Writing large data with progress tracking...");

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const TOTAL_SIZE = CHUNK_SIZE * 5; // 5MB total
const largeFilePath = `${OUTPUT_DIR}/large-file.bin`;

// Create large file using streaming
const largeFile = Bun.file(largeFilePath);
const writer = await largeFile.writer();

const chunk = new Uint8Array(CHUNK_SIZE);
for (let i = 0; i < CHUNK_SIZE; i++) {
  chunk[i] = Math.floor(Math.random() * 256);
}

// Progress tracking
const progressInterval = setInterval(() => {
  const written = writer.written;
  const percent = Math.min(100, Math.round((written / TOTAL_SIZE) * 100));
  const mb = (written / 1024 / 1024).toFixed(1);
  process.stdout.write(`   📊 Progress: ${percent}% (${mb}MB)\r`);
}, 100);

let written = 0;
for (let i = 0; i < 5; i++) {
  await writer.write(chunk);
  written += CHUNK_SIZE;
}
await writer.end();
clearInterval(progressInterval);

console.log(`   ✅ Wrote ${written} bytes to: ${largeFilePath}`);

// ============================================================================
// 11. Read and verify files
// ============================================================================
console.log("\n📖 Reading and verifying files...\n");

// Use Bun.Glob instead of Bun.glob for v1.3.6
const glob = new Bun.Glob(`${OUTPUT_DIR}/*`);
const files = await Array.fromAsync(glob.scan('.'));

console.log(`Found ${files.length} files:\n`);
for (const file of files) {
  const stats = await Bun.file(file).stat();
  console.log(`   📄 ${file} (${stats.size} bytes)`);
}

// ============================================================================
// 12. Batch operations
// ============================================================================
console.log("\n🔄 Batch file operations...\n");

// Copy multiple files
const copiesDir = `${OUTPUT_DIR}/copies`;
await mkdir(copiesDir, { recursive: true });

for (const file of files.slice(0, 3)) {
  // file is like "./bun-write-demo/filename", extract just the base name
  const filename = basename(file);
  const source = Bun.file(file);
  const destPath = `${copiesDir}/${filename}`;
  await Bun.write(destPath, source);
  console.log(`   ✅ Copied: ${filename}`);
}

console.log(`\n📂 All copies saved to: ${copiesDir}/`);

// Helper: Extract basename from path (handles both "path/file" and "./path/file")
function basename(path: string): string {
  const normalized = path.replace(/^\.\//, ''); // Remove leading "./"
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.slice(lastSlash + 1) : normalized;
}

// ============================================================================
// Summary
// ============================================================================
console.log(`
╔════════════════════════════════════════════════════════════╗
║           Bun.write() Enhanced Demo Complete!              ║
╠════════════════════════════════════════════════════════════╣
║  Data Types Written:                                       ║
║  1. string           ✅                                     ║
║  2. Blob            ✅                                     ║
║  3. ArrayBuffer     ✅                                     ║
║  4. Uint8Array      ✅                                     ║
║  5. Float64Array    ✅                                     ║
║  6. BunFile        ✅                                     ║
║  7. Response       ✅                                     ║
║  8. JSON           ✅                                     ║
║  9. Binary (PNG)   ✅                                     ║
║  10. Large Stream  ✅ (5MB with progress)                    ║
╠════════════════════════════════════════════════════════════╣
║  Advanced Features:                                       ║
║  • Progress tracking for large files                      ║
║  • File statistics and metadata                          ║
║  • Batch copy operations                                  ║
║  • Streaming writer API                                   ║
╠════════════════════════════════════════════════════════════╣
║  Total files: ${files.length} (11 files + 3 copies)                   ║
║  Output: ${OUTPUT_DIR}                          ║
╚════════════════════════════════════════════════════════════╝
`);

console.log("✨ All operations completed successfully!");
