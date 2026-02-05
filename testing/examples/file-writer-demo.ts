/**
 * 📝 Bun Incremental File Writing Demo
 * https://bun.com/docs/runtime/file-io#incremental-writing-with-filesink
 */

import { bun } from "bun";

// ═══════════════════════════════════════════════════════════
// BASIC INCREMENTAL WRITING
// ═══════════════════════════════════════════════════════════

/**
 * Basic incremental writing with multiple .write() calls
 */
async function demoBasicIncrementalWrite() {
  const file = Bun.file("/tmp/demo-basic.txt");
  const writer = file.writer();

  writer.write("lorem");
  writer.write("ipsum");
  writer.write("dolor");

  writer.flush();

  // Verify the file was written
  const content = await file.text();
  console.log(`📝 Basic write result: "${content}"`);
}

// ═══════════════════════════════════════════════════════════
// WRITING DIFFERENT DATA TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Write strings, Buffers, and Uint8Arrays
 */
async function demoMixedDataTypes() {
  const file = Bun.file("/tmp/demo-mixed.txt");
  const writer = file.writer();

  // String
  writer.write("Hello, ");

  // Buffer
  writer.write(Buffer.from("Bun! "));

  // Uint8Array
  writer.write(new Uint8Array([0xE2, 0x9C, 0xA8])); // ✨

  writer.flush();

  const content = await file.text();
  console.log(`📦 Mixed types result: "${content}"`);
}

// ═══════════════════════════════════════════════════════════
// CONFIGURE BUFFER SIZE
// ═══════════════════════════════════════════════════════════

/**
 * Configure buffer size with highWaterMark option
 * Auto-flushes when buffer is full
 */
async function demoCustomBufferSize() {
  const file = Bun.file("/tmp/demo-buffered.txt");
  
  // 1MB buffer for large file writes
  const writer = file.writer({ highWaterMark: 1024 * 1024 });

  // Write 5MB of data in chunks
  const chunk = "x".repeat(1024 * 1024); // 1MB chunk
  for (let i = 0; i < 5; i++) {
    writer.write(chunk);
    console.log(`📊 Written ${(i + 1) * 1}MB`);
  }

  writer.flush();
  console.log(`✅ Finished writing 5MB file`);
}

// ═══════════════════════════════════════════════════════════
// STREAMING LARGE DATA
// ═══════════════════════════════════════════════════════════

/**
 * Write large generated data efficiently
 */
async function demoStreamingLargeData() {
  const file = Bun.file("/tmp/demo-stream.txt");
  const writer = file.writer({ highWaterMark: 64 * 1024 }); // 64KB chunks

  // Simulate streaming data (e.g., from API)
  for (let batch = 0; batch < 100; batch++) {
    const line = `Batch ${batch + 1}: ${Date.now()}\n`;
    writer.write(line);

    // Simulate async delay between batches
    await new Promise(r => setTimeout(r, 10));
  }

  writer.flush();

  const lineCount = (await file.text()).split('\n').length;
  console.log(`🌊 Streamed ${lineCount} lines to file`);
}

// ═══════════════════════════════════════════════════════════
// AUTO-FLUSH DEMONSTRATION
// ═══════════════════════════════════════════════════════════

/**
 * Demonstrate auto-flush behavior with small buffer
 */
async function demoAutoFlush() {
  const file = Bun.file("/tmp/demo-autoflush.txt");
  
  // Very small buffer (256 bytes) to trigger auto-flush
  const writer = file.writer({ highWaterMark: 256 });

  console.log("✍️ Writing with auto-flush (256 byte buffer)...");
  
  // Write data larger than buffer to trigger auto-flush
  for (let i = 0; i < 10; i++) {
    const data = "X".repeat(100) + "\n"; // 101 bytes per write
    writer.write(data);
    console.log(`   Wrote batch ${i + 1} (auto-flush may have triggered)`);
  }

  writer.flush();
  const size = (await file.stat()).size;
  console.log(`✅ Final file size: ${size} bytes`);
}

