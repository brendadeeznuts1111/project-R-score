#!/usr/bin/env bun

/**
 * Buffer Example
 * 
 * This example demonstrates how to read files into Buffer instances in Bun.
 * While Bun primarily uses Uint8Array, Buffer is available for Node.js compatibility.
 */

// Make this file a module
export {};

// Example 1: Reading a file to Buffer (Node.js compatibility)
async function readAsBuffer() {
  console.info('💾 Reading package.json to Buffer:');
  
  const path = "../package.json";
  const file = Bun.file(path);
  
  // Read the file as ArrayBuffer first, then convert to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.info('Buffer length:', buffer.length);
  console.info('First 10 bytes:', Array.from(buffer.subarray(0, 10)));
  
  // Access individual elements
  console.info('First byte:', buffer[0]);
  console.info('Last byte:', buffer[buffer.length - 1]);
  
  // Convert to string to see the actual content
  const text = buffer.toString('utf8');
  console.info('First 100 characters as text:', text.substring(0, 100) + '...');
  
  return buffer;
}

// Example 2: Buffer vs Uint8Array comparison
async function compareBufferAndUint8Array() {
  console.info('\n🔄 Comparing Buffer vs Uint8Array:');
  
  const file = Bun.file("../package.json");
  
  // Read as Uint8Array (Bun's native approach)
  const uint8Array = await file.bytes();
  
  // Read as Buffer (Node.js compatibility approach)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.info('Uint8Array length:', uint8Array.length);
  console.info('Buffer length:', buffer.length);
  
  console.info('Both have same length:', uint8Array.length === buffer.length);
  
  // Compare first few bytes
  console.info('First 5 bytes match:', 
    Array.from(uint8Array.slice(0, 5)).toString() === 
    Array.from(buffer.subarray(0, 5)).toString());
  
  // Show Buffer-specific methods
  console.info('Buffer JSON representation:', buffer.toJSON());
  console.info('Buffer base64:', buffer.toString('base64').substring(0, 50) + '...');
}

// Example 3: Working with binary data using Buffer
async function workWithBinaryBuffer() {
  console.info('\n🖼️ Working with binary data using Buffer:');
  
  // Create binary data
  const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
  
  // Write binary data to a file
  const outputPath = "./buffer-demo.png";
  await Bun.write(outputPath, binaryData);
  
  console.info(`Wrote ${binaryData.length} bytes to ${outputPath}`);
  
  // Read it back using Buffer approach
  const readFile = Bun.file(outputPath);
  const readArrayBuffer = await readFile.arrayBuffer();
  const readBuffer = Buffer.from(readArrayBuffer);
  
  console.info('Read back data:');
  console.info('Length:', readBuffer.length);
  console.info('Bytes:', Array.from(readBuffer).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  
  // Verify it matches
  const matches = binaryData.equals(readBuffer);
  console.info('Data matches original:', matches);
  
  return readBuffer;
}

// Example 4: Buffer encoding methods
async function bufferEncodingMethods() {
  console.info('\n🔤 Buffer encoding methods:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Different encoding representations
  console.info('UTF-8 (first 50 chars):', buffer.toString('utf8', 0, 50));
  console.info('Base64 (first 50 chars):', buffer.toString('base64', 0, 50));
  console.info('Hex (first 20 bytes):', buffer.toString('hex', 0, 20));
  
  // Create Buffer from different encodings
  const text = 'Hello, Bun! 🚀';
  const utf8Buffer = Buffer.from(text, 'utf8');
  const base64Buffer = Buffer.from(text, 'base64');
  const hexBuffer = Buffer.from('48656c6c6f', 'hex');
  
  console.info('\nCreating Buffer from different encodings:');
  console.info('UTF-8 Buffer:', utf8Buffer.toString());
  console.info('Base64 Buffer length:', base64Buffer.length);
  console.info('Hex Buffer:', hexBuffer.toString());
}

// Example 5: Buffer manipulation
function manipulateBuffer() {
  console.info('\n🔧 Buffer manipulation:');
  
  // Create a Buffer
  const data = Buffer.from('Hello, World!');
  
  console.info('Original data:', data.toString());
  console.info('Original bytes:', Array.from(data));
  
  // Manipulate the data
  data[0] = 0x5A; // Change 'H' to 'Z'
  data[7] = 0x58; // Change 'W' to 'X'
  
  console.info('Modified data:', data.toString());
  console.info('Modified bytes:', Array.from(data));
  
  // Create a sub-buffer
  const subBuffer = data.subarray(1, 8); // 'ello, X'
  console.info('Sub-buffer:', subBuffer.toString());
  
  // Copy data
  const copy = Buffer.from(data);
  console.info('Copy:', copy.toString());
  
  // Buffer comparison
  console.info('Original equals copy:', data.equals(copy));
  
  return data;
}

// Main execution
async function main() {
  console.info('🚀 Buffer Examples');
  console.info('=================');
  
  try {
    await readAsBuffer();
    await compareBufferAndUint8Array();
    await workWithBinaryBuffer();
    await bufferEncodingMethods();
    manipulateBuffer();
    
    console.info('\n✅ All Buffer examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
