#!/usr/bin/env bun

/**
 * ArrayBuffer and Typed Arrays Example
 * 
 * This example demonstrates how to read files as ArrayBuffers and work with
 * typed arrays in Bun, which is particularly useful for binary data.
 */

// Make this file a module
export {};

// Example 1: Reading a file as ArrayBuffer and working with typed arrays
async function readAsArrayBufferWithTypedArrays() {
  console.info('💾 Reading package.json as ArrayBuffer with Typed Arrays:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  
  console.info('ArrayBuffer byte length:', arrayBuffer.byteLength);
  
  // Create different typed array views of the same data
  const int8Array = new Int8Array(arrayBuffer);
  const uint8Array = new Uint8Array(arrayBuffer);
  const int16Array = new Int16Array(arrayBuffer);
  const uint16Array = new Uint16Array(arrayBuffer);
  
  console.info('\n📊 Typed Array Views:');
  console.info('Int8Array length:', int8Array.length);
  console.info('Uint8Array length:', uint8Array.length);
  console.info('Int16Array length:', int16Array.length);
  console.info('Uint16Array length:', uint16Array.length);
  
  // Show first few elements of each view
  console.info('\n📋 First 10 elements of each view:');
  console.info('Int8Array:', Array.from(int8Array.slice(0, 10)));
  console.info('Uint8Array:', Array.from(uint8Array.slice(0, 10)));
  console.info('Int16Array:', Array.from(int16Array.slice(0, 5)));
  console.info('Uint16Array:', Array.from(uint16Array.slice(0, 5)));
  
  // Access individual elements
  console.info('\n🔍 Individual element access:');
  console.info('First byte (Int8):', int8Array[0]);
  console.info('First byte (Uint8):', uint8Array[0]);
  console.info('First two bytes as 16-bit (Int16):', int16Array[0]);
  console.info('First two bytes as 16-bit (Uint16):', uint16Array[0]);
  
  return arrayBuffer;
}

// Example 2: Creating and writing binary data
async function createBinaryData() {
  console.info('\n✍️ Creating and writing binary data:');
  
  // Create a buffer with binary data
  const data = new Uint8Array([0x42, 0x75, 0x6E, 0x20, 0x46, 0x69, 0x6C, 0x65]); // "Bun File"
  
  console.info('Binary data (hex):', Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.info('Binary data (ASCII):', String.fromCharCode(...data));
  
  // Write the binary data to a file
  const outputPath = "./binary-demo.dat";
  await Bun.write(outputPath, data);
  
  console.info(`Wrote ${data.length} bytes to ${outputPath}`);
  
  // Read it back
  const readFile = Bun.file(outputPath);
  const readBuffer = await readFile.arrayBuffer();
  const readUint8Array = new Uint8Array(readBuffer);
  
  console.info('Read back data (hex):', Array.from(readUint8Array).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.info('Read back data (ASCII):', String.fromCharCode(...readUint8Array));
  
  return readBuffer;
}

// Example 3: Working with different typed arrays
function demonstrateTypedArrays() {
  console.info('\n🧮 Typed Arrays Demonstration:');
  
  // Create an ArrayBuffer
  const buffer = new ArrayBuffer(16); // 16 bytes
  
  // Create different views of the same buffer
  const int8View = new Int8Array(buffer);
  const uint8View = new Uint8Array(buffer);
  const int16View = new Int16Array(buffer);
  const int32View = new Int32Array(buffer);
  const float32View = new Float32Array(buffer);
  const float64View = new Float64Array(buffer);
  
  // Fill with some data
  for (let i = 0; i < int8View.length; i++) {
    int8View[i] = i;
  }
  
  console.info('Buffer size:', buffer.byteLength, 'bytes');
  console.info('Int8Array:', Array.from(int8View));
  console.info('Uint8Array:', Array.from(uint8View));
  console.info('Int16Array:', Array.from(int16View));
  console.info('Int32Array:', Array.from(int32View));
  console.info('Float32Array:', Array.from(float32View));
  console.info('Float64Array:', Array.from(float64View));
  
  // Show how modifying one view affects others
  console.info('\n🔄 Shared buffer demonstration:');
  int32View[0] = 0x12345678;
  console.info('After setting Int32Array[0] = 0x12345678:');
  console.info('Int8Array first 4 bytes:', Array.from(int8View.slice(0, 4)));
  console.info('Uint8Array first 4 bytes:', Array.from(uint8View.slice(0, 4)));
}

// Example 4: Working with DataView for precise control
async function workWithDataView() {
  console.info('\n🔍 DataView Example:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  
  // Create a DataView for precise control over byte-level access
  const dataView = new DataView(arrayBuffer);
  
  console.info('Buffer size:', arrayBuffer.byteLength, 'bytes');
  
  // Read different data types from specific positions
  if (arrayBuffer.byteLength >= 4) {
    const firstInt8 = dataView.getInt8(0);
    const firstUint8 = dataView.getUint8(0);
    const firstInt16 = dataView.getInt16(0, true); // little endian
    const firstUint16 = dataView.getUint16(0, true); // little endian
    const firstInt32 = dataView.getInt32(0, true); // little endian
    
    console.info('First byte as Int8:', firstInt8);
    console.info('First byte as Uint8:', firstUint8);
    console.info('First 2 bytes as Int16 (LE):', firstInt16);
    console.info('First 2 bytes as Uint16 (LE):', firstUint16);
    console.info('First 4 bytes as Int32 (LE):', firstInt32);
  }
  
  // Write data using DataView
  const writeBuffer = new ArrayBuffer(8);
  const writeView = new DataView(writeBuffer);
  
  writeView.setInt32(0, 0x12345678, true); // little endian
  writeView.setFloat32(4, 3.14159, true); // little endian
  
  const resultInt8 = new Int8Array(writeBuffer);
  console.info('Written data as bytes:', Array.from(resultInt8).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
}

// Main execution
async function main() {
  console.info('🚀 ArrayBuffer and Typed Arrays Examples');
  console.info('=====================================');
  
  try {
    await readAsArrayBufferWithTypedArrays();
    await createBinaryData();
    demonstrateTypedArrays();
    await workWithDataView();
    
    console.info('\n✅ All ArrayBuffer examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
