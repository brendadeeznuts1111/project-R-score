// services/verbose-fetch-demo.ts
import { CONTENT_TYPES, ContentTypeHandler } from '../../config/content-types.ts';

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
import { BUN_DOCS, TYPED_ARRAY_URLS } from '../../config/urls.ts';

// Use existing API URL pattern
const API_BASE_URL = process.env.API_BASE_URL || 'http://example.com';

export class VerboseFetchDemo {
  
  // Demonstrate verbose logging with different content-types
  async demonstrateVerboseLogging(): Promise<void> {
    console.info('🔍 Demonstrating Bun fetch verbose logging...\n');
    
    // Test 1: JSON with verbose logging
    console.info('1. JSON request with verbose logging:');
    try {
      const response = await fetch(`${API_BASE_URL}/api/content-type/test`, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.JSON
        },
        body: JSON.stringify({ message: 'Verbose JSON test' }),
        verbose: true // Bun-specific: shows detailed HTTP headers
      });
      console.info(`   Status: ${response.status}`);
      await response.json(); // Consume the body
    } catch (error) {
      console.info(`   Error: ${error.message}`);
    }
    
    // Test 2: Form data with verbose logging
    console.info('\n2. Form data request with verbose logging:');
    try {
      const response = await fetch(`${API_BASE_URL}/api/content-type/test`, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.FORM_URLENCODED
        },
        body: 'name=Verbose&test=form',
        verbose: true
      });
      console.info(`   Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.info(`   Error: ${error.message}`);
    }
    
    // Test 3: Binary data with verbose logging
    console.info('\n3. Binary data request with verbose logging:');
    try {
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const response = await fetch(`${API_BASE_URL}/api/typedarray/binary`, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.BINARY.UINT8_ARRAY,
          'Accept': 'application/json'
        },
        body: binaryData,
        verbose: true
      });
      console.info(`   Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.info(`   Error: ${error.message}`);
    }
    
    // Test 4: External request with verbose logging (example.com)
    console.info('\n4. External request (example.com) with verbose logging:');
    try {
      const response = // 🚀 Prefetch hint: Consider preconnecting to 'http://example.com/' domain
 await fetch('http://example.com/', {
        verbose: true
      });
      console.info(`   Status: ${response.status}`);
      console.info(`   Content-Type: ${response.headers.get('content-type')}`);
      console.info(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      await response.text(); // Consume the body
    } catch (error) {
      console.info(`   Error: ${error.message}`);
    }
    
    // Test 5: Bun documentation with verbose logging
    console.info('\n5. Bun documentation with verbose logging:');
    try {
      const response = await fetch(`${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`, {
        verbose: true
      });
      console.info(`   Status: ${response.status}`);
      console.info(`   Content-Type: ${response.headers.get('content-type')}`);
      console.info(`   Server: ${response.headers.get('server')}`);
      await response.text(); // Consume the body
    } catch (error) {
      console.info(`   Error: ${error.message}`);
    }
    
    console.info('\n✅ Verbose logging demo completed!');
    console.info('\n📝 What verbose shows:');
    console.info('   → Complete HTTP request headers');
    console.info('   → Complete HTTP response headers');
    console.info('   → Content-Encoding information');
    console.info('   → Cache control headers');
    console.info('   → Server information');
    console.info('   → Timing and connection details');
  }
  
  // Demonstrate verbose logging with different fetch methods
  async demonstrateVerboseWithMethods(): Promise<void> {
    console.info('\n🔧 Verbose logging with different fetch methods...\n');
    
    // Test GET with verbose
    console.info('GET request with verbose:');
    try {
      const response = await fetch(`${API_BASE_URL}/api/content-type/examples`, {
        verbose: true
      });
      console.info(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.info(`Error: ${error.message}`);
    }
    
    // Test POST with verbose and different body types
    console.info('\nPOST with FormData and verbose:');
    try {
      const formData = new FormData();
      formData.append('test', 'verbose');
      formData.append('type', 'form-data');
      
      const response = await fetch(`${API_BASE_URL}/api/content-type/test`, {
        method: 'POST',
        body: formData,
        verbose: true
      });
      console.info(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.info(`Error: ${error.message}`);
    }
    
    // Test with custom headers and verbose
    console.info('\nCustom headers with verbose:');
    try {
      const response = await fetch(`${API_BASE_URL}/api/content-type/test`, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.JSON,
          'X-Custom-Header': 'Verbose-Test',
          'User-Agent': 'Bun-Verbose-Demo/1.0'
        },
        body: JSON.stringify({ verbose: true, custom: 'header' }),
        verbose: true
      });
      console.info(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.info(`Error: ${error.message}`);
    }
  }
  
  // Demonstrate verbose with error scenarios
  async demonstrateVerboseWithErrors(): Promise<void> {
    console.info('\n❌ Verbose logging with error scenarios...\n');
    
    // Test timeout with verbose
    console.info('Timeout with verbose logging:');
    try {
      const response = // 🚀 Prefetch hint: Consider preconnecting to 'http://httpbin.org/delay/5' domain
 await fetch('http://httpbin.org/delay/5', {
        signal: AbortSignal.timeout(1000), // 1 second timeout
        verbose: true
      });
      await response.text();
    } catch (error) {
      console.info(`Expected timeout error: ${error.message}`);
    }
    
    // Test 404 with verbose
    console.info('\n404 error with verbose logging:');
    try {
      const response = await fetch(`${API_BASE_URL}/nonexistent-endpoint`, {
        verbose: true
      });
      console.info(`Status: ${response.status}`);
      await response.text();
    } catch (error) {
      console.info(`Error: ${error.message}`);
    }
    
    // Test invalid domain with verbose
    console.info('\nInvalid domain with verbose logging:');
    try {
      const response = // 🚀 Prefetch hint: Consider preconnecting to 'http://invalid-domain-that-does-not-exist.com/' domain
 await fetch('http://invalid-domain-that-does-not-exist.com/', {
        verbose: true
      });
      await response.text();
    } catch (error) {
      console.info(`Expected DNS error: ${error.message}`);
    }
  }
  
  // Run all verbose demonstrations
  async runAllVerboseDemos(): Promise<void> {
    console.info('🎯 Running comprehensive verbose fetch demonstrations...\n');
    
    try {
      await this.demonstrateVerboseLogging();
      await this.demonstrateVerboseWithMethods();
      await this.demonstrateVerboseWithErrors();
      
      console.info('\n✅ All verbose demos completed successfully!');
      console.info('\n📚 Verbose logging is a Bun-specific feature that helps with:');
      console.info('   • Debugging HTTP requests and responses');
      console.info('   • Understanding content-type handling');
      console.info('   • Analyzing caching behavior');
      console.info('   • Troubleshooting network issues');
      console.info('   • Learning HTTP protocol details');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error.message);
    }
  }
}

// Example usage
if (import.meta.main) {
  const demo = new VerboseFetchDemo();
  await demo.runAllVerboseDemos();
}

export default VerboseFetchDemo;

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */