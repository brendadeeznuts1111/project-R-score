#!/usr/bin/env bun

/**
 * Bun FileSink API - Core Examples
 *
 * Focused examples demonstrating the essential FileSink functionality
 * for incremental file writing in Bun.
 */

// Example 1: Basic FileSink usage
function basicFileSinkUsage() {
  console.log('📝 Basic FileSink Usage');

  const file = Bun.file('./output/basic-sink.txt');
  const writer = file.writer();

  // Write multiple small chunks
  writer.write("Hello");
  writer.write(" ");
  writer.write("World");
  writer.write("!\n");

  // Flush to ensure data is written to disk
  writer.flush();
  console.log('✅ Data flushed to disk');

  // Continue writing more data
  writer.write("This is additional content.\n");
  writer.write("Written after the first flush.\n");

  // End the writer (auto-flushes and closes file)
  writer.end();
  console.log('✅ Writer ended - file closed');
}

// Example 2: Writing different data types
function writingDataTypes() {
  console.log('\n🔄 Writing Different Data Types');

  const file = Bun.file('./output/data-types.bin');
  const writer = file.writer();

  // String data
  writer.write("String data\n");

  // Buffer data
  writer.write(Buffer.from("Buffer data\n"));

  // Uint8Array data
  writer.write(new Uint8Array([0x48, 0x49, 0x4A, 0x4B, 0x0A])); // "HIJK\n"

  // Mixed binary data
  const binaryChunk = new Uint8Array([0xFF, 0x00, 0xAA, 0x55]);
  writer.write(binaryChunk);

  writer.flush();
  writer.end();
  console.log('✅ Multiple data types written');
}

// Example 3: Custom buffer size (highWaterMark)
function customBufferSize() {
  console.log('\n📊 Custom Buffer Size');

  // Create writer with 1MB buffer
  const file = Bun.file('./output/large-buffer.txt');
  const writer = file.writer({ highWaterMark: 1024 * 1024 });

  console.log(`📏 Buffer size: ${1024 * 1024} bytes (1MB)`);

  // Write data that will be buffered
  const largeChunk = 'x'.repeat(500 * 1024); // 500KB chunk
  writer.write(largeChunk);
  console.log('📝 500KB written (still in buffer)');

  // Write another chunk - this will trigger auto-flush when buffer is full
  writer.write(largeChunk);
  console.log('📝 Another 500KB written (buffer should auto-flush)');

  writer.end();
  console.log('✅ Custom buffer example completed');
}

// Example 4: Manual vs Auto flushing
function flushingBehavior() {
  console.log('\n💾 Manual vs Auto Flushing');

  const file = Bun.file('./output/flushing-demo.txt');
  const writer = file.writer({ highWaterMark: 1024 }); // 1KB buffer for demo

  // Write small chunks that won't trigger auto-flush
  writer.write("Small chunk 1\n");
  writer.write("Small chunk 2\n");
  writer.write("Small chunk 3\n");

  console.log('📝 Small chunks written (buffered, not flushed yet)');

  // Manual flush
  writer.flush();
  console.log('💾 Manually flushed buffer');

  // Write more data
  writer.write("After manual flush\n");

  // Write enough to trigger auto-flush
  const largeChunk = 'x'.repeat(2048); // 2KB (exceeds 1KB buffer)
  writer.write(largeChunk);
  console.log('📝 Large chunk written (should auto-flush)');

  writer.end();
  console.log('✅ Flushing behavior demo completed');
}

// Example 5: Error handling with FileSink
function errorHandling() {
  console.log('\n🛡️ Error Handling');

  const file = Bun.file('./output/error-demo.txt');
  const writer = file.writer();

  try {
    writer.write("Starting error handling demo\n");

    // Simulate an operation that might fail
    const simulateError = false; // Set to true to test error path

    if (simulateError) {
      throw new Error("Simulated write error");
    }

    writer.write("Operation completed successfully\n");
    writer.end();
    console.log('✅ No errors occurred');

  } catch (error) {
    console.error('❌ Error caught:', error.message);

    // Ensure cleanup even on error
    try {
      writer.end();
      console.log('✅ Writer properly closed after error');
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
  }
}

// Example 6: Real-time logging simulation
function realTimeLogging() {
  console.log('\n📊 Real-time Logging Simulation');

  const file = Bun.file('./output/real-time.log');
  const writer = file.writer({ highWaterMark: 4096 }); // 4KB buffer

  const logMessages = [
    { level: 'INFO', message: 'Application started', timestamp: new Date() },
    { level: 'DEBUG', message: 'Loading configuration', timestamp: new Date() },
    { level: 'INFO', message: 'Database connected', timestamp: new Date() },
    { level: 'WARN', message: 'High memory usage detected', timestamp: new Date() },
    { level: 'ERROR', message: 'Failed to process request', timestamp: new Date() },
    { level: 'INFO', message: 'Retrying operation', timestamp: new Date() },
    { level: 'INFO', message: 'Operation completed', timestamp: new Date() },
  ];

  logMessages.forEach((log, index) => {
    const logLine = `[${log.level}] ${log.timestamp.toISOString()}: ${log.message}\n`;
    writer.write(logLine);
    console.log(`📝 Logged: ${log.level} - ${log.message}`);

    // Flush every few log entries
    if ((index + 1) % 3 === 0) {
      writer.flush();
      console.log('💾 Log buffer flushed');
    }
  });

  writer.end();
  console.log('✅ Real-time logging completed');
}

// Main execution
async function runCoreExamples() {
  console.log('🚀 Bun FileSink API - Core Examples');
  console.log('====================================\n');

  try {
    // Ensure output directory exists
    try {
      await Bun.write('./output/.gitkeep', '');
    } catch (error) {
      // Directory might already exist, that's fine
    }

    basicFileSinkUsage();
    writingDataTypes();
    customBufferSize();
    flushingBehavior();
    errorHandling();
    realTimeLogging();

    console.log('\n🎉 All core examples completed!');
    console.log('📁 Check ./output/ directory for generated files');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('filesink-core-examples.ts')) {
  runCoreExamples().catch(console.error);
}

export {
    basicFileSinkUsage, customBufferSize, errorHandling, flushingBehavior, realTimeLogging, writingDataTypes
};
