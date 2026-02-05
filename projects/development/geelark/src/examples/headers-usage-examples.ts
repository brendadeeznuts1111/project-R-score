/**
 * Headers Usage Examples
 *
 * Practical examples demonstrating proper usage of the Headers API
 * matching Bun's specification
 */

import type { Headers, HeadersInit } from '../src/types/Headers';

// Example 1: Creating Headers with different initialization types
export function createHeadersExamples() {
  console.log('🏗️ Headers Creation Examples\n');

  // Empty Headers
  const emptyHeaders = new Headers() as Headers;
  console.log('Empty headers count:', emptyHeaders.count);

  // From Record<string, string>
  const recordHeaders = new Headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123',
    'User-Agent': 'MyApp/1.0'
  }) as Headers;
  console.log('Record headers count:', recordHeaders.count);

  // From string[][]
  const arrayHeaders = new Headers([
    ['Accept', 'application/json'],
    ['X-Custom-Header', 'custom-value'],
    ['Cache-Control', 'no-cache']
  ]) as Headers;
  console.log('Array headers count:', arrayHeaders.count);

  // From existing Headers
  const copiedHeaders = new Headers(recordHeaders) as Headers;
  console.log('Copied headers count:', copiedHeaders.count);

  return { emptyHeaders, recordHeaders, arrayHeaders, copiedHeaders };
}

// Example 2: Basic header operations
export function basicHeaderOperations() {
  console.log('\n🔧 Basic Header Operations\n');

  const headers = new Headers() as Headers;

  // Append headers (can have multiple values for Set-Cookie)
  headers.append('Content-Type', 'application/json');
  headers.append('X-Request-ID', 'req-123');
  console.log('After append - Count:', headers.count);

  // Set header (overwrites existing)
  headers.set('Content-Type', 'text/plain');
  console.log('Content-Type after set:', headers.get('Content-Type'));

  // Get header
  const contentType = headers.get('Content-Type');
  console.log('Retrieved Content-Type:', contentType);

  // Check if header exists
  const hasAuth = headers.has('Authorization');
  console.log('Has Authorization:', hasAuth);

  // Delete header
  headers.delete('X-Request-ID');
  console.log('After delete - Count:', headers.count);

  return headers;
}

// Example 3: Special Set-Cookie handling
export function setCookieHandling() {
  console.log('\n🍪 Set-Cookie Special Handling\n');

  const headers = new Headers() as Headers;

  // Add multiple Set-Cookie headers
  headers.append('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
  headers.append('Set-Cookie', 'theme=dark; Path=/; Max-Age=3600');
  headers.append('Set-Cookie', 'lang=en; Path=/; Secure');

  console.log('Total headers count:', headers.count);

  // Get all Set-Cookie headers
  const allCookies = headers.getAll('Set-Cookie');
  console.log('All Set-Cookie headers:');
  allCookies.forEach((cookie, index) => {
    console.log(`  ${index + 1}: ${cookie}`);
  });

  // Use convenience method
  const cookies = headers.getSetCookie();
  console.log('getSetCookie() result:');
  cookies.forEach((cookie, index) => {
    console.log(`  ${index + 1}: ${cookie}`);
  });

  return headers;
}

// Example 4: Headers iteration
export function headersIteration() {
  console.log('\n🔄 Headers Iteration Examples\n');

  const headers = new Headers([
    ['Content-Type', 'application/json'],
    ['Authorization', 'Bearer token'],
    ['X-Custom', 'custom-value'],
    ['Cache-Control', 'no-cache']
  ]) as Headers;

  // entries() iteration
  console.log('entries() iteration:');
  for (const [key, value] of Array.from(headers.entries())) {
    console.log(`  ${key}: ${value}`);
  }

  // keys() iteration
  console.log('\nkeys() iteration:');
  for (const key of Array.from(headers.keys())) {
    console.log(`  ${key}`);
  }

  // values() iteration
  console.log('\nvalues() iteration:');
  for (const value of Array.from(headers.values())) {
    console.log(`  ${value}`);
  }

  // forEach iteration
  console.log('\nforEach() iteration:');
  headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });

  // Default iteration (Symbol.iterator)
  console.log('\nDefault iteration (Symbol.iterator):');
  for (const [key, value] of Array.from(headers)) {
    console.log(`  ${key}: ${value}`);
  }

  return headers;
}

// Example 5: Headers serialization
export function headersSerialization() {
  console.log('\n📦 Headers Serialization Examples\n');

  const headers = new Headers([
    ['Content-Type', 'application/json'],
    ['Set-Cookie', 'session=abc123; Path=/'],
    ['Set-Cookie', 'theme=dark; Max-Age=3600'],
    ['X-Custom-Header', 'custom-value'],
    ['Authorization', 'Bearer token123']
  ]) as Headers;

  // toJSON() conversion
  const headersObject = headers.toJSON();
  console.log('toJSON() result:');
  console.log(JSON.stringify(headersObject, null, 2));

  // JSON.stringify() calls toJSON() automatically
  const jsonString = JSON.stringify(headers);
  console.log('\nJSON.stringify() result:');
  console.log(jsonString);

  // Manual Object.fromEntries (slower)
  const manualObject = Object.fromEntries(headers.entries() as Iterable<[string, string]>);
  console.log('\nObject.fromEntries() result:');
  console.log(JSON.stringify(manualObject, null, 2));

  return { headersObject, jsonString, manualObject };
}

