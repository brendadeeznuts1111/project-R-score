#!/usr/bin/env bun

/**
 * MIME Type Detection Example
 * 
 * This example demonstrates how to detect MIME types of files using
 * the .type property of BunFile instances in Bun.
 */

// Make this file a module
export {};

// Example 1: Basic MIME type detection
async function basicMimeTypeDetection() {
  console.log('🔍 Basic MIME Type Detection:');
  
  // Common file types
  const files = [
    '../package.json',
    '../server.ts',
    '../dashboard.html',
    '../README.md',
    './demo.json',
    './binary-demo.dat'
  ];
  
  for (const filePath of files) {
    try {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        console.log(`${filePath}: ${file.type}`);
      } else {
        console.log(`${filePath}: File not found`);
      }
    } catch (error: any) {
      console.log(`${filePath}: Error - ${error.message}`);
    }
  }
}

// Example 2: Creating files with different extensions and checking types
async function createAndCheckTypes() {
  console.log('\n📄 Creating Files and Checking MIME Types:');
  
  // Create sample files with different extensions
  const sampleFiles = [
    { name: 'sample.txt', content: 'This is a text file.', expected: 'text/plain' },
    { name: 'sample.json', content: '{"key": "value"}', expected: 'application/json' },
    { name: 'sample.html', content: '<html><body>Hello</body></html>', expected: 'text/html' },
    { name: 'sample.css', content: 'body { color: red; }', expected: 'text/css' },
    { name: 'sample.js', content: 'console.log("Hello");', expected: 'text/javascript' },
    { name: 'sample.xml', content: '<?xml version="1.0"?><root>data</root>', expected: 'application/xml' }
  ];
  
  for (const { name, content, expected } of sampleFiles) {
    try {
      // Write the file
      await Bun.write(name, content);
      
      // Check the MIME type
      const file = Bun.file(name);
      console.log(`${name}: ${file.type} (expected: ${expected})`);
      
      // Verify it matches expectation (note: may not always match exactly)
      const matches = file.type === expected;
      if (!matches) {
        console.log(`  Note: Actual type differs from expected`);
      }
    } catch (error: any) {
      console.log(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 3: MIME type detection for binary files
async function binaryFileTypeDetection() {
  console.log('\n🖼️ Binary File MIME Type Detection:');
  
  // Create some binary data with known signatures
  const binaryFiles = [
    { 
      name: 'test.png', 
      data: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      expected: 'image/png'
    },
    { 
      name: 'test.jpg', 
      data: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      expected: 'image/jpeg'
    },
    { 
      name: 'test.gif', 
      data: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      expected: 'image/gif'
    }
  ];
  
  for (const { name, data, expected } of binaryFiles) {
    try {
      // Write the binary file
      await Bun.write(name, data);
      
      // Check the MIME type
      const file = Bun.file(name);
      console.log(`${name}: ${file.type} (expected: ${expected})`);
      
      // Show first few bytes for verification
      console.log(`  First bytes: ${Array.from(data.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    } catch (error: any) {
      console.log(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 4: MIME type detection with custom extensions
async function customExtensionDetection() {
  console.log('\n🔧 Custom Extension MIME Type Detection:');
  
  // Create files with custom or uncommon extensions
  const customFiles = [
    { name: 'config.yaml', content: 'name: test\nversion: 1.0' },
    { name: 'data.csv', content: 'name,age\nAlice,30\nBob,25' },
    { name: 'script.py', content: 'print("Hello, World!")' },
    { name: 'document.pdf', content: '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<' },
    { name: 'archive.tar', content: 'ustar\x00\x00\x00\x00\x00' }
  ];
  
  for (const { name, content } of customFiles) {
    try {
      // Write the file
      await Bun.write(name, content);
      
      // Check the MIME type
      const file = Bun.file(name);
      console.log(`${name}: ${file.type}`);
    } catch (error: any) {
      console.log(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 5: MIME type utility functions
function analyzeMimeType(mimeType: string) {
  console.log('\n📊 MIME Type Analysis:');
  console.log(`MIME Type: ${mimeType}`);
  
  // Parse MIME type
  const [type, subtype] = mimeType.split('/');
  console.log(`Type: ${type}`);
  console.log(`Subtype: ${subtype}`);
  
  // Determine category
  let category = 'unknown';
  if (type === 'text') category = 'text';
  else if (type === 'image') category = 'image';
  else if (type === 'audio') category = 'audio';
  else if (type === 'video') category = 'video';
  else if (type === 'application') {
    if (subtype.includes('json')) category = 'data';
    else if (subtype.includes('xml')) category = 'data';
    else if (subtype.includes('pdf')) category = 'document';
    else category = 'application';
  }
  
  console.log(`Category: ${category}`);
  
  // Check if it's a common web type
  const webTypes = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'image/png', 'image/jpeg', 'image/gif'];
  const isWebType = webTypes.includes(mimeType);
  console.log(`Is common web type: ${isWebType}`);
}

// Example 6: File type validation
async function validateFileType(filePath: string, allowedTypes: string[]) {
  console.log(`\n✅ File Type Validation for ${filePath}:`);
  
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      console.log('File does not exist');
      return false;
    }
    
    const mimeType = file.type;
    console.log(`File MIME type: ${mimeType}`);
    
    const isValid = allowedTypes.includes(mimeType);
    console.log(`Is allowed type: ${isValid}`);
    
    if (!isValid) {
      console.log(`Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return isValid;
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 MIME Type Detection Examples');
  console.log('==============================');
  
  try {
    await basicMimeTypeDetection();
    await createAndCheckTypes();
    await binaryFileTypeDetection();
    await customExtensionDetection();
    
    // Analyze a specific MIME type
    analyzeMimeType('application/json');
    
    // Validate file types
    await validateFileType('../package.json', ['application/json', 'text/plain']);
    await validateFileType('../dashboard.html', ['text/html', 'application/json']);
    
    console.log('\n✅ All MIME type examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
