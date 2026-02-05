#!/usr/bin/env bun

// Comprehensive Bun Fetch Debugging Demo
// Shows the full richness of verbose fetch output including all headers

console.log('🔍 Comprehensive Bun Verbose Fetch Debugging');
console.log('==============================================\n');

// Enable verbose fetch logging to show complete request/response headers
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

console.log('✅ BUN_CONFIG_VERBOSE_FETCH = "curl"');
console.log('📡 Showing complete request/response headers including ETags, Cache-Control, Server info, etc.\n');

// Test different types of requests to show various header combinations
async function demonstrateComprehensiveFetchDebugging() {
  console.log('--- 1. Example.com (Basic HTTP/1.1 with ETags) ---');
  try {
    const response = await fetch('https://example.com');
    console.log('✅ Basic request completed');
  } catch (error) {
    console.log('❌ Basic request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 2. HTTPBin.org (JSON API with CORS headers) ---');
  try {
    const response = await fetch('https://httpbin.org/json', {
      headers: {
        'Accept': 'application/json',
        'X-Custom-Header': 'debug-demo',
        'User-Agent': 'Bun-Comprehensive-Demo/1.0'
      }
    });
    console.log('✅ JSON API request completed');
  } catch (error) {
    console.log('❌ JSON API request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 3. GitHub API (Authentication, Rate Limiting, ETags) ---');
  try {
    const response = await fetch('https://api.github.com/users/bun-sh', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Bun-Demo-App',
        'If-None-Match': 'W/"some-etag-value"'  // Test conditional request
      }
    });
    console.log('✅ GitHub API request completed');
  } catch (error) {
    console.log('❌ GitHub API request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 4. POST with JSON body (Content-Length, Content-Type) ---');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token-12345',
        'X-Request-ID': 'req-' + Date.now(),
        'X-Client-Version': '1.0.0'
      },
      body: JSON.stringify({
        message: 'Comprehensive debug demo',
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'bun-debug-demo',
          version: '1.0.0',
          environment: 'development'
        }
      })
    });
    console.log('✅ POST with JSON completed');
  } catch (error: any) {
    console.log('❌ POST with JSON failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 5. PUT with conditional headers (If-Match, If-Modified-Since) ---');
  try {
    const response: Response = await fetch('https://httpbin.org/put', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"some-entity-tag"',
        'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
        'X-Update-Reason': 'conditional-update-demo'
      },
      body: JSON.stringify({
        action: 'update',
        condition: 'conditional-request-demo',
        timestamp: Date.now()
      })
    });
    console.log('✅ Conditional PUT completed');
  } catch (error) {
    console.log('❌ Conditional PUT failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 6. DELETE with authentication and custom headers ---');
  try {
    const response = await fetch('https://httpbin.org/delete', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer delete-token-67890',
        'X-Delete-Reason': 'cleanup-demo',
        'X-Request-Source': 'bun-debug-tool',
        'X-Correlation-ID': 'corr-' + Math.random().toString(36).substr(2, 9)
      }
    });
    console.log('✅ DELETE request completed');
  } catch (error) {
    console.log('❌ DELETE request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 7. PATCH with partial update and optimistic locking ---');
  try {
    const response = await fetch('https://httpbin.org/patch', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
        'If-Match': '"version-123"',
        'X-Patch-Type': 'json-patch',
        'X-Update-Strategy': 'optimistic-locking'
      },
      body: JSON.stringify([
        { op: 'replace', path: '/status', value: 'updated' },
        { op: 'add', path: '/updatedAt', value: new Date().toISOString() }
      ])
    });
    console.log('✅ PATCH request completed');
  } catch (error) {
    console.log('❌ PATCH request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 8. HEAD request (headers only, no body) ---');
  try {
    const response = await fetch('https://httpbin.org/headers', {
      method: 'HEAD',
      headers: {
        'X-Request-Type': 'head-only',
        'X-Debug-Mode': 'headers-inspection'
      }
    });
    console.log('✅ HEAD request completed');
  } catch (error) {
    console.log('❌ HEAD request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 9. OPTIONS request (CORS preflight) ---');
  try {
    const response = await fetch('https://httpbin.org/options', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    console.log('✅ OPTIONS request completed');
  } catch (error) {
    console.log('❌ OPTIONS request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 10. File upload with multipart/form-data ---');
  try {
    const formData = new FormData();
    formData.append('file', new Blob(['Sample file content for upload demo'], { type: 'text/plain' }), 'sample.txt');
    formData.append('metadata', JSON.stringify({
      uploadedAt: new Date().toISOString(),
      source: 'bun-debug-demo',
      purpose: 'header-demonstration'
    }));
    formData.append('description', 'Demonstrating multipart upload headers');
    
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Upload-Type': 'multipart-form-data',
        'X-File-Purpose': 'debug-demonstration'
      }
    });
    console.log('✅ File upload completed');
  } catch (error) {
    console.log('❌ File upload failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 11. Request with caching headers (Cache-Control, Pragma, ETag handling) ---');
  try {
    const response = await fetch('https://httpbin.org/cache', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'If-None-Match': '"some-cached-etag"',
        'If-Modified-Since': new Date(Date.now() - 3600000).toUTCString()
      }
    });
    console.log('✅ Cache control request completed');
  } catch (error) {
    console.log('❌ Cache control request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 12. Request with compression and encoding headers ---');
  try {
    const response = await fetch('https://httpbin.org/gzip', {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Charset': 'utf-8, iso-8859-1;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Encoding': 'identity'
      }
    });
    console.log('✅ Encoding request completed');
  } catch (error) {
    console.log('❌ Encoding request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n🎉 Comprehensive fetch debugging demonstration complete!');
  console.log('📝 Above you should see complete curl commands with ALL headers including:');
  console.log('   • Request headers: Content-Type, Authorization, Custom headers, etc.');
  console.log('   • Response headers: ETag, Cache-Control, Server, Content-Length, etc.');
  console.log('   • HTTP version info, status codes, timestamps');
  console.log('   • CORS headers, caching directives, compression info');
  console.log('🔧 Each curl command is fully copy-pasteable for replication!');
}

// Run the comprehensive demonstration
demonstrateComprehensiveFetchDebugging().catch(console.error);
