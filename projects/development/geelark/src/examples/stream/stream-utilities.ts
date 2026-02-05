#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Stream Utilities Examples
 *
 * This example demonstrates the enhanced stream utilities available
 * in StreamUtils.ts for handling binary data streams in Bun.
 */

import { Stream, StreamUtils } from "../../src/utils/StreamUtils";
import { deepEquals, deepEqualsWithDiff } from "../../src/utils/PureUtils";

console.log("🌊 Stream Utilities Examples\n");

// ============================================================================
// Example 1: Uint8Array to ReadableStream
// ============================================================================
console.log("1. Converting Uint8Array to ReadableStream:");

const data = new TextEncoder().encode("Hello, Stream World!");
const stream = StreamUtils.uint8ArrayToStream(data, { chunkSize: 5 });

console.log("  Data split into 5-byte chunks:");
const reader = stream.getReader();
let chunkNum = 1;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(`    Chunk ${chunkNum}: "${new TextDecoder().decode(value)}"`);
  chunkNum++;
}
console.log("");

// ============================================================================
// Example 2: Throttled Streaming
// ============================================================================
console.log("2. Throttled streaming (simulating slow data transfer):");

const largeData = new TextEncoder().encode("A".repeat(20));
const throttledStream = StreamUtils.uint8ArrayToStream(largeData, {
  chunkSize: 5,
  delay: 50 // 50ms between chunks
});

console.log("  Streaming 20 bytes in 5-byte chunks with 50ms delay:");
const throttledReader = throttledStream.getReader();
const startTime = Date.now();
let byteCount = 0;

while (true) {
  const { done, value } = await throttledReader.read();
  if (done) break;
  byteCount += value.length;
  console.log(`    Received ${value.length} bytes (total: ${byteCount})`);
}

const elapsed = Date.now() - startTime;
console.log(`  Total time: ${elapsed}ms (expected ~150ms for 3 delays)`);
console.log("");

// ============================================================================
// Example 3: Stream to File
// ============================================================================
console.log("3. Writing stream to file:");

const fileData = new TextEncoder().encode("This data will be written to a file!");
const fileStream = StreamUtils.uint8ArrayToStream(fileData);
const targetFile = "/tmp/stream-example.txt";

await StreamUtils.streamToFile(fileStream, targetFile);

const writtenContent = await Bun.file(targetFile).text();
console.log(`  Written to ${targetFile}: "${writtenContent}"`);
console.log("");

// ============================================================================
// Example 4: Merge Multiple Arrays
// ============================================================================
console.log("4. Merging multiple arrays into one stream:");

const part1 = new TextEncoder().encode("Part 1. ");
const part2 = new TextEncoder().encode("Part 2. ");
const part3 = new TextEncoder().encode("Part 3.");

const mergedStream = StreamUtils.mergeArrays([part1, part2, part3]);
const mergedResult = await StreamUtils.buffer(mergedStream);

console.log(`  Merged result: "${new TextDecoder().decode(mergedResult)}"`);
console.log("");

// ============================================================================
// Example 5: Transform Stream
// ============================================================================
console.log("5. Transforming stream chunks (converting to uppercase):");

const originalText = new TextEncoder().encode("hello world");
const originalStream = StreamUtils.uint8ArrayToStream(originalText);

const upperCaseTransform = StreamUtils.createTransformStream(async (chunk) => {
  const text = new TextDecoder().decode(chunk);
  return new TextEncoder().encode(text.toUpperCase());
});

const transformedStream = originalStream.pipeThrough(upperCaseTransform);
const transformedResult = await StreamUtils.buffer(transformedStream);

console.log(`  Original: "hello world"`);
console.log(`  Transformed: "${new TextDecoder().decode(transformedResult)}"`);
console.log("");

// ============================================================================
// Example 6: Tee - Splitting a Stream
// ============================================================================
console.log("6. Tee - processing stream in two ways:");

const teeData = new TextEncoder().encode("shared data");
const teeStream = Stream.toStream(teeData);
const [stream1, stream2] = StreamUtils.tee(teeStream);