// Example 6: Case-insensitive operations
export function caseInsensitiveOperations() {
  console.log('\n🔤 Case-Insensitive Operations\n');

  const headers = new Headers() as Headers;

  // Add headers with different cases
  headers.set('Content-Type', 'application/json');
  headers.set('content-type', 'text/plain'); // Should overwrite
  headers.set('CONTENT-TYPE', 'text/html'); // Should overwrite again

  console.log('Final Content-Type:', headers.get('Content-Type'));
  console.log('Get with lowercase:', headers.get('content-type'));
  console.log('Get with uppercase:', headers.get('CONTENT-TYPE'));

  // Test has() with different cases
  console.log('Has Content-Type:', headers.has('Content-Type'));
  console.log('Has content-type:', headers.has('content-type'));

  // Delete with different cases
  headers.delete('content-type');
  console.log('After delete - Has Content-Type:', headers.has('Content-Type'));

  return headers;
}

// Example 7: Headers in HTTP requests
export async function headersInHttpRequest() {
  console.log('\n🌐 Headers in HTTP Requests\n');

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': 'Bun-Headers-Demo/1.0',
    'X-Custom-Header': 'demo-value',
    'Accept': 'application/json'
  };

  try {
    // Example request (commented out to avoid actual HTTP call)
    /*
    const response = await fetch('https://httpbin.org/headers', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ message: 'Headers demo' })
    });

    const result = await response.json();
    console.log('Server received headers:');
    console.log(JSON.stringify(result.headers, null, 2));
    */

    console.log('Request headers prepared:', requestHeaders);

    // Example response headers handling
    const mockResponse = new Response('{"status": "ok"}', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-ID': 'resp-456'
      }
    });

    console.log('\nResponse headers:');
    for (const [key, value] of Array.from((mockResponse.headers as Headers).entries())) {
      console.log(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example 8: Headers utility functions
export function headerUtilities() {
  console.log('\n🛠️ Header Utility Functions\n');

  // Utility function to merge headers
  function mergeHeaders(...headerSets: HeadersInit[]): Headers {
    const merged = new Headers() as Headers;

    for (const headerSet of headerSets) {
      if (headerSet instanceof Headers) {
        for (const [key, value] of Array.from((headerSet as Headers).entries())) {
          merged.append(key, value);
        }
      } else if (Array.isArray(headerSet)) {
        for (const [key, value] of headerSet) {
          merged.append(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(headerSet)) {
          if (Array.isArray(value)) {
            value.forEach(v => merged.append(key, v));
          } else if (typeof value === 'string') {
            merged.append(key, value);
          }
        }
      }
    }

    return merged;
  }

  // Utility function to filter headers
  function filterHeaders(headers: Headers, predicate: (key: string, value: string) => boolean): Headers {
    const filtered = new Headers() as Headers;
    for (const [key, value] of Array.from(headers.entries())) {
      if (predicate(key, value)) {
        filtered.append(key, value);
      }
    }
    return filtered;
  }

  // Test utilities
  const baseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  }) as Headers;

  const customHeaders = [
    ['X-Custom', 'custom-value'],
    ['X-Another', 'another-value']
  ];

  const merged = mergeHeaders(baseHeaders, customHeaders) as Headers;
  console.log('Merged headers count:', merged.count);

  const filtered = filterHeaders(merged, (key, value) => key.startsWith('X-')) as Headers;
  console.log('Filtered (X-*) headers count:', filtered.count);

  return { merged, filtered };
}

// Main example runner
export function runAllExamples() {
  console.log('📋 Bun Headers API Usage Examples');
  console.log('=====================================\n');

  createHeadersExamples();
  basicHeaderOperations();
  setCookieHandling();
  headersIteration();
  headersSerialization();
  caseInsensitiveOperations();
  headerUtilities();

  // Async example
  headersInHttpRequest().catch(console.error);

  console.log('\n🎯 Examples Summary:');
  console.log('✅ Headers creation with different initialization types');
  console.log('✅ Basic operations: get, set, append, delete, has');
  console.log('✅ Special Set-Cookie handling with getAll()');
  console.log('✅ Multiple iteration methods');
  console.log('✅ Serialization with toJSON()');
  console.log('✅ Case-insensitive header operations');
  console.log('✅ HTTP request/response integration');
  console.log('✅ Utility functions for common patterns');
}

// Run examples if this file is executed directly
// Check if we're running this file directly (works with Bun's module system)
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('headers-usage-examples.ts')) {
  runAllExamples();
}
