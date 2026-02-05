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
  console.log('💾 Reading package.json to Buffer:');
  
  const path = "../package.json";
  const file = Bun.file(path);
  
  // Read the file as ArrayBuffer first, then convert to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log('Buffer length:', buffer.length);
  console.log('First 10 bytes:', Array.from(buffer.subarray(0, 10)));
  
  // Access individual elements
  console.log('First byte:', buffer[0]);
  console.log('Last byte:', buffer[buffer.length - 1]);
  
  // Convert to string to see the actual content
  const text = buffer.toString('utf8');
  console.log('First 100 characters as text:', text.substring(0, 100) + '...');
  
  return buffer;
}

// Example 2: Buffer vs Uint8Array comparison
async function compareBufferAndUint8Array() {
  console.log('\n🔄 Comparing Buffer vs Uint8Array:');
  
  const file = Bun.file("../package.json");
  
  // Read as Uint8Array (Bun's native approach)
  const uint8Array = await file.bytes();
  
  // Read as Buffer (Node.js compatibility approach)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log('Uint8Array length:', uint8Array.length);
  console.log('Buffer length:', buffer.length);
  
  console.log('Both have same length:', uint8Array.length === buffer.length);
  
  // Compare first few bytes
  console.log('First 5 bytes match:', 
    Array.from(uint8Array.slice(0, 5)).toString() === 
    Array.from(buffer.subarray(0, 5)).toString());
  
  // Show Buffer-specific methods
  console.log('Buffer JSON representation:', buffer.toJSON());
  console.log('Buffer base64:', buffer.toString('base64').substring(0, 50) + '...');
}

// Example 3: Working with binary data using Buffer
async function workWithBinaryBuffer() {
  console.log('\n🖼️ Working with binary data using Buffer:');
  
  // Create binary data
  const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
  
  // Write binary data to a file
  const outputPath = "./buffer-demo.png";
  await Bun.write(outputPath, binaryData);
  
  console.log(`Wrote ${binaryData.length} bytes to ${outputPath}`);
  
  // Read it back using Buffer approach
  const readFile = Bun.file(outputPath);
  const readArrayBuffer = await readFile.arrayBuffer();
  const readBuffer = Buffer.from(readArrayBuffer);
  
  console.log('Read back data:');
  console.log('Length:', readBuffer.length);
  console.log('Bytes:', Array.from(readBuffer).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  
  // Verify it matches
  const matches = binaryData.equals(readBuffer);
  console.log('Data matches original:', matches);
  
  return readBuffer;
}

// Example 4: Buffer encoding methods
async function bufferEncodingMethods() {
  console.log('\n🔤 Buffer encoding methods:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Different encoding representations
  console.log('UTF-8 (first 50 chars):', buffer.toString('utf8', 0, 50));
  console.log('Base64 (first 50 chars):', buffer.toString('base64', 0, 50));
  console.log('Hex (first 20 bytes):', buffer.toString('hex', 0, 20));
  
  // Create Buffer from different encodings
  const text = 'Hello, Bun! 🚀';
  const utf8Buffer = Buffer.from(text, 'utf8');
  const base64Buffer = Buffer.from(text, 'base64');
  const hexBuffer = Buffer.from('48656c6c6f', 'hex');
  
  console.log('\nCreating Buffer from different encodings:');
  console.log('UTF-8 Buffer:', utf8Buffer.toString());
  console.log('Base64 Buffer length:', base64Buffer.length);
  console.log('Hex Buffer:', hexBuffer.toString());
}

// Example 5: Buffer manipulation
function manipulateBuffer() {
  console.log('\n🔧 Buffer manipulation:');
  
  // Create a Buffer
  const data = Buffer.from('Hello, World!');
  
  console.log('Original data:', data.toString());
  console.log('Original bytes:', Array.from(data));
  
  // Manipulate the data
  data[0] = 0x5A; // Change 'H' to 'Z'
  data[7] = 0x58; // Change 'W' to 'X'
  
  console.log('Modified data:', data.toString());
  console.log('Modified bytes:', Array.from(data));
  
  // Create a sub-buffer
  const subBuffer = data.subarray(1, 8); // 'ello, X'
  console.log('Sub-buffer:', subBuffer.toString());
  
  // Copy data
  const copy = Buffer.from(data);
  console.log('Copy:', copy.toString());
  
  // Buffer comparison
  console.log('Original equals copy:', data.equals(copy));
  
  return data;
}

// Main execution
async function main() {
  console.log('🚀 Buffer Examples');
  console.log('=================');
  
  try {
    await readAsBuffer();
    await compareBufferAndUint8Array();
    await workWithBinaryBuffer();
    await bufferEncodingMethods();
    manipulateBuffer();
    
    console.log('\n✅ All Buffer examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