// Process first stream
const result1 = await StreamUtils.buffer(stream1);
console.log(`  Stream 1 received: "${new TextDecoder().decode(result1)}"`);

// Process second stream
const result2 = await StreamUtils.buffer(stream2);
console.log(`  Stream 2 received: "${new TextDecoder().decode(result2)}"`);
console.log("");

// ============================================================================
// Example 7: Stream from Iterable
// ============================================================================
console.log("7. Creating stream from iterable:");

const chunks = [
  new TextEncoder().encode("Chunk "),
  new TextEncoder().encode("from "),
  new TextEncoder().encode("iterable")
];

const iterableStream = StreamUtils.fromIterable(chunks);
const iterableResult = await StreamUtils.buffer(iterableStream);

console.log(`  Result: "${new TextDecoder().decode(iterableResult)}"`);
console.log("");

// ============================================================================
// Example 8: Split Lines
// ============================================================================
console.log("8. Splitting stream into lines:");

const multilineText = new TextEncoder().encode("Line 1\nLine 2\nLine 3");
const multilineStream = Stream.toStream(multilineText);
const lineStream = StreamUtils.splitLines(multilineStream);

const lineReader = lineStream.getReader();
let lineNum = 1;
console.log("  Lines:");
while (true) {
  const { done, value } = await lineReader.read();
  if (done) break;
  console.log(`    ${lineNum}: "${value}"`);
  lineNum++;
}
console.log("");

// ============================================================================
// Example 9: Stream Stats
// ============================================================================
console.log("9. Getting stream statistics:");

const statsData = new TextEncoder().encode("This is some data for stats");
const statsStream = Stream.toStream(statsData);

const stats = await StreamUtils.stats(statsStream);
console.log(`  Byte count: ${stats.byteCount}`);
console.log(`  Chunk count: ${stats.chunkCount}`);
console.log("");

// ============================================================================
// Example 10: Using the Stream utility exports
// ============================================================================
console.log("10. Using the Stream utility exports:");

const simpleData = new TextEncoder().encode("Simple!");
const simpleStream = Stream.toStream(simpleData);
const buffered = await Stream.buffer(simpleStream);

console.log(`  Stream.toStream() + Stream.buffer(): "${new TextDecoder().decode(buffered)}"`);
console.log("");

// ============================================================================
// Example 11: Deep Equality
// ============================================================================
console.log("11. Deep equality utilities:");

const obj1 = { name: "Alice", age: 30, hobbies: ["coding", "reading"] };
const obj2 = { name: "Alice", age: 30, hobbies: ["coding", "reading"] };
const obj3 = { name: "Alice", age: 30, hobbies: ["coding", "gaming"] };

console.log(`  obj1 vs obj2 (equal): ${deepEquals(obj1, obj2)}`);
console.log(`  obj1 vs obj3 (not equal): ${deepEquals(obj1, obj3)}`);

const diff = deepEqualsWithDiff(obj1, obj3);
console.log(`  Diff for obj1 vs obj3:`);
console.log(`    Path: "${diff.path}"`);
console.log(`    Reason: ${diff.reason}`);
console.log(`    Actual: ${JSON.stringify(diff.actual)}`);
console.log(`    Expected: ${JSON.stringify(diff.expected)}`);
console.log("");

// ============================================================================
// Example 12: Creating a Streaming HTTP Response
// ============================================================================
console.log("12. Creating streaming HTTP response:");

const responseData = new TextEncoder().encode("Streaming response body!");
const response = StreamUtils.createStreamingResponse(responseData, {
  chunkSize: 8
});

console.log(`  Response created with headers:`);
console.log(`    Content-Type: ${response.headers.get("Content-Type")}`);
console.log(`    Transfer-Encoding: ${response.headers.get("Transfer-Encoding")}`);

const responseBody = await response.arrayBuffer();
console.log(`    Body: "${new TextDecoder().decode(responseBody)}"`);
console.log("");

console.log("✅ Stream utilities examples completed!");