// ═══════════════════════════════════════════════════════════
// PROPER CLEANUP WITH .end()
// ═══════════════════════════════════════════════════════════

/**
 * Use .end() to auto-flush and close the file properly
 */
async function demoProperCleanup() {
  const file = Bun.file("/tmp/demo-cleanup.txt");
  const writer = file.writer();

  writer.write("First part\n");
  writer.write("Second part\n");

  // .end() auto-flushes and closes the file
  writer.end();

  const content = await file.text();
  console.log(`🔒 Cleanup complete. File content:\n${content}`);
}

// ═══════════════════════════════════════════════════════════
// BINARY DATA WRITING
// ═══════════════════════════════════════════════════════════

/**
 * Write binary data (images, etc.)
 */
async function demoBinaryWrite() {
  const file = Bun.file("/tmp/demo-binary.bin");
  const writer = file.writer();

  // Write header
  const header = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG magic
  writer.write(header);

  // Write some binary data
  const data = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    data[i] = i;
  }
  writer.write(data);

  writer.flush();

  const size = (await file.stat()).size;
  console.log(`🖼️ Binary file written: ${size} bytes`);
}

// ═══════════════════════════════════════════════════════════
// APPEND TO EXISTING FILE
// ═══════════════════════════════════════════════════════════

/**
 * Append to existing file
 */
async function demoAppend() {
  const path = "/tmp/demo-append.txt";

  // Create initial file
  await Bun.write(path, "Line 1\n");

  // Append using writer
  const file = Bun.file(path);
  const writer = file.writer();

  writer.write("Line 2\n");
  writer.write("Line 3\n");
  writer.write("Line 4\n");

  writer.end();

  const content = await file.text();
  console.log(`📎 Appended content:\n${content}`);
}

// ═══════════════════════════════════════════════════════════
// JSON LINE BY LINE
// ═══════════════════════════════════════════════════════════

/**
 * Write JSONL (JSON Lines) format efficiently
 */
async function demoJsonLines() {
  const file = Bun.file("/tmp/demo.jsonl");
  const writer = file.writer();

  const records = [
    { id: 1, name: "Alice", score: 95 },
    { id: 2, name: "Bob", score: 87 },
    { id: 3, name: "Charlie", score: 92 },
    { id: 4, name: "Diana", score: 88 },
  ];

  for (const record of records) {
    writer.write(JSON.stringify(record) + "\n");
  }

  writer.flush();

  const content = await file.text();
  console.log(`📋 JSONL content:\n${content}`);
}

// ═══════════════════════════════════════════════════════════
// RUN ALL DEMOS
// ═══════════════════════════════════════════════════════════

async function runAllDemos() {
  console.log("📝 Bun Incremental File Writing Demo");
  console.log("═".repeat(50));

  console.log("\n1️⃣ Basic Incremental Write:");
  await demoBasicIncrementalWrite();

  console.log("\n2️⃣ Mixed Data Types:");
  await demoMixedDataTypes();

  console.log("\n3️⃣ Custom Buffer Size:");
  await demoCustomBufferSize();

  console.log("\n4️⃣ Streaming Large Data:");
  await demoStreamingLargeData();

  console.log("\n5️⃣ Auto-Flush Demonstration:");
  await demoAutoFlush();

  console.log("\n6️⃣ Proper Cleanup:");
  await demoProperCleanup();

  console.log("\n7️⃣ Binary Data Writing:");
  await demoBinaryWrite();

  console.log("\n8️⃣ Append to Existing File:");
  await demoAppend();

  console.log("\n9️⃣ JSON Lines Format:");
  await demoJsonLines();

  console.log("\n═".repeat(50));
  console.log("✅ All file writing demos completed!");
}

// Run if executed directly
runAllDemos().catch(console.error);

export {
  demoBasicIncrementalWrite,
  demoMixedDataTypes,
  demoCustomBufferSize,
  demoStreamingLargeData,
  demoAutoFlush,
  demoProperCleanup,
  demoBinaryWrite,
  demoAppend,
  demoJsonLines,
  runAllDemos,
};
