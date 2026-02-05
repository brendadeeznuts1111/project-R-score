#!/usr/bin/env bun

/**
 * Uint8Array Example
 * 
 * This example demonstrates how to read files directly into Uint8Array using
 * the .bytes() method of BunFile, which is the most efficient way to read
 * binary data in Bun.
 */

// Make this file a module
export {};

// Example 1: Reading a file directly to Uint8Array using .bytes()
async function readAsUint8Array() {
  console.log('💾 Reading package.json directly to Uint8Array:');
  
  const path = "../package.json";
  const file = Bun.file(path);
  
  // Read the file contents directly as Uint8Array
  const byteArray = await file.bytes();
  
  console.log('Uint8Array length:', byteArray.length);
  console.log('First 10 bytes:', Array.from(byteArray.slice(0, 10)));
  
  // Access individual elements
  console.log('First byte:', byteArray[0]);
  console.log('Last byte:', byteArray[byteArray.length - 1]);
  
  // Convert to string to see the actual content
  const text = new TextDecoder().decode(byteArray);
  console.log('First 100 characters as text:', text.substring(0, 100) + '...');
  
  return byteArray;
}

// Example 2: Comparing .bytes() vs .arrayBuffer()
async function compareMethods() {
  console.log('\n🔄 Comparing .bytes() vs .arrayBuffer():');
  
  const file = Bun.file("../package.json");
  
  // Method 1: Using .bytes() (direct Uint8Array)
  console.time('Using .bytes()');
  const byteArray = await file.bytes();
  console.timeEnd('Using .bytes()');
  
  // Method 2: Using .arrayBuffer() then creating Uint8Array
  console.time('Using .arrayBuffer()');
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  console.timeEnd('Using .arrayBuffer()');
  
  console.log('Both methods produce identical results:', byteArray.length === uint8Array.length);
  console.log('First 5 bytes match:', 
    Array.from(byteArray.slice(0, 5)).toString() === 
    Array.from(uint8Array.slice(0, 5)).toString());
}

// Example 3: Working with binary files
async function workWithBinaryData() {
  console.log('\n🖼️ Working with binary data:');
  
  // Create some binary data
  const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
  
  // Write binary data to a file
  const outputPath = "./binary-demo.png";
  await Bun.write(outputPath, binaryData);
  
  console.log(`Wrote ${binaryData.length} bytes to ${outputPath}`);
  
  // Read it back using .bytes()
  const readFile = Bun.file(outputPath);
  const readBytes = await readFile.bytes();
  
  console.log('Read back data:');
  console.log('Length:', readBytes.length);
  console.log('Bytes:', Array.from(readBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  
  // Verify it matches
  const matches = binaryData.every((value, index) => value === readBytes[index]);
  console.log('Data matches original:', matches);
  
  return readBytes;
}

// Example 4: Processing large files with Uint8Array
async function processLargeFile() {
  console.log('\n📊 Processing file with Uint8Array:');
  
  const file = Bun.file("../package.json");
  const byteArray = await file.bytes();
  
  // Count occurrences of specific bytes
  let braceCount = 0;
  let newlineCount = 0;
  
  for (const byte of byteArray) {
    if (byte === 123 || byte === 125) { // { or }
      braceCount++;
    }
    if (byte === 10) { // newline
      newlineCount++;
    }
  }
  
  console.log('Found', braceCount, 'brace characters');
  console.log('Found', newlineCount, 'newlines');
  
  // Find specific patterns
  const pattern = new TextEncoder().encode('name');
  let patternCount = 0;
  
  for (let i = 0; i <= byteArray.length - pattern.length; i++) {
    let found = true;
    for (let j = 0; j < pattern.length; j++) {
      if (byteArray[i + j] !== pattern[j]) {
        found = false;
        break;
      }
    }
    if (found) patternCount++;
  }
  
  console.log('Found', patternCount, 'occurrences of "name"');
}

// Example 5: Uint8Array manipulation
function manipulateUint8Array() {
  console.log('\n🔧 Uint8Array manipulation:');
  
  // Create a Uint8Array
  const data = new Uint8Array([65, 66, 67, 68, 69]); // A, B, C, D, E
  
  console.log('Original data:', Array.from(data));
  console.log('As string:', new TextDecoder().decode(data));
  
  // Manipulate the data
  data[0] = 90; // Change A to Z
  data[2] = 88; // Change C to X
  
  console.log('Modified data:', Array.from(data));
  console.log('As string:', new TextDecoder().decode(data));
  
  // Create a subarray
  const subArray = data.subarray(1, 4); // B, X, D
  console.log('Subarray:', Array.from(subArray));
  console.log('Subarray as string:', new TextDecoder().decode(subArray));
  
  // Copy data
  const copy = data.slice();
  console.log('Copy:', Array.from(copy));
  
  return data;
}

// Main execution
async function main() {
  console.log('🚀 Uint8Array Examples');
  console.log('====================');
  
  try {
    await readAsUint8Array();
    await compareMethods();
    await workWithBinaryData();
    await processLargeFile();
    manipulateUint8Array();
    
    console.log('\n✅ All Uint8Array examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
