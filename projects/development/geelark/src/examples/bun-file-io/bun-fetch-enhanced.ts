#!/usr/bin/env bun

/**
 * Bun Fetch API - Enhanced Features
 *
 * Demonstrates Bun's automatic Content-Type handling and verbose debugging
 * capabilities that go beyond the standard Web fetch API.
 */

// Example 1: Automatic Content-Type for different body types
console.log('🔄 Automatic Content-Type Handling');

async function automaticContentTypeDemo() {
  console.log('\n📝 Testing different body types...');

  // Test 1: String body (defaults to text/plain)
  console.log('\n1. String body:');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: 'Hello, World!',
      verbose: true
    });
    console.log('✅ String request completed');
  } catch (error) {
    console.log('❌ String request failed:', error.message);
  }

  // Test 2: JSON object (automatically sets application/json)
  console.log('\n2. JSON object:');
  try {
    const jsonData = { message: 'Hello', timestamp: Date.now() };
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: JSON.stringify(jsonData),
      verbose: true
    });
    console.log('✅ JSON request completed');
  } catch (error) {
    console.log('❌ JSON request failed:', error.message);
  }

  // Test 3: Blob object (uses blob's type)
  console.log('\n3. Blob object:');
  try {
    const blob = new Blob(['<xml><data>Hello</data></xml>'], {
      type: 'application/xml'
    });
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: blob,
      verbose: true
    });
    console.log('✅ Blob request completed');
  } catch (error) {
    console.log('❌ Blob request failed:', error.message);
  }

  // Test 4: FormData (sets multipart boundary)
  console.log('\n4. FormData:');
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
    console.log('✅ FormData request completed');
  } catch (error) {
    console.log('❌ FormData request failed:', error.message);
  }

  // Test 5: ArrayBuffer (defaults to application/octet-stream)
  console.log('\n5. ArrayBuffer:');
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
    console.log('✅ ArrayBuffer request completed');
  } catch (error) {
    console.log('❌ ArrayBuffer request failed:', error.message);
  }
}

// Example 2: Explicit Content-Type override
console.log('\n🎛️ Explicit Content-Type Override');

async function explicitContentTypeDemo() {
  console.log('\n📝 Overriding automatic Content-Type...');

  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/custom-type'
      },
      body: '{"message": "This has custom content-type"}',
      verbose: true
    });
    console.log('✅ Custom Content-Type request completed');
  } catch (error) {
    console.log('❌ Custom Content-Type request failed:', error.message);
  }
}

// Example 3: Verbose debugging for different scenarios
console.log('\n🐛 Verbose Debugging Scenarios');

async function verboseDebuggingDemo() {
  // Test 1: GET request with headers
  console.log('\n1. GET request with custom headers:');
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
    console.log('✅ GET request completed');
  } catch (error) {
    console.log('❌ GET request failed:', error.message);
  }

  // Test 2: PUT request with JSON body
  console.log('\n2. PUT request with JSON:');
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
    console.log('✅ PUT request completed');
  } catch (error) {
    console.log('❌ PUT request failed:', error.message);
  }

  // Test 3: DELETE request
  console.log('\n3. DELETE request:');
  try {
    const response = await fetch('https://httpbin.org/delete', {
      method: 'DELETE',
      verbose: true
    });
    console.log('✅ DELETE request completed');
  } catch (error) {
    console.log('❌ DELETE request failed:', error.message);
  }
}

// Example 4: Real-world API integration with verbose debugging
console.log('\n🌐 Real-World API Integration');

async function realWorldApiDemo() {
  console.log('\n📝 Simulating real API calls with debugging...');

  // Simulate a file upload with progress tracking
  console.log('\n1. File upload simulation:');
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
    console.log('✅ File upload simulation completed');
  } catch (error) {
    console.log('❌ File upload failed:', error.message);
  }

  // Simulate API data synchronization
  console.log('\n2. Data synchronization:');
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
    console.log('✅ Data synchronization completed');
  } catch (error) {
    console.log('❌ Data synchronization failed:', error.message);
  }
}

// Example 5: Error handling with verbose debugging
console.log('\n⚠️ Error Handling with Debugging');

async function errorHandlingDemo() {
  console.log('\n📝 Testing error scenarios with verbose output...');

  // Test 1: Invalid URL
  console.log('\n1. Invalid URL:');
  try {
    const response = await fetch('invalid-url', {
      verbose: true
    });
  } catch (error) {
    console.log('✅ Caught invalid URL error:', error.message);
  }

  // Test 2: Network timeout simulation
  console.log('\n2. Network timeout:');
  try {
    const response = await fetch('https://httpbin.org/delay/5', {
      signal: AbortSignal.timeout(1000), // 1 second timeout
      verbose: true
    });
  } catch (error) {
    console.log('✅ Caught timeout error:', error.message);
  }

  // Test 3: 404 Not Found
  console.log('\n3. 404 Not Found:');
  try {
    const response = await fetch('https://httpbin.org/status/404', {
      verbose: true
    });
    console.log('✅ Received 404 response as expected');
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Example 6: Performance comparison with verbose debugging
console.log('\n⚡ Performance Analysis');

async function performanceDemo() {
  console.log('\n📝 Comparing request performance...');

  const testUrl = 'https://httpbin.org/get';
  const iterations = 5;

  console.log(`\n🔄 Running ${iterations} requests with verbose debugging...`);

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
      console.log(`✅ Request ${i + 1}/${iterations} completed`);
    } catch (error) {
      console.log(`❌ Request ${i + 1} failed:`, error.message);
    }
  }

  const totalTime = performance.now() - startTime;
  const averageTime = totalTime / iterations;

  console.log(`\n📊 Performance Results:`);
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average per request: ${averageTime.toFixed(2)}ms`);
  console.log(`   Requests per second: ${(1000 / averageTime).toFixed(2)}`);
}

// Main execution function
async function runAllExamples() {
  console.log('🚀 Bun Fetch API - Enhanced Features Demo');
  console.log('==========================================\n');

  try {
    await automaticContentTypeDemo();
    await explicitContentTypeDemo();
    await verboseDebuggingDemo();
    await realWorldApiDemo();
    await errorHandlingDemo();
    await performanceDemo();

    console.log('\n🎉 All fetch examples completed!');
    console.log('💡 Key takeaways:');
    console.log('   • Bun automatically sets appropriate Content-Type headers');
    console.log('   • verbose: true provides detailed request/response debugging');
    console.log('   • Blob objects use their type property for Content-Type');
    console.log('   • FormData automatically gets multipart boundaries');
    console.log('   • Verbose mode is Bun-specific and not in Web standard');

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
