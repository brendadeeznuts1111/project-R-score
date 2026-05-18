#!/usr/bin/env bun

/**
 * Bun.file().stream() Examples
 *
 * Demonstrates reading files as ReadableStream using Bun.file().stream()
 * and consuming chunks with async iterables
 *
 * Reference: https://bun.sh/docs/api/file-io
 */

/**
 * Example 1: Basic file streaming
 */
async function example1_BasicStreaming() {
  console.info('=== Example 1: Basic File Streaming ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();

  console.info(`Streaming: ${path}`);
  console.info(`  File size: ${file.size} bytes`);
  console.info(`  Stream type: ${stream.constructor.name}`);

  // Consume stream as async iterable
  let totalBytes = 0;
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    totalBytes += chunk.length;
    console.info(`  Chunk ${chunkCount}: ${chunk.length} bytes`);
  }

  console.info(`  Total chunks: ${chunkCount}`);
  console.info(`  Total bytes: ${totalBytes}`);
  console.info(`  Matches file size: ${totalBytes === file.size ? '✅' : '❌'}`);
  console.info();
}

/**
 * Example 2: Processing stream chunks
 */
async function example2_ProcessingChunks() {
  console.info('=== Example 2: Processing Stream Chunks ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();

  // Process chunks incrementally
  let content = '';
  const decoder = new TextDecoder();

  for await (const chunk of stream) {
    // Each chunk is a Uint8Array
    const text = decoder.decode(chunk, { stream: true });
    content += text;
  }

  // Final decode to handle any remaining bytes
  const final = decoder.decode();
  content += final;

  console.info(`File content length: ${content.length} characters`);
  console.info(`First 100 chars: ${content.substring(0, 100)}...`);
  console.info();
}

/**
 * Example 3: Large file streaming (memory efficient)
 */
async function example3_LargeFileStreaming() {
  console.info('=== Example 3: Large File Streaming ===\n');

  // Create a large file
  const largePath = '/tmp/large-file.txt';
  const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: ${'x'.repeat(100)}\n`);
  await Bun.write(largePath, lines.join(''));

  const file = Bun.file(largePath);
  const stream = file.stream();

  console.info(`File size: ${(file.size / 1024).toFixed(2)} KB`);

  // Stream processing - memory efficient
  let lineCount = 0;
  let buffer = '';
  const decoder = new TextDecoder();

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    lineCount += lines.length;
  }

  // Process remaining buffer
  if (buffer) lineCount++;

  console.info(`Lines processed: ${lineCount}`);
  console.info(`Memory efficient: ✅ (streamed in chunks)`);
  console.info();
}

/**
 * Example 4: Binary file streaming
 */
async function example4_BinaryStreaming() {
  console.info('=== Example 4: Binary File Streaming ===\n');

  // Create binary file
  const binaryPath = '/tmp/binary-data.bin';
  const binaryData = new Uint8Array(1024 * 10); // 10KB
  binaryData.fill(0x42); // Fill with 'B'

  await Bun.write(binaryPath, binaryData);

  const file = Bun.file(binaryPath);
  const stream = file.stream();

  // Process binary chunks
  let totalBytes = 0;
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
    totalBytes += chunk.length;
  }

  // Verify all chunks
  const allMatch = chunks.every(chunk => chunk.every(byte => byte === 0x42));

  console.info(`File size: ${file.size} bytes`);
  console.info(`Chunks received: ${chunks.length}`);
  console.info(`Total bytes: ${totalBytes}`);
  console.info(`All bytes are 0x42: ${allMatch ? '✅' : '❌'}`);
  console.info();
}

/**
 * Example 5: Using stream.getReader() instead of for await
 */
async function example5_StreamReader() {
  console.info('=== Example 5: Using stream.getReader() ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();

  // Using getReader() API
  const reader = stream.getReader();
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;
    }
  } finally {
    reader.releaseLock();
  }

  console.info(`Total bytes read: ${totalBytes}`);
  console.info(`File size: ${file.size} bytes`);
  console.info(`Match: ${totalBytes === file.size ? '✅' : '❌'}`);
  console.info();
}

/**
 * Example 6: Stream transformation
 */
async function example6_StreamTransformation() {
  console.info('=== Example 6: Stream Transformation ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();

  // Transform stream: convert to uppercase
  const transformedStream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      for await (const chunk of stream) {
        const text = decoder.decode(chunk, { stream: true });
        const upper = text.toUpperCase();
        controller.enqueue(encoder.encode(upper));
      }

      controller.close();
    },
  });

  // Consume transformed stream
  let transformedLength = 0;
  for await (const chunk of transformedStream) {
    transformedLength += chunk.length;
  }

  console.info(`Original file size: ${file.size} bytes`);
  console.info(`Transformed stream length: ${transformedLength} bytes`);
  console.info();
}

/**
 * Example 7: Stream with progress tracking
 */
async function example7_StreamWithProgress() {
  console.info('=== Example 7: Stream with Progress Tracking ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();
  const totalSize = file.size;

  let bytesRead = 0;
  let chunkCount = 0;

  for await (const chunk of stream) {
    bytesRead += chunk.length;
    chunkCount++;

    const progress = ((bytesRead / totalSize) * 100).toFixed(1);
    console.info(`  Progress: ${progress}% (${bytesRead}/${totalSize} bytes, ${chunkCount} chunks)`);
  }

  console.info(`\n  ✅ Complete: ${bytesRead} bytes in ${chunkCount} chunks`);
  console.info();
}

/**
 * Example 8: Multiple file streaming (parallel)
 */
async function example8_ParallelStreaming() {
  console.info('=== Example 8: Parallel File Streaming ===\n');

  const files = ['./package.json', './README.md', './tsconfig.json'];

  async function streamFile(path: string): Promise<{ path: string; bytes: number; chunks: number }> {
    const file = Bun.file(path);
    const stream = file.stream();

    let bytes = 0;
    let chunks = 0;

    for await (const chunk of stream) {
      bytes += chunk.length;
      chunks++;
    }

    return { path, bytes, chunks };
  }

  // Stream all files in parallel
  const results = await Promise.all(files.map(streamFile));

  console.info('Parallel streaming results:');
  for (const result of results) {
    console.info(`  ${result.path}: ${result.bytes} bytes, ${result.chunks} chunks`);
  }
  console.info();
}

/**
 * Example 9: Stream to HTTP Response
 */
async function example9_StreamToResponse() {
  console.info('=== Example 9: Stream to HTTP Response ===\n');

  const path = './package.json';
  const file = Bun.file(path);
  const stream = file.stream();

  // Create HTTP response from stream
  const response = new Response(stream, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': String(file.size || 0),
    },
  });

  console.info('HTTP Response created:');
  console.info(`  Content-Type: ${response.headers.get('Content-Type')}`);
  console.info(`  Content-Length: ${response.headers.get('Content-Length')}`);
  console.info(`  Body: ReadableStream`);
  console.info();
}

/**
 * Example 10: Error handling in streams
 */
async function example10_StreamErrorHandling() {
  console.info('=== Example 10: Stream Error Handling ===\n');

  // Try to stream a non-existent file
  const nonexistent = Bun.file('./nonexistent-file-12345.txt');

  try {
    // Note: stream() doesn't throw if file doesn't exist, but reading will
    const stream = nonexistent.stream();

    let hasError = false;
    try {
      for await (const chunk of stream) {
        // This will not execute if file doesn't exist
        console.info(`  Chunk: ${chunk.length} bytes`);
      }
    } catch (error) {
      hasError = true;
      console.info(`  Error reading stream: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!hasError) {
      console.info(`  Stream created but may be empty (file doesn't exist)`);
    }
  } catch (error) {
    console.info(`  Error creating stream: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Safe streaming with existence check
  const safePath = './package.json';
  const safeFile = Bun.file(safePath);

  if (await safeFile.exists()) {
    const safeStream = safeFile.stream();
    let safeBytes = 0;

    for await (const chunk of safeStream) {
      safeBytes += chunk.length;
    }

    console.info(`\n  Safe streaming: ${safeBytes} bytes read`);
  }

  console.info();
}

// Run all examples
async function main() {
  try {
    await example1_BasicStreaming();
    await example2_ProcessingChunks();
    await example3_LargeFileStreaming();
    await example4_BinaryStreaming();
    await example5_StreamReader();
    await example6_StreamTransformation();
    await example7_StreamWithProgress();
    await example8_ParallelStreaming();
    await example9_StreamToResponse();
    await example10_StreamErrorHandling();

    console.info('✅ All examples completed!');
    console.info('\n💡 Key Points:');
    console.info('  • file.stream() returns a ReadableStream<Uint8Array>');
    console.info('  • Use for await (const chunk of stream) to iterate');
    console.info('  • Each chunk is a Uint8Array');
    console.info('  • Memory-efficient for large files');
    console.info('  • Can be used directly in HTTP Response');
    console.info('  • Always check file.exists() before streaming when needed');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

