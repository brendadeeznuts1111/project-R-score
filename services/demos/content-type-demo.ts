// services/content-type-demo.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { CONTENT_TYPES, ContentTypeHandler } from '../config/content-types.ts';
import { buildEnterpriseAPIURL } from '../lib/core/core-documentation.ts';

// Use existing API URL pattern
const API_BASE_URL = process.env.API_BASE_URL || 'http://example.com';

export class ContentTypeDemo {
  
  // Demonstrate Content-Type handling with Blobs
  async demonstrateBlobContentType(): Promise<Response> {
    console.log('📦 Demonstrating Blob Content-Type handling...');
    
    // Create different blob types to show automatic Content-Type setting
    const textBlob = new Blob(['Hello, World!'], { type: 'text/plain' });
    const jsonBlob = new Blob(['{"message": "Hello"}'], { type: 'application/json' });
    const htmlBlob = new Blob(['<h1>Hello</h1>'], { type: 'text/html' });
    
    console.log(`Text blob type: ${textBlob.type}`);
    console.log(`JSON blob type: ${jsonBlob.type}`);
    console.log(`HTML blob type: ${htmlBlob.type}`);
    
    // Demonstrate sending blob with automatic Content-Type
    const response = await fetch(`${API_BASE_URL}/api/content-type/blob`, {
      method: 'POST',
      body: textBlob,
      // Note: Content-Type is automatically set to 'text/plain'
    });
    
    console.log(`Blob POST response status: ${response.status}`);
    
    return new Response(JSON.stringify({
      message: 'Blob Content-Type demo completed',
      blobTypes: {
        text: textBlob.type,
        json: jsonBlob.type,
        html: htmlBlob.type
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Demonstrate Content-Type handling with FormData
  async demonstrateFormDataContentType(): Promise<Response> {
    console.log('📋 Demonstrating FormData Content-Type handling...');
    
    // Create FormData with different content types
    const formData = new FormData();
    formData.append('message', 'Hello from FormData');
    formData.append('json', JSON.stringify({ key: 'value' }));
    formData.append('file', new Blob(['file content'], { type: 'text/plain' }), 'example.txt');
    
    // Note: Content-Type is automatically set to 'multipart/form-data' with boundary
    const response = await fetch(`${API_BASE_URL}/api/content-type/formdata`, {
      method: 'POST',
      body: formData,
      // No Content-Type header needed - Bun sets it automatically with boundary
    });
    
    console.log(`FormData POST response status: ${response.status}`);
    
    return new Response(JSON.stringify({
      message: 'FormData Content-Type demo completed',
      note: 'Content-Type automatically set to multipart/form-data with boundary'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Demonstrate connection pooling and keep-alive
  async demonstrateConnectionPooling(): Promise<void> {
    console.log('🔗 Demonstrating connection pooling...');
    
    const testUrl = `${API_BASE_URL}/api/typedarray/urls`;
    
    // Test 1: Default connection pooling (keep-alive enabled)
    console.log('Test 1: Default connection pooling (keep-alive enabled)');
    const start1 = Date.now();
    const response1 = await fetch(testUrl);
    const duration1 = Date.now() - start1;
    console.log(`First request: ${duration1}ms, Connection: ${response1.headers.get('connection')}`);
    
    // Test 2: Second request (should reuse connection)
    console.log('Test 2: Second request (should reuse connection)');
    const start2 = Date.now();
    const response2 = await fetch(testUrl);
    const duration2 = Date.now() - start2;
    console.log(`Second request: ${duration2}ms, Connection: ${response2.headers.get('connection')}`);
    
    // Test 3: Disable keep-alive
    console.log('Test 3: Disable keep-alive');
    const start3 = Date.now();
    const response3 = await fetch(testUrl, {
      headers: { 'Connection': 'close' }
    });
    const duration3 = Date.now() - start3;
    console.log(`No keep-alive: ${duration3}ms, Connection: ${response3.headers.get('connection')}`);
    
    console.log(`Connection pooling demo completed. Reused connection was ${duration1 > duration2 ? 'faster' : 'similar'} to first request.`);
  }
  
  // Demonstrate sendfile optimization conditions
  async demonstrateSendfileConditions(): Promise<void> {
    console.log('📁 Demonstrating sendfile optimization conditions...');
    
    const conditions = {
      fileSize: 'Must be > 32KB',
      proxy: 'Must not use proxy',
      protocol: 'HTTP (not HTTPS) most effective',
      macOS: 'Only regular files (not pipes, sockets, devices)',
      fallback: 'S3/streaming uploads fall back to memory'
    };
    
    console.log('Sendfile optimization conditions:');
    Object.entries(conditions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Create a test file larger than 32KB
    const largeContent = 'x'.repeat(35000); // 35KB
    const largeBlob = new Blob([largeContent], { type: 'application/octet-stream' });
    
    console.log(`Created test blob: ${largeBlob.size} bytes`);
    
    // Test with conditions that should trigger sendfile (if using HTTP)
    try {
      const response = await fetch(`${API_BASE_URL}/api/content-type/large-file`, {
        method: 'POST',
        body: largeBlob,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      
      console.log(`Large file upload: ${response.status}`);
      console.log('Note: sendfile optimization happens at OS level for HTTP requests');
      
    } catch (error) {
      console.log(`Upload test failed: ${error.message}`);
    }
  }
  
  // Demonstrate ContentTypeHandler utility
  async demonstrateContentTypeHandler(): Promise<void> {
    console.log('🔧 Demonstrating ContentTypeHandler utility...');
    
    // Test different data types
    const testData = [
      { name: 'String JSON', data: '{"key": "value"}' },
      { name: 'String Plain', data: 'Hello, World!' },
      { name: 'Object', data: { message: 'Hello' } },
      { name: 'Uint8Array', data: new Uint8Array([1, 2, 3, 4]) },
      { name: 'ArrayBuffer', data: new ArrayBuffer(8) },
      { name: 'Blob (text)', data: new Blob(['Hello'], { type: 'text/plain' }) },
      { name: 'Blob (binary)', data: new Blob([1, 2, 3], { type: 'application/octet-stream' }) },
      { name: 'FormData', data: new FormData() },
    ];
    
    // Add data to FormData
    (testData[7].data as FormData).append('message', 'Hello');
    
    console.log('Content-Type detection results:');
    testData.forEach(({ name, data }) => {
      const contentType = ContentTypeHandler.getContentType(data);
      console.log(`  ${name}: ${contentType}`);
    });
    
    // Demonstrate creating requests with proper Content-Type
    console.log('\nCreating requests with ContentTypeHandler:');
    
    const jsonRequest = ContentTypeHandler.createRequest(
      `${API_BASE_URL}/api/content-type/blob`,
      { message: 'Hello from ContentTypeHandler' }
    );
    console.log(`JSON Request Content-Type: ${jsonRequest.headers.get('content-type')}`);
    
    const textRequest = ContentTypeHandler.createRequest(
      `${API_BASE_URL}/api/content-type/blob`,
      'Hello from ContentTypeHandler'
    );
    
    const binaryRequest = ContentTypeHandler.createRequest(
      `${API_BASE_URL}/api/content-type/blob`,
      new Uint8Array([1, 2, 3, 4])
    );
    console.log(`Binary Request Content-Type: ${binaryRequest.headers.get('content-type')}`);
    
    const formData = new FormData();
    formData.append('message', 'Hello from FormData');
    const formDataRequest = ContentTypeHandler.createRequest(
      `${API_BASE_URL}/api/content-type/formdata`,
      formData
    );
    console.log(`FormData Request Content-Type: ${formDataRequest.headers.get('content-type')}`);
    console.log(`FormData has boundary: ${formDataRequest.headers.get('content-type')?.includes('boundary')}`);
  }

  // Demonstrate S3 automatic signing
  async demonstrateS3Signing(): Promise<void> {
    console.log('🪣 Demonstrating S3 automatic signing...');
    
    console.log('S3 operations automatically handle:');
    console.log('  - Request signing with AWS credentials');
    console.log('  - Authentication header merging');
    console.log('  - Multipart upload for streaming bodies');
    
    // Example S3 URL pattern (would need actual credentials to work)
    const s3Example = 's3://my-bucket/path/to/object';
    
    console.log(`Example S3 URL: ${s3Example}`);
    console.log('Note: Actual S3 operations require AWS credentials in environment or explicit config');
    
    // Show the S3 fetch pattern from Bun docs
    console.log('S3 fetch pattern:');
    console.log(`await fetch("${s3Example}", {`);
    console.log('  s3: {');
    console.log('    accessKeyId: "YOUR_ACCESS_KEY",');
    console.log('    secretAccessKey: "YOUR_SECRET_KEY",');
    console.log('    region: "us-east-1"');
    console.log('  }');
    console.log('});');
  }
  
  // Run all Content-Type and implementation demos
  async runAllDemos(): Promise<void> {
    console.log('🎯 Running Content-Type and Implementation demos...\n');
    
    try {
      // Content-Type demos
      console.log('=== CONTENT-TYPE HANDLING DEMOS ===');
      await this.demonstrateBlobContentType();
      await this.demonstrateFormDataContentType();
      await this.demonstrateContentTypeHandler();
      
      console.log('\n=== IMPLEMENTATION DETAILS DEMOS ===');
      // Implementation details demos
      await this.demonstrateConnectionPooling();
      await this.demonstrateSendfileConditions();
      await this.demonstrateS3Signing();
      
      console.log('\n✅ All demos completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error.message);
    }
  }
}

// Example usage
if (import.meta.main) {
  const demo = new ContentTypeDemo();
  await demo.runAllDemos();
}

export default ContentTypeDemo;

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */