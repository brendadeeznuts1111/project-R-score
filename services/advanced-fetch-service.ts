// services/advanced-fetch-service.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../config/urls.ts';
import { dns } from 'bun';

export class AdvancedFetchService {
  
  // Demonstrate DNS prefetching (Bun-specific optimization)
  async prefetchDNS(): Promise<void> {
    console.log('🚀 Prefetching DNS for bun.sh...');
    dns.prefetch('bun.sh');
    
    // Show cache stats
    const stats = dns.getCacheStats();
    console.log('DNS Cache Stats:', stats);
  }
  
  // Demonstrate preconnect (Bun-specific optimization)
  async preconnectToBun(): Promise<void> {
    console.log('🔗 Preconnecting to bun.sh...');
    try {
      await fetch.preconnect('https://bun.sh');
      console.log('✅ Preconnect completed');
    } catch (error) {
      console.log(`⚠️ Preconnect failed (this is expected in some environments): ${error.message}`);
    }
  }
  
  // Fetch with timeout using AbortSignal.timeout
  async fetchWithTimeout(url: string, timeoutMs = 5000): Promise<any> {
    console.log(`⏱️ Fetching ${url} with ${timeoutMs}ms timeout...`);
    
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        verbose: true, // Bun-specific debugging
      });
      
      console.log(`✅ Response status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`❌ Timeout or error: ${error.message}`);
      throw error;
    }
  }
  
  // Demonstrate streaming response body
  async streamResponse(url: string): Promise<void> {
    console.log(`📡 Streaming response from ${url}...`);
    
    const response = await fetch(url);
    let totalBytes = 0;
    
    // Stream the response body chunk by chunk
    for await (const chunk of response.body!) {
      totalBytes += chunk.length;
      console.log(`📦 Received chunk: ${chunk.length} bytes (total: ${totalBytes})`);
    }
    
    console.log(`✅ Total streamed: ${totalBytes} bytes`);
  }
  
  // Demonstrate binary data handling with TypedArrays
  async fetchAsTypedArray(url: string): Promise<Uint8Array> {
    console.log(`🔢 Fetching ${url} as Uint8Array...`);
    
    const response = await fetch(url);
    const bytes = await response.bytes(); // Bun-specific method
    
    console.log(`✅ Received ${bytes.length} bytes as Uint8Array`);
    console.log(`📊 First 10 bytes: ${bytes.slice(0, 10)}`);
    
    return bytes;
  }
  
  // Demonstrate POST with streaming body
  async postWithStream(url: string, data: string[]): Promise<Response> {
    console.log(`📤 POSTing streaming data to ${url}...`);
    
    // Create a readable stream
    const stream = new ReadableStream({
      start(controller) {
        data.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(chunk);
            if (index === data.length - 1) {
              controller.close();
            }
          }, index * 100); // Simulate async data generation
        });
      },
    });
    
    const response = await fetch(url, {
      method: 'POST',
      body: stream,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    
    console.log(`✅ POST response status: ${response.status}`);
    return response;
  }
  
  // Demonstrate fetch with custom headers and proxy options
  async fetchWithHeaders(url: string): Promise<Response> {
    console.log(`🔐 Fetching ${url} with custom headers...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bun-TypedArray-Docs/1.0',
        'Accept': 'application/json, text/plain, */*',
        'X-Custom-Header': 'Bun-Fetch-Demo',
      },
      verbose: false, // Disable verbose for cleaner output
    });
    
    console.log(`✅ Response status: ${response.status}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    return response;
  }
  
  // Demonstrate concurrent fetches with connection pooling
  async fetchMultiple(urls: string[]): Promise<Response[]> {
    console.log(`🔄 Fetching ${urls.length} URLs concurrently...`);
    
    const startTime = Date.now();
    
    // Bun will automatically pool connections and limit concurrent requests
    const responses = await Promise.all(
      urls.map(url => 
        fetch(url, {
          verbose: false, // Reduce noise in output
        })
      )
    );
    
    const endTime = Date.now();
    console.log(`✅ Completed ${responses.length} requests in ${endTime - startTime}ms`);
    
    responses.forEach((response, index) => {
      console.log(`   ${index + 1}. ${urls[index]} - ${response.status}`);
    });
    
    return responses;
  }
  
  // Demonstrate error handling for different scenarios
  async demonstrateErrorHandling(): Promise<void> {
    console.log('⚠️ Demonstrating error handling...');
    
    // Test timeout error
    try {
      await this.fetchWithTimeout('https://httpbin.org/delay/10', 2000);
    } catch (error) {
      console.log(`✅ Caught timeout error: ${error.message}`);
    }
    
    // Test invalid URL
    try {
      await fetch('https://invalid-domain-that-does-not-exist.com');
    } catch (error) {
      console.log(`✅ Caught DNS error: ${error.message}`);
    }
    
    // Test 404 handling
    try {
      const response = await fetch('https://httpbin.org/status/404');
      if (!response.ok) {
        console.log(`✅ Handled HTTP error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Unexpected error: ${error.message}`);
    }
  }
  
  // Demonstrate different response body methods
  async demonstrateResponseMethods(url: string): Promise<void> {
    console.log(`📚 Testing different response methods on ${url}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Clone response since it can only be read once
    const clone1 = response.clone();
    const clone2 = response.clone();
    const clone3 = response.clone();
    
    // Test different methods based on content type
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      console.log(`✅ JSON response: ${JSON.stringify(jsonData).slice(0, 100)}...`);
    } else if (contentType?.includes('text/html') || contentType?.includes('text/plain')) {
      const textData = await clone1.text();
      console.log(`✅ Text response: ${textData.slice(0, 100)}... (${textData.length} chars)`);
    }
    
    // Always test binary methods
    const arrayBuffer = await clone2.arrayBuffer();
    console.log(`✅ ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
    
    const uint8Array = await clone3.bytes();
    console.log(`✅ Uint8Array: ${uint8Array.length} bytes`);
  }
  
  // Comprehensive demo showing all Bun fetch features
  async runFullDemo(): Promise<void> {
    console.log('🎯 Running comprehensive Bun fetch demo...\n');
    
    const testUrl = `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`;
    const testUrls = [
      `${BUN_DOCS.BASE}${BUN_DOCS.API.FETCH}`,
      `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`,
      `${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.NETWORKING}`,
    ];
    
    try {
      // 1. DNS and connection optimizations
      await this.prefetchDNS();
      await this.preconnectToBun();
      
      // 2. Basic fetch with timeout
      console.log('\n📍 Testing basic fetch with timeout...');
      await this.fetchWithTimeout(testUrl, 10000);
      
      // 3. Headers and custom options
      console.log('\n📍 Testing custom headers...');
      await this.fetchWithHeaders(testUrl);
      
      // 4. Different response methods
      console.log('\n📍 Testing response methods...');
      await this.demonstrateResponseMethods(testUrl);
      
      // 5. Binary data handling
      console.log('\n📍 Testing binary data...');
      await this.fetchAsTypedArray(`${BUN_DOCS.BASE}${BUN_DOCS.RUNTIME.BINARY_DATA}`);
      
      // 6. Concurrent fetching with connection pooling
      console.log('\n📍 Testing concurrent fetches...');
      await this.fetchMultiple(testUrls);
      
      // 7. Error handling
      console.log('\n📍 Testing error handling...');
      await this.demonstrateErrorHandling();
      
      // 8. Streaming (commented out to avoid too much output)
      // console.log('\n📍 Testing streaming...');
      // await this.streamResponse(testUrl);
      
      console.log('\n✨ Demo completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error.message);
      console.log('⚠️ Some failures are expected in demo environments');
    }
  }
}

// Example usage
if (import.meta.main) {
  const service = new AdvancedFetchService();
  await service.runFullDemo();
}

export default AdvancedFetchService;
