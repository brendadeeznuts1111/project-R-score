#!/usr/bin/env bun

/**
 * Bun.file().bytes() Examples
 *
 * Demonstrates reading files to Uint8Array using Bun.file().bytes()
 *
 * Reference: https://bun.sh/docs/api/file-io
 */

/**
 * Example 1: Basic file reading to Uint8Array
 */
async function example1_BasicBytes() {
  console.log('=== Example 1: Basic File Reading to Uint8Array ===\n');

  const path = './package.json';
  const file = Bun.file(path);

  // Read file as Uint8Array
  const byteArray = await file.bytes();

  console.log(`File: ${path}`);
  console.log(`  Size: ${file.size} bytes`);
  console.log(`  Uint8Array length: ${byteArray.length}`);
  console.log(`  First byte: ${byteArray[0]}`);
  console.log(`  Last byte: ${byteArray[byteArray.length - 1]}`);
  console.log(`  Type: ${file.type}`);
}

/**
 * Example 2: Binary file operations
 */
async function example2_BinaryOperations() {
  console.log('\n=== Example 2: Binary File Operations ===\n');

  // Create a binary file
  const binaryPath = '/tmp/test-binary.bin';
  const originalData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64]); // "Hello World"

  // Write binary data
  await Bun.write(binaryPath, originalData);

  // Read back as Uint8Array
  const file = Bun.file(binaryPath);
  const byteArray = await file.bytes();

  console.log('Original data:', Array.from(originalData).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
  console.log('Read data:', Array.from(byteArray).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
  console.log(`  Arrays match: ${originalData.length === byteArray.length && originalData.every((b, i) => b === byteArray[i])}`);

  // Convert to string
  const text = new TextDecoder().decode(byteArray);
  console.log(`  As text: "${text}"`);
}

/**
 * Example 3: Comparing bytes() vs arrayBuffer() vs text()
 */
async function example3_Comparison() {
  console.log('\n=== Example 3: bytes() vs arrayBuffer() vs text() ===\n');

  const path = './package.json';
  const file = Bun.file(path);

  // Method 1: bytes() - Returns Uint8Array directly
  const bytes = await file.bytes();
  console.log('1. file.bytes():');
  console.log(`   Type: ${bytes.constructor.name}`);
  console.log(`   Length: ${bytes.length}`);
  console.log(`   First 10 bytes: ${Array.from(bytes.slice(0, 10)).join(', ')}`);

  // Method 2: arrayBuffer() - Returns ArrayBuffer, need to wrap in Uint8Array
  const arrayBuffer = await file.arrayBuffer();
  const bytesFromBuffer = new Uint8Array(arrayBuffer);
  console.log('\n2. file.arrayBuffer():');
  console.log(`   Type: ${arrayBuffer.constructor.name}`);
  console.log(`   Length: ${arrayBuffer.byteLength}`);
  console.log(`   Wrapped as Uint8Array: ${bytesFromBuffer.length}`);
  console.log(`   Arrays equal: ${bytes.length === bytesFromBuffer.length && bytes.every((b, i) => b === bytesFromBuffer[i])}`);

  // Method 3: text() - Returns string
  const text = await file.text();
  const bytesFromText = new TextEncoder().encode(text);
  console.log('\n3. file.text():');
  console.log(`   Type: ${typeof text}`);
  console.log(`   Length: ${text.length} characters`);
  console.log(`   Encoded to Uint8Array: ${bytesFromText.length}`);
  console.log(`   Note: bytes() is more efficient for binary data`);
}

/**
 * Example 4: Processing binary data
 */
async function example4_BinaryProcessing() {
  console.log('\n=== Example 4: Binary Data Processing ===\n');

  // Create a file with mixed binary data
  const dataPath = '/tmp/mixed-data.bin';
  const mixedData = new Uint8Array([
    0x48, 0x65, 0x6C, 0x6C, 0x6F, // "Hello"
    0x00, // null byte
    0xFF, 0xFE, // BOM
    0x01, 0x02, 0x03, 0x04, // Binary data
  ]);

  await Bun.write(dataPath, mixedData);

  // Read and process
  const file = Bun.file(dataPath);
  const bytes = await file.bytes();

  console.log('Binary data analysis:');
  console.log(`  Total bytes: ${bytes.length}`);
  console.log(`  Null bytes: ${bytes.filter(b => b === 0).length}`);
  console.log(`  Max value: ${Math.max(...bytes)}`);
  console.log(`  Min value: ${Math.min(...bytes)}`);
  console.log(`  Sum: ${bytes.reduce((a, b) => a + b, 0)}`);

  // Find patterns
  const helloPattern = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const found = bytes.findIndex((_, i) => {
    return helloPattern.every((b, j) => bytes[i + j] === b);
  });
  console.log(`  "Hello" pattern found at index: ${found >= 0 ? found : 'not found'}`);
}

/**
 * Example 5: Large file chunking
 */
async function example5_LargeFileChunking() {
  console.log('\n=== Example 5: Large File Chunking ===\n');

  // Create a large file
  const largePath = '/tmp/large-file.bin';
  const largeData = new Uint8Array(1024 * 100); // 100KB
  largeData.fill(0x42); // Fill with 'B'

  await Bun.write(largePath, largeData);

  // Read entire file
  const file = Bun.file(largePath);
  const bytes = await file.bytes();

  console.log(`File size: ${bytes.length} bytes (${(bytes.length / 1024).toFixed(2)} KB)`);

  // Process in chunks
  const chunkSize = 1024; // 1KB chunks
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(bytes.slice(i, i + chunkSize));
  }

  console.log(`  Chunks: ${chunks.length}`);
  console.log(`  Last chunk size: ${chunks[chunks.length - 1].length} bytes`);

  // Verify all chunks
  const allSame = chunks.every(chunk => chunk.every(b => b === 0x42));
  console.log(`  All chunks contain 0x42: ${allSame}`);
}

