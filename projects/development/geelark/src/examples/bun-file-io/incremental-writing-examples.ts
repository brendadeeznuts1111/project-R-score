#!/usr/bin/env bun

/**
 * Bun Incremental File Writing Examples
 *
 * Demonstrates how to use Bun's FileSink API for efficient incremental file writing
 * including buffering, auto-flushing, and handling large data sets.
 */

import { writeFile } from 'fs/promises';

// Example 1: Basic incremental writing
console.log('📝 Example 1: Basic Incremental Writing');

async function basicIncrementalWriting() {
  const file = Bun.file('./output/basic-example.txt');
  const writer = file.writer();

  try {
    // Write multiple chunks
    writer.write('lorem ');
    writer.write('ipsum ');
    writer.write('dolor ');
    writer.write('sit amet\n');

    // Flush to disk
    writer.flush();
    console.log('✅ Basic writing completed and flushed');

    // Continue writing more data
    writer.write('consectetur adipiscing elit\n');
    writer.write('sed do eiusmod tempor\n');
    writer.flush();

    // End the writer (auto-flushes and closes)
    writer.end();
    console.log('✅ Writer ended successfully');

  } catch (error) {
    console.error('❌ Error in basic writing:', error);
    writer.end(); // Ensure cleanup even on error
  }
}

// Example 2: Writing different data types
console.log('\n🔄 Example 2: Writing Different Data Types');

async function writingDataTypes() {
  const file = Bun.file('./output/data-types-example.bin');
  const writer = file.writer();

  try {
    // Write string data
    writer.write('Hello, World!\n');

    // Write Buffer data
    writer.write(Buffer.from('Binary data from Buffer\n'));

    // Write Uint8Array data
    writer.write(new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x0A])); // "Hello\n"

    // Write mixed binary data
    const binaryData = new Uint8Array([
      0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0xF9, 0xF8
    ]);
    writer.write(binaryData);

    writer.flush();
    writer.end();
    console.log('✅ Different data types written successfully');

  } catch (error) {
    console.error('❌ Error writing data types:', error);
    writer.end();
  }
}

// Example 3: Large file writing with buffering
console.log('\n📊 Example 3: Large File Writing with Buffering');

async function largeFileWriting() {
  const file = Bun.file('./output/large-file.txt');

  // Configure custom buffer size (1MB)
  const writer = file.writer({ highWaterMark: 1024 * 1024 });

  try {
    console.log('🔄 Writing large dataset...');

    // Simulate writing large amounts of data
    const lines = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`Line ${i}: This is sample data for line number ${i} with some additional content to make it longer.\n`);
    }

    // Write in chunks to demonstrate buffering
    const chunkSize = 1000;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('');
      writer.write(chunk);

      // Progress indicator
      if ((i + chunkSize) % 5000 === 0) {
        console.log(`📈 Written ${i + chunkSize} lines...`);
        writer.flush(); // Manual flush at intervals
      }
    }

    writer.end();
    console.log('✅ Large file writing completed');

  } catch (error) {
    console.error('❌ Error writing large file:', error);
    writer.end();
  }
}

// Example 4: Stream-like writing with real-time data
console.log('\n🌊 Example 4: Stream-like Writing with Real-time Data');

async function streamLikeWriting() {
  const file = Bun.file('./output/stream-example.txt');
  const writer = file.writer({ highWaterMark: 64 * 1024 }); // 64KB buffer

  try {
    console.log('🔄 Simulating real-time data stream...');

    // Simulate receiving data chunks over time
    const dataChunks = [
      '=== Stream Started ===\n',
      'Timestamp: ' + new Date().toISOString() + '\n',
      'Data chunk 1: Initial connection established\n',
      'Data chunk 2: Authentication successful\n',
      'Data chunk 3: Processing request...\n',
      'Data chunk 4: Generating response\n',
      'Data chunk 5: Sending data back to client\n',
      'Data chunk 6: Connection closed\n',
      '=== Stream Ended ===\n'
    ];

    // Write chunks with delays to simulate real-time streaming
    for (let i = 0; i < dataChunks.length; i++) {
      writer.write(dataChunks[i]);
      console.log(`📝 Wrote chunk ${i + 1}/${dataChunks.length}`);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Flush every few chunks
      if ((i + 1) % 3 === 0) {
        writer.flush();
        console.log('💾 Buffer flushed');
      }
    }

    writer.end();
    console.log('✅ Stream writing completed');

  } catch (error) {
    console.error('❌ Error in stream writing:', error);
    writer.end();
  }
}

// Example 5: Error handling and resource management
console.log('\n🛡️ Example 5: Error Handling and Resource Management');

async function errorHandlingExample() {
  const file = Bun.file('./output/error-handling-example.txt');
  const writer = file.writer();

  try {
    writer.write('This file demonstrates error handling\n');

    // Simulate some processing that might fail
    let shouldFail = false; // Set to true to test error handling

    if (shouldFail) {
      throw new Error('Simulated write error');
    }

    writer.write('Success: No errors occurred\n');
    writer.flush();
    writer.end();
    console.log('✅ Error handling example completed successfully');

  } catch (error) {
    console.error('❌ Caught error:', error.message);
    // Ensure resources are cleaned up even on error
    try {
      writer.end();
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
    console.log('✅ Resources cleaned up despite error');
  }
}

// Example 6: Performance comparison
console.log('\n⚡ Example 6: Performance Comparison');

async function performanceComparison() {
  const testData = 'x'.repeat(1000); // 1KB of data
  const iterations = 1000;

  // Test 1: Traditional writeFile (all at once)
  console.log('🔄 Testing traditional writeFile...');
  const start1 = performance.now();

  const allData = testData.repeat(iterations);
  await writeFile('./output/traditional-write.txt', allData);

  const time1 = performance.now() - start1;
  console.log(`⏱️ Traditional writeFile: ${time1.toFixed(2)}ms`);

  // Test 2: Incremental writing with FileSink
  console.log('🔄 testing incremental FileSink writing...');
  const start2 = performance.now();

  const file = Bun.file('./output/incremental-write.txt');
  const writer = file.writer({ highWaterMark: 64 * 1024 });

  for (let i = 0; i < iterations; i++) {
    writer.write(testData);
  }

  writer.end();
  const time2 = performance.now() - start2;
  console.log(`⏱️ Incremental FileSink: ${time2.toFixed(2)}ms`);

  console.log(`📊 Performance ratio: ${(time1 / time2).toFixed(2)}x`);
}

// Main execution function
async function runAllExamples() {
  console.log('🚀 Bun Incremental File Writing Examples');
  console.log('==========================================\n');

  try {
    // Ensure output directory exists
    try {
      await Bun.write('./output/.gitkeep', '');
    } catch (error) {
      // Directory might already exist, that's fine
    }

    await basicIncrementalWriting();
    await writingDataTypes();
    await largeFileWriting();
    await streamLikeWriting();
    await errorHandlingExample();
    await performanceComparison();

    console.log('\n🎉 All examples completed successfully!');
    console.log('📁 Check the ./output/ directory for generated files');

  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('incremental-writing-examples.ts')) {
  runAllExamples().catch(console.error);
}

export {
    basicIncrementalWriting, errorHandlingExample, largeFileWriting, performanceComparison, streamLikeWriting, writingDataTypes
};
