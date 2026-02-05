#!/usr/bin/env bun

/**
 * ReadableStream Example
 * 
 * This example demonstrates how to read files as ReadableStream using
 * Bun.file().stream() in Bun.
 */

// Make this file a module
export {};

// Example 1: Basic ReadableStream reading
async function basicReadableStream() {
  console.log('🌊 Basic ReadableStream Reading:');
  
  const path = "../package.json";
  const file = Bun.file(path);
  
  // Get the stream
  const stream = file.stream();
  
  console.log(`File size: ${file.size} bytes`);
  console.log('Reading file as stream...');
  
  let totalBytes = 0;
  let chunkCount = 0;
  
  // Consume the stream using for await
  for await (const chunk of stream) {
    chunkCount++;
    totalBytes += chunk.byteLength;
    
    // Show first few chunks
    if (chunkCount <= 3) {
      console.log(`  Chunk ${chunkCount}: ${chunk.byteLength} bytes`);
      console.log(`    First 20 bytes: ${Array.from(chunk.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    } else if (chunkCount === 4) {
      console.log('  ... (additional chunks omitted for brevity)');
    }
  }
  
  console.log(`\nTotal chunks processed: ${chunkCount}`);
  console.log(`Total bytes read: ${totalBytes}`);
  console.log(`File size matches bytes read: ${totalBytes === file.size}`);
}

// Example 2: Stream processing with transformation
async function streamWithTransformation() {
  console.log('\n🔄 Stream Processing with Transformation:');
  
  const path = "../README.md";
  const file = Bun.file(path);
  
  const stream = file.stream();
  
  console.log('Processing README.md as stream with line counting...');
  
  let lineCount = 0;
  let wordCount = 0;
  let characterCount = 0;
  
  for await (const chunk of stream) {
    // Convert chunk to string
    const text = new TextDecoder().decode(chunk);
    
    // Count characters
    characterCount += text.length;
    
    // Count words (simple approach)
    const words = text.split(/\s+/).filter(word => word.length > 0);
    wordCount += words.length;
    
    // Count lines
    const lines = text.split('\n');
    lineCount += lines.length - 1; // -1 because we don't count the last partial line
    
    // Check if the chunk ends with a newline (indicating complete lines)
    if (text.endsWith('\n')) {
      lineCount++;
    }
  }
  
  console.log(`Lines: ${lineCount}`);
  console.log(`Words: ${wordCount}`);
  console.log(`Characters: ${characterCount}`);
}

// Example 3: Stream processing with GetReader
async function streamWithGetReader() {
  console.log('\n📖 Stream Processing with GetReader:');
  
  const path = "../server.ts";
  const file = Bun.file(path);
  
  const stream = file.stream();
  const reader = stream.getReader();
  
  console.log('Processing server.ts with manual reader...');
  
  let totalBytes = 0;
  let chunkCount = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream reading complete');
        break;
      }
      
      chunkCount++;
      totalBytes += value.byteLength;
      
      // Process the chunk
      if (chunkCount <= 2) {
        console.log(`  Chunk ${chunkCount}: ${value.byteLength} bytes`);
        const text = new TextDecoder().decode(value);
        console.log(`    Content preview: ${text.substring(0, 50)}...`);
      } else if (chunkCount === 3) {
        console.log('  ... (additional chunks omitted for brevity)');
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  console.log(`\nProcessed ${chunkCount} chunks`);
  console.log(`Total bytes: ${totalBytes}`);
}

// Example 4: Stream processing and writing
async function streamProcessingAndWriting() {
  console.log('\n🔗 Stream Processing and Writing:');
  
  const inputFile = Bun.file("../package.json");
  
  console.log('Processing package.json stream and writing to stream-output.json...');
  
  // Get the input stream
  const inputStream = inputFile.stream();
  
  // Collect all chunks from the stream
  const chunks: Uint8Array[] = [];
  for await (const chunk of inputStream) {
    chunks.push(chunk);
  }
  
  // Combine chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  
  // Write to output file
  const bytesWritten = await Bun.write("./stream-output.json", combined);
  
  console.log(`Successfully wrote ${bytesWritten} bytes`);
  
  // Verify the output
  const outputFile = Bun.file("./stream-output.json");
  const outputContent = await outputFile.text();
  const inputContent = await inputFile.text();
  
  console.log(`Content matches: ${outputContent === inputContent}`);
  
  // Clean up
  try {
    await fs.promises.unlink("./stream-output.json");
    console.log('Cleaned up output file');
  } catch (error: any) {
    console.log(`Error cleaning up: ${error.message}`);
  }
}

// Example 5: Stream processing with async generators
async function streamWithAsyncGenerators() {
  console.log('\n⚡ Stream Processing with Async Generators:');
  
  // Create an async generator that processes a stream
  async function* processStream(file: ReturnType<typeof Bun.file>) {
    const stream = file.stream();
    
    for await (const chunk of stream) {
      // Transform the chunk (e.g., convert to uppercase text)
      const text = new TextDecoder().decode(chunk);
      const upperText = text.toUpperCase();
      
      // Yield the transformed chunk
      yield {
        originalSize: chunk.byteLength,
        transformedSize: upperText.length,
        content: upperText.substring(0, 50) + (upperText.length > 50 ? '...' : '')
      };
    }
  }
  
  const file = Bun.file("../dashboard.html");
  console.log('Processing dashboard.html with async generator...');
  
  let chunkCount = 0;
  
  // Use the async generator
  for await (const result of processStream(file)) {
    chunkCount++;
    
    if (chunkCount <= 2) {
      console.log(`  Processed chunk ${chunkCount}:`);
      console.log(`    Original size: ${result.originalSize} bytes`);
      console.log(`    Transformed preview: ${result.content}`);
    } else if (chunkCount === 3) {
      console.log('  ... (additional chunks omitted for brevity)');
    }
  }
  
  console.log(`\nProcessed ${chunkCount} chunks with async generator`);
}

// Example 6: Stream error handling
async function streamWithErrorHandling() {
  console.log('\n🛡️ Stream Error Handling:');
  
  // Try to read a non-existent file
  const nonExistentFile = Bun.file("../non-existent-file.txt");
  
  try {
    const stream = nonExistentFile.stream();
    
    // Try to read from the stream
    for await (const chunk of stream) {
      console.log('This should not be printed');
    }
  } catch (error: any) {
    console.log(`Caught expected error: ${error.message}`);
  }
  
  // Try with an existing file but handle potential errors during processing
  const existingFile = Bun.file("../package.json");
  
  try {
    const stream = existingFile.stream();
    
    for await (const chunk of stream) {
      // Simulate an error in processing
      if (chunk.byteLength > 1000000) { // This is just for demonstration
        throw new Error('Simulated processing error');
      }
      
      // Process normally
      // In a real scenario, we might do something with the chunk here
    }
    
    console.log('File processed successfully');
  } catch (error: any) {
    console.log(`Caught processing error: ${error.message}`);
  }
}

// Example 7: Stream performance comparison
async function streamPerformanceComparison() {
  console.log('\n⚡ Stream Performance Comparison:');
  
  const file = Bun.file("../server.ts");
  
  // Method 1: Read entire file at once
  console.time('Read entire file');
  const fullContent = await file.text();
  console.timeEnd('Read entire file');
  
  // Method 2: Read as stream
  console.time('Read as stream');
  let streamBytes = 0;
  const stream = file.stream();
  
  for await (const chunk of stream) {
    streamBytes += chunk.byteLength;
  }
  
  console.timeEnd('Read as stream');
  console.log(`Stream read ${streamBytes} bytes`);
  console.log(`Content sizes match: ${fullContent.length === streamBytes}`);
}

// Main execution
async function main() {
  console.log('🚀 ReadableStream Examples');
  console.log('========================');
  
  try {
    await basicReadableStream();
    await streamWithTransformation();
    await streamWithGetReader();
    await streamProcessingAndWriting();
    await streamWithAsyncGenerators();
    await streamWithErrorHandling();
    await streamPerformanceComparison();
    
    console.log('\n✅ All ReadableStream examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Import fs for cleanup
import fs from 'fs';

// Run the examples
await main();
