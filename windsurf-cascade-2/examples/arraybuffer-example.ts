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
  console.log('💾 Reading package.json as ArrayBuffer with Typed Arrays:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  
  console.log('ArrayBuffer byte length:', arrayBuffer.byteLength);
  
  // Create different typed array views of the same data
  const int8Array = new Int8Array(arrayBuffer);
  const uint8Array = new Uint8Array(arrayBuffer);
  const int16Array = new Int16Array(arrayBuffer);
  const uint16Array = new Uint16Array(arrayBuffer);
  
  console.log('\n📊 Typed Array Views:');
  console.log('Int8Array length:', int8Array.length);
  console.log('Uint8Array length:', uint8Array.length);
  console.log('Int16Array length:', int16Array.length);
  console.log('Uint16Array length:', uint16Array.length);
  
  // Show first few elements of each view
  console.log('\n📋 First 10 elements of each view:');
  console.log('Int8Array:', Array.from(int8Array.slice(0, 10)));
  console.log('Uint8Array:', Array.from(uint8Array.slice(0, 10)));
  console.log('Int16Array:', Array.from(int16Array.slice(0, 5)));
  console.log('Uint16Array:', Array.from(uint16Array.slice(0, 5)));
  
  // Access individual elements
  console.log('\n🔍 Individual element access:');
  console.log('First byte (Int8):', int8Array[0]);
  console.log('First byte (Uint8):', uint8Array[0]);
  console.log('First two bytes as 16-bit (Int16):', int16Array[0]);
  console.log('First two bytes as 16-bit (Uint16):', uint16Array[0]);
  
  return arrayBuffer;
}

// Example 2: Creating and writing binary data
async function createBinaryData() {
  console.log('\n✍️ Creating and writing binary data:');
  
  // Create a buffer with binary data
  const data = new Uint8Array([0x42, 0x75, 0x6E, 0x20, 0x46, 0x69, 0x6C, 0x65]); // "Bun File"
  
  console.log('Binary data (hex):', Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.log('Binary data (ASCII):', String.fromCharCode(...data));
  
  // Write the binary data to a file
  const outputPath = "./binary-demo.dat";
  await Bun.write(outputPath, data);
  
  console.log(`Wrote ${data.length} bytes to ${outputPath}`);
  
  // Read it back
  const readFile = Bun.file(outputPath);
  const readBuffer = await readFile.arrayBuffer();
  const readUint8Array = new Uint8Array(readBuffer);
  
  console.log('Read back data (hex):', Array.from(readUint8Array).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.log('Read back data (ASCII):', String.fromCharCode(...readUint8Array));
  
  return readBuffer;
}

// Example 3: Working with different typed arrays
function demonstrateTypedArrays() {
  console.log('\n🧮 Typed Arrays Demonstration:');
  
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
  
  console.log('Buffer size:', buffer.byteLength, 'bytes');
  console.log('Int8Array:', Array.from(int8View));
  console.log('Uint8Array:', Array.from(uint8View));
  console.log('Int16Array:', Array.from(int16View));
  console.log('Int32Array:', Array.from(int32View));
  console.log('Float32Array:', Array.from(float32View));
  console.log('Float64Array:', Array.from(float64View));
  
  // Show how modifying one view affects others
  console.log('\n🔄 Shared buffer demonstration:');
  int32View[0] = 0x12345678;
  console.log('After setting Int32Array[0] = 0x12345678:');
  console.log('Int8Array first 4 bytes:', Array.from(int8View.slice(0, 4)));
  console.log('Uint8Array first 4 bytes:', Array.from(uint8View.slice(0, 4)));
}

// Example 4: Working with DataView for precise control
async function workWithDataView() {
  console.log('\n🔍 DataView Example:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  
  // Create a DataView for precise control over byte-level access
  const dataView = new DataView(arrayBuffer);
  
  console.log('Buffer size:', arrayBuffer.byteLength, 'bytes');
  
  // Read different data types from specific positions
  if (arrayBuffer.byteLength >= 4) {
    const firstInt8 = dataView.getInt8(0);
    const firstUint8 = dataView.getUint8(0);
    const firstInt16 = dataView.getInt16(0, true); // little endian
    const firstUint16 = dataView.getUint16(0, true); // little endian
    const firstInt32 = dataView.getInt32(0, true); // little endian
    
    console.log('First byte as Int8:', firstInt8);
    console.log('First byte as Uint8:', firstUint8);
    console.log('First 2 bytes as Int16 (LE):', firstInt16);
    console.log('First 2 bytes as Uint16 (LE):', firstUint16);
    console.log('First 4 bytes as Int32 (LE):', firstInt32);
  }
  
  // Write data using DataView
  const writeBuffer = new ArrayBuffer(8);
  const writeView = new DataView(writeBuffer);
  
  writeView.setInt32(0, 0x12345678, true); // little endian
  writeView.setFloat32(4, 3.14159, true); // little endian
  
  const resultInt8 = new Int8Array(writeBuffer);
  console.log('Written data as bytes:', Array.from(resultInt8).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
}

// Main execution
async function main() {
  console.log('🚀 ArrayBuffer and Typed Arrays Examples');
  console.log('=====================================');
  
  try {
    await readAsArrayBufferWithTypedArrays();
    await createBinaryData();
    demonstrateTypedArrays();
    await workWithDataView();
    
    console.log('\n✅ All ArrayBuffer examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
