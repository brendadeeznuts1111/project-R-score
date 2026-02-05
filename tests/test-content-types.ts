// tests/test-content-types.ts
import { CONTENT_TYPES } from '../config/content-types.ts';
import { BUN_DOCS } from '../config/urls.ts';

// Test different content-type scenarios
async function testContentTypes() {
  console.log('🧪 Testing Content-Type handling in Bun fetch...\n');
  
  // Test 1: JSON with explicit content-type
  console.log('1. Testing JSON content-type:');
  const jsonResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPES.JSON
    },
    body: JSON.stringify({ message: 'Hello JSON', number: 42 })
  });
  console.log(`   Status: ${jsonResponse.status}`);
  const jsonData = await jsonResponse.json();
  console.log(`   Content-Type: ${jsonData.received.contentType}`);
  console.log(`   Body:`, jsonData.received.body);
  
  // Test 2: Form URL encoded
  console.log('\n2. Testing Form URL encoded:');
  const formResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPES.FORM_URLENCODED
    },
    body: 'name=John&age=30&city=NYC'
  });
  const formData = await formResponse.json();
  console.log(`   Status: ${formResponse.status}`);
  console.log(`   Content-Type: ${formData.received.contentType}`);
  console.log(`   Body:`, formData.received.body);
  
  // Test 3: Typed Array (binary data)
  console.log('\n3. Testing Typed Array (Uint8Array):');
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
  console.log(`   Status: ${binaryResponse.status}`);
  console.log(`   Content-Type: ${binaryData.contentType}`);
  
  // Test 4: Auto-detect (no content-type header)
  console.log('\n4. Testing Auto-detect (no Content-Type header):');
  const autoResponse = await fetch('http://localhost:3001/api/content-type/auto-detect', {
    method: 'POST',
    body: JSON.stringify({ auto: 'detect' })
    // No Content-Type header - Bun should handle it
  });
  const autoData = await autoResponse.json();
  console.log(`   Status: ${autoResponse.status}`);
  console.log(`   Provided: ${autoData.request.providedContentType}`);
  console.log(`   Auto-detected: ${autoData.request.autoDetectedContentType}`);
  
  // Test 5: Blob with type
  console.log('\n5. Testing Blob with type:');
  const blob = new Blob(['Hello from Blob'], { type: 'text/plain' });
  const blobResponse = await fetch('http://localhost:3001/api/content-type/test', {
    method: 'POST',
    body: blob
    // Content-Type should be auto-set to 'text/plain'
  });
  const blobData = await blobResponse.json();
  console.log(`   Status: ${blobResponse.status}`);
  console.log(`   Content-Type: ${blobData.received.contentType}`);
  
  // Test 6: Fetch actual Bun documentation
  console.log('\n6. Fetching Bun documentation:');
  const docsResponse = await fetch(`${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`);
  console.log(`   Status: ${docsResponse.status}`);
  console.log(`   Content-Type: ${docsResponse.headers.get('content-type')}`);
  console.log(`   Content-Length: ${docsResponse.headers.get('content-length')} bytes`);
  
  console.log('\n✅ All Content-Type tests completed!');
}

// Run tests
if (import.meta.main) {
  testContentTypes().catch(console.error);
}

export default testContentTypes;
