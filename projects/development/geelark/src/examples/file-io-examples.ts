#!/usr/bin/env bun
/**
 * Bun File I/O Examples
 *
 * Demonstrates various Bun.file() and Bun.write() patterns
 * Run: bun examples/file-io-examples.ts
 */

import { readdir } from "node:fs/promises";

// ============================================================================
// Example 1: Basic File Reading
// ============================================================================

async function basicReading() {
  console.log("\n=== Example 1: Basic File Reading ===\n");

  // Create a lazy file reference (no disk read yet!)
  const file = Bun.file("package.json");

  console.log("File metadata (no disk read yet!):");
  console.log("  Size:", file.size, "bytes");
  console.log("  Type:", file.type);

  // Read contents (now we read from disk)
  const text = await file.text();
  console.log("\nFirst 100 chars:", text.slice(0, 100) + "...");
}

// ============================================================================
// Example 2: Writing Files
// ============================================================================

async function basicWriting() {
  console.log("\n=== Example 2: Writing Files ===\n");

  const data = "Hello from Bun!\nThis is file I/O made simple.";

  // Write string to file
  await Bun.write("output.txt", data);
  console.log("✅ Wrote to output.txt");

  // Write JSON
  const jsonData = { message: "Hello", timestamp: Date.now() };
  await Bun.write("output.json", JSON.stringify(jsonData, null, 2));
  console.log("✅ Wrote to output.json");

  // Write binary
  const encoder = new TextEncoder();
  const binaryData = encoder.encode("Binary data");
  await Bun.write("output.bin", binaryData);
  console.log("✅ Wrote to output.bin");
}

// ============================================================================
// Example 3: Copying Files (optimized!)
// ============================================================================

async function fileCopying() {
  console.log("\n=== Example 3: Copying Files ===\n");

  const input = Bun.file("output.json");
  const output = Bun.file("output-copy.json");

  // This uses optimized syscalls (copy_file_range on Linux, clonefile on macOS)
  await Bun.write(output, input);

  console.log("✅ Copied file using optimized syscalls");
  console.log("  Linux: copy_file_range");
  console.log("  macOS: clonefile");
}

// ============================================================================
// Example 4: HTTP Response to Disk
// ============================================================================

async function httpToDisk() {
  console.log("\n=== Example 4: HTTP Response to Disk ===\n");

  // Fetch webpage
  const response = await fetch("https://bun.com");

  // Write response body to disk
  await Bun.write("bun-homepage.html", response);

  console.log("✅ Saved bun.com homepage to bun-homepage.html");
  const size = Bun.file("bun-homepage.html").size;
  console.log(`  Size: ${size} bytes`);
}

// ============================================================================
// Example 5: Incremental Writing with FileSink
// ============================================================================

async function incrementalWriting() {
  console.log("\n=== Example 5: Incremental Writing ===\n");

  const file = Bun.file("incremental.txt");
  const writer = file.writer({ highWaterMark: 64 * 1024 }); // 64KB buffer

  // Write chunks
  for (let i = 1; i <= 10; i++) {
    writer.write(`Line ${i}: ${new Date().toISOString()}\n`);
  }

  // Flush and close
  await writer.end();

  console.log("✅ Wrote 10 lines incrementally");
  console.log("  Buffer auto-flushed when highWaterMark reached");
}

// ============================================================================
// Example 6: Stream Large Files
// ============================================================================

async function streamFiles() {
  console.log("\n=== Example 6: Stream Large Files ===\n");

  // Create a large file for testing
  const writer = Bun.file("large.txt").writer();
  for (let i = 0; i < 10000; i++) {
    writer.write(`Line ${i}: Some data here\n`);
  }
  await writer.end();

  // Stream it (zero-copy, no memory load)
  const input = Bun.file("large.txt");
  const output = Bun.file("large-copy.txt");

  const startTime = performance.now();
  await Bun.write(output, input);
  const duration = performance.now() - startTime;

  console.log("✅ Streamed large file");
  console.log(`  Size: ${input.size} bytes`);
  console.log(`  Time: ${duration.toFixed(2)}ms`);
}

// ============================================================================
// Example 7: Standard Streams
// ============================================================================

async function standardStreams() {
  console.log("\n=== Example 7: Standard Streams ===\n");

  console.log("stdin size:", Bun.stdin.size);
  console.log("stdout size:", Bun.stdout.size);
  console.log("stderr size:", Bun.stderr.size);

  // Write to stdout
  await Bun.write(Bun.stdout, "Hello to stdout!\n");

  // Write to stderr
  await Bun.write(Bun.stderr, "Error message to stderr!\n");

  // Copy file to stdout
  const file = Bun.file("output.json");
  console.log("\n--- output.json contents ---");
  await Bun.write(Bun.stdout, file);
}

// ============================================================================
// Example 8: File Existence Check
// ============================================================================

async function fileExistence() {
  console.log("\n=== Example 8: File Existence ===\n");

  const exists = Bun.file("output.json");
  const notExists = Bun.file("does-not-exist.txt");

  console.log("output.json exists:", await exists.exists());
  console.log("does-not-exist.txt exists:", await notExists.exists());
}

// ============================================================================
// Example 9: Delete File
// ============================================================================

