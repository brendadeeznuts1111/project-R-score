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
  console.info('🔍 Basic MIME Type Detection:');
  
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
        console.info(`${filePath}: ${file.type}`);
      } else {
        console.info(`${filePath}: File not found`);
      }
    } catch (error: any) {
      console.info(`${filePath}: Error - ${error.message}`);
    }
  }
}

// Example 2: Creating files with different extensions and checking types
async function createAndCheckTypes() {
  console.info('\n📄 Creating Files and Checking MIME Types:');
  
  // Create sample files with different extensions
  const sampleFiles = [
    { name: 'sample.txt', content: 'This is a text file.', expected: 'text/plain' },
    { name: 'sample.json', content: '{"key": "value"}', expected: 'application/json' },
    { name: 'sample.html', content: '<html><body>Hello</body></html>', expected: 'text/html' },
    { name: 'sample.css', content: 'body { color: red; }', expected: 'text/css' },
    { name: 'sample.js', content: 'console.info("Hello");', expected: 'text/javascript' },
    { name: 'sample.xml', content: '<?xml version="1.0"?><root>data</root>', expected: 'application/xml' }
  ];
  
  for (const { name, content, expected } of sampleFiles) {
    try {
      // Write the file
      await Bun.write(name, content);
      
      // Check the MIME type
      const file = Bun.file(name);
      console.info(`${name}: ${file.type} (expected: ${expected})`);
      
      // Verify it matches expectation (note: may not always match exactly)
      const matches = file.type === expected;
      if (!matches) {
        console.info(`  Note: Actual type differs from expected`);
      }
    } catch (error: any) {
      console.info(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 3: MIME type detection for binary files
async function binaryFileTypeDetection() {
  console.info('\n🖼️ Binary File MIME Type Detection:');
  
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
      console.info(`${name}: ${file.type} (expected: ${expected})`);
      
      // Show first few bytes for verification
      console.info(`  First bytes: ${Array.from(data.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    } catch (error: any) {
      console.info(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 4: MIME type detection with custom extensions
async function customExtensionDetection() {
  console.info('\n🔧 Custom Extension MIME Type Detection:');
  
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
      console.info(`${name}: ${file.type}`);
    } catch (error: any) {
      console.info(`${name}: Error - ${error.message}`);
    }
  }
}

// Example 5: MIME type utility functions
function analyzeMimeType(mimeType: string) {
  console.info('\n📊 MIME Type Analysis:');
  console.info(`MIME Type: ${mimeType}`);
  
  // Parse MIME type
  const [type, subtype] = mimeType.split('/');
  console.info(`Type: ${type}`);
  console.info(`Subtype: ${subtype}`);
  
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
  
  console.info(`Category: ${category}`);
  
  // Check if it's a common web type
  const webTypes = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'image/png', 'image/jpeg', 'image/gif'];
  const isWebType = webTypes.includes(mimeType);
  console.info(`Is common web type: ${isWebType}`);
}

// Example 6: File type validation
async function validateFileType(filePath: string, allowedTypes: string[]) {
  console.info(`\n✅ File Type Validation for ${filePath}:`);
  
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      console.info('File does not exist');
      return false;
    }
    
    const mimeType = file.type;
    console.info(`File MIME type: ${mimeType}`);
    
    const isValid = allowedTypes.includes(mimeType);
    console.info(`Is allowed type: ${isValid}`);
    
    if (!isValid) {
      console.info(`Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return isValid;
  } catch (error: any) {
    console.info(`Error: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.info('🚀 MIME Type Detection Examples');
  console.info('==============================');
  
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
    
    console.info('\n✅ All MIME type examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
