#!/usr/bin/env bun

/**
 * Bun Fetch API - Enhanced Features
 *
 * Demonstrates Bun's automatic Content-Type handling and verbose debugging
 * capabilities that go beyond the standard Web fetch API.
 */

// Example 1: Automatic Content-Type for different body types
console.info('🔄 Automatic Content-Type Handling');

async function automaticContentTypeDemo() {
  console.info('\n📝 Testing different body types...');

  // Test 1: String body (defaults to text/plain)
  console.info('\n1. String body:');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: 'Hello, World!',
      verbose: true
    });
    console.info('✅ String request completed');
  } catch (error) {
    console.info('❌ String request failed:', error.message);
  }

  // Test 2: JSON object (automatically sets application/json)
  console.info('\n2. JSON object:');
  try {
    const jsonData = { message: 'Hello', timestamp: Date.now() };
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: JSON.stringify(jsonData),
      verbose: true
    });
    console.info('✅ JSON request completed');
  } catch (error) {
    console.info('❌ JSON request failed:', error.message);
  }

  // Test 3: Blob object (uses blob's type)
  console.info('\n3. Blob object:');
  try {
    const blob = new Blob(['<xml><data>Hello</data></xml>'], {
      type: 'application/xml'
    });
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: blob,
      verbose: true
    });
    console.info('✅ Blob request completed');
  } catch (error) {
    console.info('❌ Blob request failed:', error.message);
  }

  // Test 4: FormData (sets multipart boundary)
  console.info('\n4. FormData:');
  try {
    const formData = new FormData();
    formData.append('username', 'john_doe');
    formData.append('file', new Blob(['file content'], { type: 'text/plain' }), 'test.txt');
    formData.append('metadata', JSON.stringify({ id: 123 }));

    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData,
      verbose: true
    });
    console.info('✅ FormData request completed');
  } catch (error) {
    console.info('❌ FormData request failed:', error.message);
  }

  // Test 5: ArrayBuffer (defaults to application/octet-stream)
  console.info('\n5. ArrayBuffer:');
  try {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 0x12345678);
    view.setUint32(4, 0x87654321);

    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: buffer,
      verbose: true
    });
    console.info('✅ ArrayBuffer request completed');
  } catch (error) {
    console.info('❌ ArrayBuffer request failed:', error.message);
  }
}

// Example 2: Explicit Content-Type override
console.info('\n🎛️ Explicit Content-Type Override');

async function explicitContentTypeDemo() {
  console.info('\n📝 Overriding automatic Content-Type...');

  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/custom-type'
      },
      body: '{"message": "This has custom content-type"}',
      verbose: true
    });
    console.info('✅ Custom Content-Type request completed');
  } catch (error) {
    console.info('❌ Custom Content-Type request failed:', error.message);
  }
}

// Example 3: Verbose debugging for different scenarios
console.info('\n🐛 Verbose Debugging Scenarios');

async function verboseDebuggingDemo() {
  // Test 1: GET request with headers
  console.info('\n1. GET request with custom headers:');
  try {
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      headers: {
        'User-Agent': 'Bun-Demo/1.0',
        'Accept': 'application/json',
        'X-Custom-Header': 'debug-value'
      },
      verbose: true
    });
    console.info('✅ GET request completed');
  } catch (error) {
    console.info('❌ GET request failed:', error.message);
  }

  // Test 2: PUT request with JSON body
  console.info('\n2. PUT request with JSON:');
  try {
    const response = await fetch('https://httpbin.org/put', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer token123',
        'X-Request-ID': 'req-' + Math.random().toString(36).substr(2, 9)
      },
      body: JSON.stringify({
        operation: 'update',
        data: { field: 'value' }
      }),
      verbose: true
    });
    console.info('✅ PUT request completed');
  } catch (error) {
    console.info('❌ PUT request failed:', error.message);
  }

  // Test 3: DELETE request
  console.info('\n3. DELETE request:');
  try {
    const response = await fetch('https://httpbin.org/delete', {
      method: 'DELETE',
      verbose: true
    });
    console.info('✅ DELETE request completed');
  } catch (error) {
    console.info('❌ DELETE request failed:', error.message);
  }
}

// Example 4: Real-world API integration with verbose debugging
console.info('\n🌐 Real-World API Integration');

