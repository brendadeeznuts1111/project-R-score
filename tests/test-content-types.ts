// tests/test-content-types.ts
import { CONTENT_TYPES } from '../config/content-types.ts';
import { BUN_DOCS } from '../config/urls.ts';

// Test different content-type scenarios
async function testContentTypes() {
  console.info('🧪 Testing Content-Type handling in Bun fetch...\n');
  
  // Test 1: JSON with explicit content-type
  console.info('1. Testing JSON content-type:');
  const jsonResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPES.JSON
    },
    body: JSON.stringify({ message: 'Hello JSON', number: 42 })
  });
  console.info(`   Status: ${jsonResponse.status}`);
  const jsonData = await jsonResponse.json();
  console.info(`   Content-Type: ${jsonData.received.contentType}`);
  console.info(`   Body:`, jsonData.received.body);
  
  // Test 2: Form URL encoded
  console.info('\n2. Testing Form URL encoded:');
  const formResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPES.FORM_URLENCODED
    },
    body: 'name=John&age=30&city=NYC'
  });
  const formData = await formResponse.json();
  console.info(`   Status: ${formResponse.status}`);
  console.info(`   Content-Type: ${formData.received.contentType}`);
  console.info(`   Body:`, formData.received.body);
  
  // Test 3: Typed Array (binary data)
  console.info('\n3. Testing Typed Array (Uint8Array):');
  const typedArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const binaryResponse = await fetch('http://localhost:3001/api/typedarray/binary', {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPES.BINARY.UINT8_ARRAY,
      'Accept': 'application/json'
    },
    body: typedArray
  });
  const binaryData = await binaryResponse.json();
  console.info(`   Status: ${binaryResponse.status}`);
  console.info(`   Content-Type: ${binaryData.contentType}`);
  
  // Test 4: Auto-detect (no content-type header)
  console.info('\n4. Testing Auto-detect (no Content-Type header):');
  const autoResponse = await fetch('http://localhost:3001/api/content-type/auto-detect', {
    method: 'POST',
    body: JSON.stringify({ auto: 'detect' })
    // No Content-Type header - Bun should handle it
  });
  const autoData = await autoResponse.json();
  console.info(`   Status: ${autoResponse.status}`);
  console.info(`   Provided: ${autoData.request.providedContentType}`);
  console.info(`   Auto-detected: ${autoData.request.autoDetectedContentType}`);
  
  // Test 5: Blob with type
  console.info('\n5. Testing Blob with type:');
  const blob = new Blob(['Hello from Blob'], { type: 'text/plain' });
  const blobResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    body: blob
    // Content-Type should be auto-set to 'text/plain'
  });
  const blobData = await blobResponse.json();
  console.info(`   Status: ${blobResponse.status}`);
  console.info(`   Content-Type: ${blobData.received.contentType}`);
  
  // Test 6: Fetch actual Bun documentation
  console.info('\n6. Fetching Bun documentation:');
  const docsResponse = await fetch(`${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`);
  console.info(`   Status: ${docsResponse.status}`);
  console.info(`   Content-Type: ${docsResponse.headers.get('content-type')}`);
  console.info(`   Content-Length: ${docsResponse.headers.get('content-length')} bytes`);
  
  console.info('\n✅ All Content-Type tests completed!');
}

// Run tests
if (import.meta.main) {
  testContentTypes().catch(console.error);
}

export default testContentTypes;
