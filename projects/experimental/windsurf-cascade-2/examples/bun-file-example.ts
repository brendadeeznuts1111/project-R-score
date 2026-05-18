#!/usr/bin/env bun

/**
 * Bun.file() Example
 * 
 * This example demonstrates how to use Bun.file() to work with files in Bun.
 * Bun.file() provides an efficient way to read and write files with built-in
 * streaming capabilities.
 */

// Make this file a module
export {};

// Example 1: Reading a JSON file with Bun.file()
async function readPackageJson() {
  console.info('📦 Reading package.json with Bun.file():');
  
  const path = "../package.json";
  const file = Bun.file(path);
  
  // Read the file contents as JSON
  const contents = await file.json();
  console.info('File contents:', contents);
  
  // Access file metadata
  console.info('File type:', file.type);
  console.info('File size:', file.size, 'bytes');
  
  return contents;
}

// Example 2: Reading file as text
async function readAsText() {
  console.info('\n📄 Reading file as text:');
  
  const file = Bun.file("../package.json");
  const text = await file.text();
  
  console.info('First 100 characters:', text.substring(0, 100) + '...');
  
  return text;
}

// Example 3: Reading file as array buffer
async function readAsArrayBuffer() {
  console.info('\n💾 Reading file as ArrayBuffer:');
  
  const file = Bun.file("../package.json");
  const arrayBuffer = await file.arrayBuffer();
  
  console.info('ArrayBuffer byte length:', arrayBuffer.byteLength);
  
  // Work with the ArrayBuffer using typed arrays
  const int8Array = new Int8Array(arrayBuffer);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  console.info('Int8Array length:', int8Array.length);
  console.info('First 10 bytes as Int8:', Array.from(int8Array.slice(0, 10)));
  console.info('First 10 bytes as Uint8:', Array.from(uint8Array.slice(0, 10)));
  
  // Show how to access individual bytes
  console.info('First byte:', int8Array[0]);
  console.info('Last byte:', int8Array[int8Array.length - 1]);
  
  return arrayBuffer;
}

// Example 4: Checking if a file exists
async function checkFileExists() {
  console.info('\n🔍 Checking if files exist:');
  
  const existingFile = Bun.file("../package.json");
  const missingFile = Bun.file("./non-existent-file.txt");
  
  console.info('package.json exists:', await existingFile.exists());
  console.info('non-existent-file.txt exists:', await missingFile.exists());
}

// Example 5: Writing files with Bun.file()
async function writeFileExample() {
  console.info('\n✍️ Writing files with Bun.file():');
  
  // Create a sample data object
  const sampleData = {
    name: "bun-file-demo",
    version: "1.0.0",
    description: "Demonstration of Bun.file() functionality",
    timestamp: new Date().toISOString()
  };
  
  // Write JSON data to a file
  const outputPath = "./demo.json";
  await Bun.write(outputPath, JSON.stringify(sampleData, null, 2));
  
  console.info(`Wrote data to ${outputPath}`);
  
  // Verify by reading it back
  const writtenFile = Bun.file(outputPath);
  const writtenContents = await writtenFile.json();
  console.info('Written contents:', writtenContents);
}

// Example 6: Working with binary files
async function workWithBinaryFiles() {
  console.info('\n🖼️ Working with binary files:');
  
  // Check if we have any image files to work with
  const possibleImages = [
    './assets/logo.png',
    './public/favicon.ico',
    './icon.png'
  ];
  
  for (const imagePath of possibleImages) {
    const file = Bun.file(imagePath);
    if (await file.exists()) {
      console.info(`Found image: ${imagePath}`);
      console.info(`Size: ${file.size} bytes`);
      console.info(`Type: ${file.type}`);
      return;
    }
  }
  
  console.info('No image files found in common locations');
}

// Example 7: File streaming
async function streamFile() {
  console.info('\n🌊 Streaming file contents:');
  
  const file = Bun.file("../package.json");
  
  // Get a stream reader
  const reader = file.stream().getReader();
  
  let chunks = 0;
  let totalBytes = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.info(`Stream complete. Processed ${chunks} chunks with ${totalBytes} total bytes`);
      break;
    }
    
    chunks++;
    totalBytes += value.byteLength;
    
    // Process chunk (in a real app, you might do something with each chunk)
    if (chunks <= 3) {
      console.info(`  Chunk ${chunks}: ${value.byteLength} bytes`);
    } else if (chunks === 4) {
      console.info('  ... (additional chunks omitted for brevity)');
    }
  }
}

// Main execution
async function main() {
  console.info('🚀 Bun.file() Examples');
  console.info('=====================');
  
  try {
    await readPackageJson();
    await readAsText();
    await readAsArrayBuffer();
    await checkFileExists();
    await writeFileExample();
    await workWithBinaryFiles();
    await streamFile();
    
    console.info('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
