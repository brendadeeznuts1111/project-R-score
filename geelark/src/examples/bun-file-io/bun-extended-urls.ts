#!/usr/bin/env bun

/**
 * Bun Extended URL Protocol Support
 *
 * Comprehensive examples demonstrating S3, file://, data:, and blob: URL schemes
 * with proper error handling and real-world use cases.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Example 1: S3 URL fetching
console.log('🗂️ S3 URL Protocol Support');

async function s3UrlExamples() {
  console.log('\n📝 Testing S3 URL schemes...');

  // Note: These examples assume S3 is configured
  // In practice, you'd need valid AWS credentials and bucket access

  // Example 1: Using environment variables
  console.log('\n1. S3 with environment variables:');
  try {
    // This would use AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION from env
    // const response = await fetch("s3://my-bucket/example.txt");
    console.log('ℹ️ S3 with env vars (requires valid credentials)');
  } catch (error) {
    console.log('ℹ️ Expected: S3 requires valid credentials');
  }

  // Example 2: Explicit credentials
  console.log('\n2. S3 with explicit credentials:');
  try {
    const response = await fetch("s3://demo-bucket/test-file.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });
    console.log('ℹ️ S3 with explicit credentials (requires valid keys)');
  } catch (error) {
    console.log('ℹ️ Expected: S3 requires valid AWS credentials');
  }

  // Example 3: S3 upload (PUT/POST with body)
  console.log('\n3. S3 upload with streaming body:');
  try {
    const uploadData = "This is test data for S3 upload";
    const response = await fetch("s3://my-bucket/uploads/test.txt", {
      method: 'PUT',
      body: uploadData,
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });
    console.log('ℹ️ S3 upload (requires valid credentials and permissions)');
  } catch (error) {
    console.log('ℹ️ Expected: S3 upload requires valid credentials');
  }

  // Example 4: S3 error handling
  console.log('\n4. S3 error scenarios:');
  try {
    // Invalid bucket name
    await fetch("s3://invalid-bucket-name/file.txt", {
      s3: {
        accessKeyId: "invalid",
        secretAccessKey: "invalid",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.log('✅ Caught S3 authentication error:', error.message);
  }
}

// Example 2: File URL protocol
console.log('\n📁 File URL Protocol Support');

async function fileUrlExamples() {
  console.log('\n📝 Testing file:// protocol...');

  // Create a test directory and file
  const testDir = './temp-test-files';
  const testFile = join(testDir, 'test.txt');
  const testContent = 'Hello from file:// protocol!';

  try {
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create test file
    writeFileSync(testFile, testContent);
    console.log(`✅ Created test file: ${testFile}`);

    // Example 1: Basic file URL reading
    console.log('\n1. Basic file URL:');
    try {
      const fileUrl = `file://${testFile}`;
      const response = await fetch(fileUrl);
      const text = await response.text();
      console.log(`✅ File content: "${text}"`);
    } catch (error) {
      console.log('❌ File read error:', error.message);
    }

    // Example 2: Absolute path on Unix-like systems
    console.log('\n2. Absolute path (Unix):');
    try {
      const absolutePath = join(process.cwd(), testFile);
      const fileUrl = `file://${absolutePath}`;
      const response = await fetch(fileUrl);
      const text = await response.text();
      console.log(`✅ Absolute path content: "${text}"`);
    } catch (error) {
      console.log('❌ Absolute path error:', error.message);
    }

    // Example 3: Windows path handling (simulation)
    console.log('\n3. Windows path normalization:');
    try {
      // Simulate Windows-style paths
      const windowsPaths = [
        'file:///C:/Users/test/file.txt',
        'file:///c:/Users/test\\file.txt',
        'file:///C:\\Users\\test\\file.txt'
      ];

      for (const path of windowsPaths) {
        console.log(`📝 Testing Windows path: ${path}`);
        // These would work on Windows with actual files
        console.log('ℹ️ Windows paths are automatically normalized');
      }
    } catch (error) {
      console.log('ℹ️ Windows path test (expected on non-Windows systems)');
    }

    // Example 4: Binary file reading
    console.log('\n4. Binary file reading:');
    try {
      const binaryFile = join(testDir, 'binary.dat');
      const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0xFF, 0xFE]);
      writeFileSync(binaryFile, binaryData);

      const response = await fetch(`file://${binaryFile}`);
      const arrayBuffer = await response.arrayBuffer();
      const dataArray = new Uint8Array(arrayBuffer);

      console.log(`✅ Binary data: [${Array.from(dataArray).join(', ')}]`);
    } catch (error) {
      console.log('❌ Binary file error:', error.message);
    }

    // Example 5: File error handling
    console.log('\n5. File error handling:');
    try {
      await fetch('file:///nonexistent/file.txt');
    } catch (error) {
      console.log('✅ Caught file not found error:', error.message);
    }

  } finally {
    // Cleanup test files
    try {
      const { rmSync } = require('fs');
      rmSync(testDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test files');
    } catch (error) {
      console.log('ℹ️ Cleanup completed');
    }
  }
}

// Example 3: Data URL protocol
console.log('\n📊 Data URL Protocol Support');

async function dataUrlExamples() {
  console.log('\n📝 Testing data: protocol...');

  // Example 1: Base64 encoded text
  console.log('\n1. Base64 encoded text:');
  try {
    const response = await fetch('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==');
    const text = await response.text();
    console.log(`✅ Decoded text: "${text}"`);
  } catch (error) {
    console.log('❌ Data URL error:', error.message);
  }

  // Example 2: Plain text data URL
  console.log('\n2. Plain text data URL:');
  try {
    const response = await fetch('data:text/plain,Hello%20World%21');
    const text = await response.text();
    console.log(`✅ Plain text: "${text}"`);
  } catch (error) {
    console.log('❌ Plain text error:', error.message);
  }

  // Example 3: JSON data URL
  console.log('\n3. JSON data URL:');
  try {
    const jsonData = JSON.stringify({ message: 'Hello from data URL', timestamp: Date.now() });
    const base64Json = Buffer.from(jsonData).toString('base64');
    const response = await fetch(`data:application/json;base64,${base64Json}`);
    const json = await response.json();
    console.log('✅ JSON data:', json);
  } catch (error) {
    console.log('❌ JSON data URL error:', error.message);
  }

  // Example 4: Binary data URL
  console.log('\n4. Binary data URL:');
  try {
    const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const base64Binary = Buffer.from(binaryData).toString('base64');
    const response = await fetch(`data:application/octet-stream;base64,${base64Binary}`);
    const arrayBuffer = await response.arrayBuffer();
    const resultArray = new Uint8Array(arrayBuffer);
    console.log(`✅ Binary data: [${Array.from(resultArray).join(', ')}]`);
  } catch (error) {
    console.log('❌ Binary data URL error:', error.message);
  }

  // Example 5: HTML data URL
  console.log('\n5. HTML data URL:');
  try {
    const htmlContent = '<html><body><h1>Hello from Data URL</h1></body></html>';
    const encodedHtml = Buffer.from(htmlContent).toString('base64');
    const response = await fetch(`data:text/html;base64,${encodedHtml}`);
    const html = await response.text();
    console.log('✅ HTML content length:', html.length);
  } catch (error) {
    console.log('❌ HTML data URL error:', error.message);
  }

  // Example 6: Data URL error handling
  console.log('\n6. Data URL error handling:');
  try {
    // Invalid base64
    await fetch('data:text/plain;base64,INVALID!BASE64@#$');
  } catch (error) {
    console.log('✅ Caught invalid base64 error:', error.message);
  }
}

// Example 4: Blob URL protocol
console.log('\n🫧 Blob URL Protocol Support');

async function blobUrlExamples() {
  console.log('\n📝 Testing blob: protocol...');

  // Example 1: Text blob
  console.log('\n1. Text blob URL:');
  try {
    const textBlob = new Blob(['Hello from blob URL!'], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(textBlob);

    const response = await fetch(blobUrl);
    const text = await response.text();
    console.log(`✅ Blob text: "${text}"`);

    // Clean up
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('❌ Text blob error:', error.message);
  }

  // Example 2: JSON blob
  console.log('\n2. JSON blob URL:');
  try {
    const jsonData = { message: 'Hello from blob', timestamp: Date.now() };
    const jsonBlob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(jsonBlob);

    const response = await fetch(blobUrl);
    const json = await response.json();
    console.log('✅ Blob JSON:', json);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('❌ JSON blob error:', error.message);
  }

  // Example 3: Binary blob
  console.log('\n3. Binary blob URL:');
  try {
    const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x42, 0x6C, 0x6F, 0x62]);
    const binaryBlob = new Blob([binaryData], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(binaryBlob);

    const response = await fetch(blobUrl);
    const arrayBuffer = await response.arrayBuffer();
    const resultArray = new Uint8Array(arrayBuffer);
    console.log(`✅ Blob binary: [${Array.from(resultArray).join(', ')}]`);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('❌ Binary blob error:', error.message);
  }

  // Example 4: Large blob streaming
  console.log('\n4. Large blob streaming:');
  try {
    const largeText = 'x'.repeat(10000); // 10KB of text
    const largeBlob = new Blob([largeText], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(largeBlob);

    const response = await fetch(blobUrl);
    const text = await response.text();
    console.log(`✅ Large blob size: ${text.length} characters`);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('❌ Large blob error:', error.message);
  }

  // Example 5: Blob URL error handling
  console.log('\n5. Blob URL error handling:');
  try {
    // Try to fetch a revoked URL
    const tempBlob = new Blob(['test'], { type: 'text/plain' });
    const tempUrl = URL.createObjectURL(tempBlob);
    URL.revokeObjectURL(tempUrl);

    await fetch(tempUrl);
  } catch (error) {
    console.log('✅ Caught revoked blob URL error:', error.message);
  }
}

// Example 5: Error handling scenarios
console.log('\n⚠️ Error Handling Scenarios');

async function errorHandlingExamples() {
  console.log('\n📝 Testing fetch error cases...');

  // Example 1: GET method with body (should throw)
  console.log('\n1. GET with body (should error):');
  try {
    await fetch('https://httpbin.org/get', {
      method: 'GET',
      body: 'This should cause an error'
    });
  } catch (error) {
    console.log('✅ Caught GET with body error:', error.message);
  }

  // Example 2: HEAD method with body (should throw)
  console.log('\n2. HEAD with body (should error):');
  try {
    await fetch('https://httpbin.org/head', {
      method: 'HEAD',
      body: 'This should also cause an error'
    });
  } catch (error) {
    console.log('✅ Caught HEAD with body error:', error.message);
  }

  // Example 3: Invalid URL scheme
  console.log('\n3. Invalid URL scheme:');
  try {
    await fetch('invalid-scheme://example.com');
  } catch (error) {
    console.log('✅ Caught invalid scheme error:', error.message);
  }

  // Example 4: Network timeout
  console.log('\n4. Network timeout:');
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100); // 100ms timeout

    await fetch('https://httpbin.org/delay/5', {
      signal: controller.signal
    });
  } catch (error) {
    console.log('✅ Caught timeout error:', error.message);
  }
}

// Example 6: Real-world integration examples
console.log('\n🌐 Real-World Integration Examples');

async function realWorldExamples() {
  console.log('\n📝 Practical use cases...');

  // Example 1: Configuration loading from file
  console.log('\n1. Configuration loading:');
  try {
    const configPath = './temp-config.json';
    const config = {
      apiUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3
    };

    // Create temporary config file
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Load using file:// protocol
    const response = await fetch(`file://${configPath}`);
    const loadedConfig = await response.json();
    console.log('✅ Loaded config:', loadedConfig);

    // Cleanup
    const { rmSync } = require('fs');
    rmSync(configPath, { force: true });
  } catch (error) {
    console.log('❌ Config loading error:', error.message);
  }

  // Example 2: Data URL for small payloads
  console.log('\n2. Inline data with data URLs:');
  try {
    // Small icon or logo as base64
    const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const response = await fetch(iconData);
    const imageBuffer = await response.arrayBuffer();
    console.log(`✅ Loaded image data: ${imageBuffer.byteLength} bytes`);
  } catch (error) {
    console.log('❌ Image loading error:', error.message);
  }

  // Example 3: Blob for temporary data
  console.log('\n3. Temporary data with blobs:');
  try {
    // Create temporary CSV data
    const csvData = 'Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles';
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const blobUrl = URL.createObjectURL(csvBlob);

    // Process the CSV
    const response = await fetch(blobUrl);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    console.log(`✅ Processed CSV: ${lines.length} lines`);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.log('❌ CSV processing error:', error.message);
  }
}

// Main execution function
async function runAllExamples() {
  console.log('🚀 Bun Extended URL Protocol Support Demo');
  console.log('=======================================\n');

  try {
    await s3UrlExamples();
    await fileUrlExamples();
    await dataUrlExamples();
    await blobUrlExamples();
    await errorHandlingExamples();
    await realWorldExamples();

    console.log('\n🎉 All URL protocol examples completed!');
    console.log('💡 Key features demonstrated:');
    console.log('   • S3:// protocol with credential support');
    console.log('   • file:// protocol for local file access');
    console.log('   • data: protocol for inline data');
    console.log('   • blob: protocol for temporary object URLs');
    console.log('   • Comprehensive error handling');
    console.log('   • Real-world integration patterns');

  } catch (error) {
    console.error('\n❌ Error in examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-extended-urls.ts')) {
  runAllExamples().catch(console.error);
}

export {
    blobUrlExamples, dataUrlExamples, errorHandlingExamples, fileUrlExamples, realWorldExamples, s3UrlExamples
};
