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

console.info("🌊 Stream Utilities Examples\n");

// ============================================================================
// Example 1: Uint8Array to ReadableStream
// ============================================================================
console.info("1. Converting Uint8Array to ReadableStream:");

const data = new TextEncoder().encode("Hello, Stream World!");
const stream = StreamUtils.uint8ArrayToStream(data, { chunkSize: 5 });

console.info("  Data split into 5-byte chunks:");
const reader = stream.getReader();
let chunkNum = 1;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.info(`    Chunk ${chunkNum}: "${new TextDecoder().decode(value)}"`);
  chunkNum++;
}
console.info("");

// ============================================================================
// Example 2: Throttled Streaming
// ============================================================================
console.info("2. Throttled streaming (simulating slow data transfer):");

const largeData = new TextEncoder().encode("A".repeat(20));
const throttledStream = StreamUtils.uint8ArrayToStream(largeData, {
  chunkSize: 5,
  delay: 50 // 50ms between chunks
});

console.info("  Streaming 20 bytes in 5-byte chunks with 50ms delay:");
const throttledReader = throttledStream.getReader();
const startTime = Date.now();
let byteCount = 0;

while (true) {
  const { done, value } = await throttledReader.read();
  if (done) break;
  byteCount += value.length;
  console.info(`    Received ${value.length} bytes (total: ${byteCount})`);
}

const elapsed = Date.now() - startTime;
console.info(`  Total time: ${elapsed}ms (expected ~150ms for 3 delays)`);
console.info("");

// ============================================================================
// Example 3: Stream to File
// ============================================================================
console.info("3. Writing stream to file:");

const fileData = new TextEncoder().encode("This data will be written to a file!");
const fileStream = StreamUtils.uint8ArrayToStream(fileData);
const targetFile = "/tmp/stream-example.txt";

await StreamUtils.streamToFile(fileStream, targetFile);

const writtenContent = await Bun.file(targetFile).text();
console.info(`  Written to ${targetFile}: "${writtenContent}"`);
console.info("");

// ============================================================================
// Example 4: Merge Multiple Arrays
// ============================================================================
console.info("4. Merging multiple arrays into one stream:");

const part1 = new TextEncoder().encode("Part 1. ");
const part2 = new TextEncoder().encode("Part 2. ");
const part3 = new TextEncoder().encode("Part 3.");

const mergedStream = StreamUtils.mergeArrays([part1, part2, part3]);
const mergedResult = await StreamUtils.buffer(mergedStream);

console.info(`  Merged result: "${new TextDecoder().decode(mergedResult)}"`);
console.info("");

// ============================================================================
// Example 5: Transform Stream
// ============================================================================
console.info("5. Transforming stream chunks (converting to uppercase):");

const originalText = new TextEncoder().encode("hello world");
const originalStream = StreamUtils.uint8ArrayToStream(originalText);

const upperCaseTransform = StreamUtils.createTransformStream(async (chunk) => {
  const text = new TextDecoder().decode(chunk);
  return new TextEncoder().encode(text.toUpperCase());
});

const transformedStream = originalStream.pipeThrough(upperCaseTransform);
const transformedResult = await StreamUtils.buffer(transformedStream);

console.info(`  Original: "hello world"`);
console.info(`  Transformed: "${new TextDecoder().decode(transformedResult)}"`);
console.info("");

// ============================================================================
// Example 6: Tee - Splitting a Stream
// ============================================================================
console.info("6. Tee - processing stream in two ways:");

const teeData = new TextEncoder().encode("shared data");
const teeStream = Stream.toStream(teeData);
const [stream1, stream2] = StreamUtils.tee(teeStream);

// Process first stream
const result1 = await StreamUtils.buffer(stream1);
console.info(`  Stream 1 received: "${new TextDecoder().decode(result1)}"`);

// Process second stream
const result2 = await StreamUtils.buffer(stream2);
console.info(`  Stream 2 received: "${new TextDecoder().decode(result2)}"`);
console.info("");

// ============================================================================
// Example 7: Stream from Iterable
// ============================================================================
console.info("7. Creating stream from iterable:");

const chunks = [
  new TextEncoder().encode("Chunk "),
  new TextEncoder().encode("from "),
  new TextEncoder().encode("iterable")
];

const iterableStream = StreamUtils.fromIterable(chunks);
const iterableResult = await StreamUtils.buffer(iterableStream);

console.info(`  Result: "${new TextDecoder().decode(iterableResult)}"`);
console.info("");

// ============================================================================
// Example 8: Split Lines
// ============================================================================
console.info("8. Splitting stream into lines:");

const multilineText = new TextEncoder().encode("Line 1\nLine 2\nLine 3");
const multilineStream = Stream.toStream(multilineText);
const lineStream = StreamUtils.splitLines(multilineStream);

const lineReader = lineStream.getReader();
let lineNum = 1;
console.info("  Lines:");
while (true) {
  const { done, value } = await lineReader.read();
  if (done) break;
  console.info(`    ${lineNum}: "${value}"`);
  lineNum++;
}
console.info("");

// ============================================================================
// Example 9: Stream Stats
// ============================================================================
console.info("9. Getting stream statistics:");

const statsData = new TextEncoder().encode("This is some data for stats");
const statsStream = Stream.toStream(statsData);

const stats = await StreamUtils.stats(statsStream);
console.info(`  Byte count: ${stats.byteCount}`);
console.info(`  Chunk count: ${stats.chunkCount}`);
console.info("");

// ============================================================================
// Example 10: Using the Stream utility exports
// ============================================================================
console.info("10. Using the Stream utility exports:");

const simpleData = new TextEncoder().encode("Simple!");
const simpleStream = Stream.toStream(simpleData);
const buffered = await Stream.buffer(simpleStream);

console.info(`  Stream.toStream() + Stream.buffer(): "${new TextDecoder().decode(buffered)}"`);
console.info("");

// ============================================================================
// Example 11: Deep Equality
// ============================================================================
console.info("11. Deep equality utilities:");

const obj1 = { name: "Alice", age: 30, hobbies: ["coding", "reading"] };
const obj2 = { name: "Alice", age: 30, hobbies: ["coding", "reading"] };
const obj3 = { name: "Alice", age: 30, hobbies: ["coding", "gaming"] };

console.info(`  obj1 vs obj2 (equal): ${deepEquals(obj1, obj2)}`);
console.info(`  obj1 vs obj3 (not equal): ${deepEquals(obj1, obj3)}`);

const diff = deepEqualsWithDiff(obj1, obj3);
console.info(`  Diff for obj1 vs obj3:`);
console.info(`    Path: "${diff.path}"`);
console.info(`    Reason: ${diff.reason}`);
console.info(`    Actual: ${JSON.stringify(diff.actual)}`);
console.info(`    Expected: ${JSON.stringify(diff.expected)}`);
console.info("");

// ============================================================================
// Example 12: Creating a Streaming HTTP Response
// ============================================================================
console.info("12. Creating streaming HTTP response:");

const responseData = new TextEncoder().encode("Streaming response body!");
const response = StreamUtils.createStreamingResponse(responseData, {
  chunkSize: 8
});

console.info(`  Response created with headers:`);
console.info(`    Content-Type: ${response.headers.get("Content-Type")}`);
console.info(`    Transfer-Encoding: ${response.headers.get("Transfer-Encoding")}`);

const responseBody = await response.arrayBuffer();
console.info(`    Body: "${new TextDecoder().decode(responseBody)}"`);
console.info("");

console.info("✅ Stream utilities examples completed!");