/**
 * Example 6: File comparison using bytes()
 */
async function example6_FileComparison() {
  console.log('\n=== Example 6: File Comparison ===\n');

  const path1 = './package.json';
  const path2 = './package.json'; // Same file for demo

  const file1 = Bun.file(path1);
  const file2 = Bun.file(path2);

  const bytes1 = await file1.bytes();
  const bytes2 = await file2.bytes();

  console.log(`Comparing: ${path1} vs ${path2}`);
  console.log(`  Same length: ${bytes1.length === bytes2.length}`);

  if (bytes1.length === bytes2.length) {
    const areEqual = bytes1.every((b, i) => b === bytes2[i]);
    console.log(`  Files are identical: ${areEqual}`);

    if (!areEqual) {
      const firstDiff = bytes1.findIndex((b, i) => b !== bytes2[i]);
      console.log(`  First difference at byte ${firstDiff}`);
    }
  } else {
    console.log(`  Files have different sizes`);
  }
}

/**
 * Example 7: Converting between formats
 */
async function example7_FormatConversion() {
  console.log('\n=== Example 7: Format Conversion ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const bytes = await file.bytes();

  console.log('Converting Uint8Array to different formats:');

  // To ArrayBuffer
  const arrayBuffer = bytes.buffer;
  console.log(`  1. ArrayBuffer: ${arrayBuffer.byteLength} bytes`);

  // To Buffer (Node.js compatible)
  const buffer = Buffer.from(bytes);
  console.log(`  2. Buffer: ${buffer.length} bytes`);

  // To string
  const text = new TextDecoder().decode(bytes);
  console.log(`  3. String: ${text.length} characters`);

  // To hex string
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  console.log(`  4. Hex string: ${hex.substring(0, 40)}... (${hex.length} chars)`);

  // To base64
  const base64 = Buffer.from(bytes).toString('base64');
  console.log(`  5. Base64: ${base64.substring(0, 40)}... (${base64.length} chars)`);
}

/**
 * Example 8: Memory-efficient processing
 */
async function example8_MemoryEfficient() {
  console.log('\n=== Example 8: Memory-Efficient Processing ===\n');

  const path = './package.json';
  const file = Bun.file(path);

  // bytes() loads entire file into memory
  // For very large files, consider using stream() instead
  const bytes = await file.bytes();

  console.log('Memory usage:');
  console.log(`  File size: ${file.size} bytes`);
  console.log(`  Uint8Array size: ${bytes.length} bytes`);
  console.log(`  Memory overhead: ~${bytes.length * 1} bytes (1 byte per element)`);

  // For large files, streaming is more memory-efficient
  if (file.size > 1024 * 1024) { // > 1MB
    console.log('\n  ⚠️  Large file detected. Consider using file.stream() for memory efficiency.');
  } else {
    console.log('\n  ✅ File size is manageable for bytes() method.');
  }
}

// Run all examples
async function main() {
  try {
    await example1_BasicBytes();
    await example2_BinaryOperations();
    await example3_Comparison();
    await example4_BinaryProcessing();
    await example5_LargeFileChunking();
    await example6_FileComparison();
    await example7_FormatConversion();
    await example8_MemoryEfficient();

    console.log('\n✅ All examples completed!');
    console.log('\n💡 Key Points:');
    console.log('  • file.bytes() returns Uint8Array directly');
    console.log('  • More efficient than arrayBuffer() for binary operations');
    console.log('  • Use for small to medium files (< 100MB)');
    console.log('  • For large files, consider file.stream() instead');
    console.log('  • Uint8Array provides direct byte access and manipulation');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