async function realWorldApiDemo() {
  console.info('\n📝 Simulating real API calls with debugging...');

  // Simulate a file upload with progress tracking
  console.info('\n1. File upload simulation:');
  try {
    const fileContent = 'This is a test file content for upload.';
    const fileBlob = new Blob([fileContent], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', fileBlob, 'test-file.txt');
    formData.append('description', 'Test file upload');
    formData.append('category', 'documents');

    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer upload-token-123',
        'X-Upload-Source': 'bun-demo'
      },
      body: formData,
      verbose: true
    });
    console.info('✅ File upload simulation completed');
  } catch (error) {
    console.info('❌ File upload failed:', error.message);
  }

  // Simulate API data synchronization
  console.info('\n2. Data synchronization:');
  try {
    const syncData = {
      timestamp: new Date().toISOString(),
      events: [
        { type: 'login', userId: 123 },
        { type: 'action', data: 'clicked_button' },
        { type: 'logout', userId: 123 }
      ],
      metadata: {
        version: '1.0',
        source: 'bun-demo-app'
      }
    };

    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Token': 'sync-token-abc123',
        'X-Client-Version': '2.1.0'
      },
      body: JSON.stringify(syncData),
      verbose: true
    });
    console.info('✅ Data synchronization completed');
  } catch (error) {
    console.info('❌ Data synchronization failed:', error.message);
  }
}

// Example 5: Error handling with verbose debugging
console.info('\n⚠️ Error Handling with Debugging');

async function errorHandlingDemo() {
  console.info('\n📝 Testing error scenarios with verbose output...');

  // Test 1: Invalid URL
  console.info('\n1. Invalid URL:');
  try {
    const response = await fetch('invalid-url', {
      verbose: true
    });
  } catch (error) {
    console.info('✅ Caught invalid URL error:', error.message);
  }

  // Test 2: Network timeout simulation
  console.info('\n2. Network timeout:');
  try {
    const response = await fetch('https://httpbin.org/delay/5', {
      signal: AbortSignal.timeout(1000), // 1 second timeout
      verbose: true
    });
  } catch (error) {
    console.info('✅ Caught timeout error:', error.message);
  }

  // Test 3: 404 Not Found
  console.info('\n3. 404 Not Found:');
  try {
    const response = await fetch('https://httpbin.org/status/404', {
      verbose: true
    });
    console.info('✅ Received 404 response as expected');
  } catch (error) {
    console.info('❌ Unexpected error:', error.message);
  }
}

// Example 6: Performance comparison with verbose debugging
console.info('\n⚡ Performance Analysis');

async function performanceDemo() {
  console.info('\n📝 Comparing request performance...');

  const testUrl = 'https://httpbin.org/get';
  const iterations = 5;

  console.info(`\n🔄 Running ${iterations} requests with verbose debugging...`);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    try {
      const response = await fetch(testUrl, {
        headers: {
          'X-Request-Number': (i + 1).toString(),
          'X-Test-ID': 'performance-demo'
        },
        verbose: true
      });
      console.info(`✅ Request ${i + 1}/${iterations} completed`);
    } catch (error) {
      console.info(`❌ Request ${i + 1} failed:`, error.message);
    }
  }

  const totalTime = performance.now() - startTime;
  const averageTime = totalTime / iterations;

  console.info(`\n📊 Performance Results:`);
  console.info(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.info(`   Average per request: ${averageTime.toFixed(2)}ms`);
  console.info(`   Requests per second: ${(1000 / averageTime).toFixed(2)}`);
}

// Main execution function
async function runAllExamples() {
  console.info('🚀 Bun Fetch API - Enhanced Features Demo');
  console.info('==========================================\n');

  try {
    await automaticContentTypeDemo();
    await explicitContentTypeDemo();
    await verboseDebuggingDemo();
    await realWorldApiDemo();
    await errorHandlingDemo();
    await performanceDemo();

    console.info('\n🎉 All fetch examples completed!');
    console.info('💡 Key takeaways:');
    console.info('   • Bun automatically sets appropriate Content-Type headers');
    console.info('   • verbose: true provides detailed request/response debugging');
    console.info('   • Blob objects use their type property for Content-Type');
    console.info('   • FormData automatically gets multipart boundaries');
    console.info('   • Verbose mode is Bun-specific and not in Web standard');

  } catch (error) {
    console.error('\n❌ Error in examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-fetch-enhanced.ts')) {
  runAllExamples().catch(console.error);
}

export {
    automaticContentTypeDemo, errorHandlingDemo, explicitContentTypeDemo, performanceDemo, realWorldApiDemo, verboseDebuggingDemo
};
