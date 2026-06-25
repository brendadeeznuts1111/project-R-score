/**
 * File I/O with ArrayBuffer & Typed Arrays
 * 
 * Demonstrates:
 * - Bun.file() for lazy file reading
 * - .arrayBuffer() for binary access
 * - Converting to Int8Array / Uint8Array
 */

console.info("=== Bun File I/O Demo ===\n");

// 1. Check if file exists
const path = "./package.json";
const file = Bun.file(path);

console.info(`Checking existence of ${file.name}...`);
const exists = await file.exists();
if (!exists) {
  console.error(`Error: File not found at ${file.name}`);
  process.exit(1);
}
console.info("File exists!");

console.info(`Size: ${file.size} bytes`);
console.info(`Type: ${file.type}\n`);

// 2. Read as ArrayBuffer
const buffer = await file.arrayBuffer();
console.info(`Buffer byteLength: ${buffer.byteLength}`);

// 3. Read as Uint8Array (using .bytes())
const bytes = await file.bytes();
console.info(`Bytes length: ${bytes.length}`);

// 4. Inspect raw binary data (Int8Array view)
const int8View = new Int8Array(buffer);
console.info(`\nFirst 10 bytes (Int8Array):`);
for (let i = 0; i < Math.min(10, int8View.length); i++) {
  console.info(`  Byte ${i}: ${int8View[i]}`);
}

// 5. Text decoding (for JSON files)
const text = new TextDecoder().decode(buffer);
console.info("\n--- File Content Preview (JSON) ---");
console.info(text.slice(0, 200) + "...");

// 6. Read file as ReadableStream (for large files)
console.info("\n--- Reading as Stream (Chunk by Chunk) ---");
const stream = file.stream();
let chunkCount = 0;
for await (const chunk of stream) {
  chunkCount++;
  // In a real scenario, you would process each chunk here
}
console.info(`Total chunks read from stream: ${chunkCount}`);