async function deleteFile() {
  console.log("\n=== Example 9: Delete File ===\n");

  // Create a temp file
  await Bun.write("temp.txt", "Temporary data");
  console.log("✅ Created temp.txt");

  // Delete it
  await Bun.file("temp.txt").delete();
  console.log("✅ Deleted temp.txt");

  // Verify
  const exists = await Bun.file("temp.txt").exists();
  console.log("temp.txt exists:", exists);
}

// ============================================================================
// Example 10: Read Directory
// ============================================================================

async function readDirectory() {
  console.log("\n=== Example 10: Read Directory ===\n");

  // Read current directory
  const files = await readdir(import.meta.dir);
  console.log("Files in current directory:");
  files.slice(0, 10).forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });

  // Read with metadata
  const filesWithDetails = await readdir(import.meta.dir, { withFileTypes: true });
  const counts = {
    files: 0,
    directories: 0
  };

  filesWithDetails.forEach(entry => {
    if (entry.isFile()) counts.files++;
    if (entry.isDirectory()) counts.directories++;
  });

  console.log("\nDirectory stats:");
  console.log("  Files:", counts.files);
  console.log("  Directories:", counts.directories);
}

// ============================================================================
// Example 11: JSON Processing Pipeline
// ============================================================================

async function jsonPipeline() {
  console.log("\n=== Example 11: JSON Processing ===\n");

  // Create sample data
  const inputData = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 100
  }));

  await Bun.write("input.json", JSON.stringify(inputData, null, 2));

  // Read, transform, write
  const inputFile = Bun.file("input.json");
  const data = await inputFile.json();

  const transformed = data.map((item: any) => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));

  await Bun.write("output-processed.json", JSON.stringify(transformed, null, 2));

  console.log("✅ Processed 100 items");
  console.log("  Input: input.json");
  console.log("  Output: output-processed.json");
}

// ============================================================================
// Example 12: Custom MIME Type
// ============================================================================

async function customMimeType() {
  console.log("\n=== Example 12: Custom MIME Type ===\n");

  // Default type
  const defaultFile = Bun.file("data.json");
  console.log("Default type:", defaultFile.type);

  // Custom type
  const customFile = Bun.file("data.json", { type: "application/vnd.api+json" });
  console.log("Custom type:", customFile.type);
}

// ============================================================================
// Example 13: Config Loader
// ============================================================================

async function configLoader() {
  console.log("\n=== Example 13: Config Loader ===\n");

  async function loadConfig<T>(path: string): Promise<T> {
    const file = Bun.file(path);

    if (!await file.exists()) {
      throw new Error(`Config not found: ${path}`);
    }

    return await file.json();
  }

  // Create a sample config
  await Bun.write("config.json", JSON.stringify({
    appName: "My App",
    version: "1.0.0",
    features: ["feature1", "feature2"]
  }, null, 2));

  // Load it
  const config = await loadConfig<{ appName: string; version: string; features: string[] }>("config.json");

  console.log("✅ Loaded config:");
  console.log("  App:", config.appName);
  console.log("  Version:", config.version);
  console.log("  Features:", config.features.join(", "));
}

// ============================================================================
// Example 14: Stream to HTTP
// ============================================================================

async function streamToHTTP() {
  console.log("\n=== Example 14: Stream to HTTP ===\n");

  // Create a test file
  await Bun.write("test-upload.txt", "Content for upload");

  // Stream it to a server
  const file = Bun.file("test-upload.txt");
  const stream = file.stream();

  try {
    // This would normally upload to a real server
    // const response = await fetch("https://example.com/upload", {
    //   method: "PUT",
    //   body: stream,
    //   headers: {
    //     "Content-Type": file.type,
    //     "Content-Length": file.size.toString()
    //   }
    // });

    console.log("✅ Prepared file for streaming:");
    console.log("  Size:", file.size);
    console.log("  Type:", file.type);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

// ============================================================================
// Example 15: Log Writer with FileSink
// ============================================================================

async function logWriter() {
  console.log("\n=== Example 15: Log Writer ===\n");

  class Logger {
    private writer: ReturnType<BunFile["writer"]>;

    constructor(path: string) {
      const file = Bun.file(path);
      this.writer = file.writer({ highWaterMark: 64 * 1024 });
    }

    log(message: string) {
      const timestamp = new Date().toISOString();
      this.writer.write(`[${timestamp}] ${message}\n`);
    }

    async close() {
      await this.writer.end();
    }
  }

  const logger = new Logger("app.log");
  logger.log("Application started");
  logger.log("Processing data");
  logger.log("Application finished");

  await logger.close();

  console.log("✅ Wrote log file");
  const logContents = await Bun.file("app.log").text();
  console.log("\n--- app.log contents ---");
  console.log(logContents);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  Bun File I/O Examples                                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  try {
    await basicReading();
    await basicWriting();
    await fileCopying();
    // await httpToDisk(); // Uncomment to test HTTP download
    await incrementalWriting();
    await streamFiles();
    await standardStreams();
    await fileExistence();
    await deleteFile();
    await readDirectory();
    await jsonPipeline();
    await customMimeType();
    await configLoader();
    await streamToHTTP();
    await logWriter();

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║  ✅ All examples completed!                                   ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run
await main();
