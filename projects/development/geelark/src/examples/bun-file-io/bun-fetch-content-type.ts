#!/usr/bin/env bun

/**
 * Bun Fetch Content-Type Auto-Detection
 *
 * Focused examples demonstrating how Bun automatically sets Content-Type headers
 * for different body types when not explicitly provided.
 */

// Helper function for consistent fetch demonstration with error handling
async function demonstrateContentType(name: string, body: BodyInit, headers?: Record<string, string>) {
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers,
      body,
      verbose: true
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ ${name}`);
    return response;
  } catch (error) {
    console.log(`❌ ${name} failed`);
    if (process.env.DEBUG === '1') {
      console.log('Debug info:', error.message);
    }
  }
}

// Example 1: String body - defaults to text/plain
console.log('1. String Body (text/plain)');

async function stringBodyExample() {
  await demonstrateContentType(
    'String body sent with automatic Content-Type',
    'This is a plain text string'
  );
}

// Example 2: JSON object - needs explicit Content-Type
console.log('\n2. JSON Object (application/json)');

async function jsonObjectExample() {
  const jsonData = {
    message: 'Hello from Bun',
    timestamp: new Date().toISOString(),
    data: [1, 2, 3, 4, 5]
  };

  await demonstrateContentType(
    'JSON object sent with explicit Content-Type',
    JSON.stringify(jsonData),
    { 'Content-Type': 'application/json' }
  );
}

// Example 3: Blob object - uses blob's type
console.log('\n3. Blob Object (uses blob.type)');

async function blobObjectExample() {
  // Test different blob types
  const blobTypes = [
    { content: '<html><body>Blob HTML</body></html>', type: 'text/html' },
    { content: '{"blob": "json data"}', type: 'application/json' },
    { content: '<?xml version="1.0"?><data>XML</data>', type: 'application/xml' },
    { content: 'Binary data simulation', type: 'application/octet-stream' }
  ];

  for (const { content, type } of blobTypes) {
    console.log(`\n📝 Testing blob with type: ${type}`);
    const blob = new Blob([content], { type });
    
    await demonstrateContentType(
      `Blob sent with Content-Type: ${type}`,
      blob
    );
  }
}

// Example 4: FormData - automatic multipart boundary
console.log('\n4. FormData (multipart/form-data)');

async function formDataExample() {
  const formData = new FormData();

  // Add various types of data
  formData.append('username', 'john_doe');
  formData.append('email', 'john@example.com');
  formData.append('age', '30');

  // Add file as blob
  const fileBlob = new Blob(['File content here'], { type: 'text/plain' });
  formData.append('file', fileBlob, 'example.txt');

  // Add JSON data
  formData.append('metadata', JSON.stringify({
    userId: 123,
    sessionId: 'abc123'
  }));

  // Add another file with different type
  const jsonBlob = new Blob(['{"nested": "json"}'], { type: 'application/json' });
  formData.append('config', jsonBlob, 'config.json');

  await demonstrateContentType(
    'FormData sent with automatic multipart boundary',
    formData
  );
}

// Example 5: ArrayBuffer - defaults to application/octet-stream
console.log('\n5. ArrayBuffer (application/octet-stream)');

async function arrayBufferExample() {
  // Create different types of binary data
  const examples = [
    { name: 'Simple buffer', data: new ArrayBuffer(16) },
    { name: 'Typed array', data: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]) },
    { name: 'DataView', data: new DataView(new ArrayBuffer(8)) }
  ];

  for (const { name, data } of examples) {
    console.log(`\n📝 Testing ${name}`);

    // Initialize DataView with some data if needed
    if (data instanceof DataView) {
      data.setUint32(0, 0x12345678);
      data.setUint32(4, 0x87654321);
    }

    await demonstrateContentType(
      `${name} sent with Content-Type: application/octet-stream`,
      data
    );
  }
}

// Example 6: URLSearchParams - application/x-www-form-urlencoded
console.log('\n6. URLSearchParams (application/x-www-form-urlencoded)');

async function urlSearchParamsExample() {
  const params = new URLSearchParams({
    name: 'John Doe',
    email: 'john@example.com',
    age: '30',
    tags: 'developer,bun,typescript',
    timestamp: Date.now().toString()
  });

  await demonstrateContentType(
    'URLSearchParams sent with Content-Type: application/x-www-form-urlencoded',
    params
  );
}

// Example 7: ReadableStream - defaults to application/octet-stream
console.log('\n7. ReadableStream (application/octet-stream)');

async function readableStreamExample() {
  // Create a readable stream with proper error handling
  const stream = new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(new TextEncoder().encode('Stream data chunk 1\n'));
        controller.enqueue(new TextEncoder().encode('Stream data chunk 2\n'));
        controller.enqueue(new TextEncoder().encode('Stream data chunk 3\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  await demonstrateContentType(
    'ReadableStream sent with Content-Type: application/octet-stream',
    stream
  );
}

// Example 8: Content-Type override scenarios
console.log('\n8. Content-Type Override Scenarios');

async function contentTypeOverrideExample() {
  const scenarios = [
    {
      name: 'Override string Content-Type',
      body: 'This is actually JSON',
      contentType: 'application/json'
    },
    {
      name: 'Override blob Content-Type',
      body: new Blob(['{"forced": "json"}'], { type: 'text/plain' }),
      contentType: 'application/json'
    },
    {
      name: 'Custom Content-Type',
      body: 'Custom data format',
      contentType: 'application/custom-format'
    }
  ];

  for (const { name, body, contentType } of scenarios) {
    console.log(`\n📝 ${name}`);

    await demonstrateContentType(
      `Override successful - Content-Type: ${contentType}`,
      body,
      { 'Content-Type': contentType }
    );
  }
}

// Main execution function
async function runContentTypeExamples() {
  console.log('🚀 Bun Fetch Content-Type Auto-Detection Demo');
  console.log('============================================\n');

  try {
    // Run examples concurrently for better performance
    await Promise.all([
      stringBodyExample(),
      jsonObjectExample(),
      blobObjectExample(),
      formDataExample(),
      arrayBufferExample(),
      urlSearchParamsExample(),
      readableStreamExample(),
      contentTypeOverrideExample()
    ]);

    console.log('\n🎉 All Content-Type examples completed!');
    console.log('💡 Key insights:');
    console.log('   • String bodies default to text/plain');
    console.log('   • Blob objects use their type property');
    console.log('   • FormData gets automatic multipart boundaries');
    console.log('   • ArrayBuffer/TypedArray defaults to application/octet-stream');
    console.log('   • URLSearchParams uses application/x-www-form-urlencoded');
    console.log('   • Explicit Content-Type always overrides automatic detection');

  } catch (error) {
    console.error('\n❌ Error in examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-fetch-content-type.ts')) {
  runContentTypeExamples().catch(console.error);
}

export {
    arrayBufferExample, blobObjectExample, contentTypeOverrideExample, formDataExample, jsonObjectExample, readableStreamExample, stringBodyExample, urlSearchParamsExample, demonstrateContentType
};
