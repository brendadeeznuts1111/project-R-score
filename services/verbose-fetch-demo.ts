// services/verbose-fetch-demo.ts
import { CONTENT_TYPES, ContentTypeHandler } from '../config/content-types.ts';
import { BUN_DOCS, TYPED_ARRAY_URLS } from '../config/urls.ts';

export class VerboseFetchDemo {
  
  // Demonstrate verbose logging with different content-types
  async demonstrateVerboseLogging(): Promise<void> {
    console.log('🔍 Demonstrating Bun fetch verbose logging...\n');
    
    // Test 1: JSON with verbose logging
    console.log('1. JSON request with verbose logging:');
    try {
      const response = await fetch('http://localhost:3001/api/content-type/test', {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.JSON
        },
        body: JSON.stringify({ message: 'Verbose JSON test' }),
        verbose: true // Bun-specific: shows detailed HTTP headers
      });
      console.log(`   Status: ${response.status}`);
      await response.json(); // Consume the body
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 2: Form data with verbose logging
    console.log('\n2. Form data request with verbose logging:');
    try {
      const response = await fetch('http://localhost:3001/api/content-type/test', {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.FORM_URLENCODED
        },
        body: 'name=Verbose&test=form',
        verbose: true
      });
      console.log(`   Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 3: Binary data with verbose logging
    console.log('\n3. Binary data request with verbose logging:');
    try {
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const response = await fetch('http://localhost:3001/api/typedarray/binary', {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.BINARY.UINT8_ARRAY,
          'Accept': 'application/json'
        },
        body: binaryData,
        verbose: true
      });
      console.log(`   Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 4: External request with verbose logging (example.com)
    console.log('\n4. External request (example.com) with verbose logging:');
    try {
      const response = await fetch('http://example.com/', {
        verbose: true
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      await response.text(); // Consume the body
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 5: Bun documentation with verbose logging
    console.log('\n5. Bun documentation with verbose logging:');
    try {
      const response = await fetch(`${BUN_DOCS.BASE}/runtime/networking/fetch#content-type-handling`, {
        verbose: true
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Server: ${response.headers.get('server')}`);
      await response.text(); // Consume the body
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n✅ Verbose logging demo completed!');
    console.log('\n📝 What verbose shows:');
    console.log('   → Complete HTTP request headers');
    console.log('   → Complete HTTP response headers');
    console.log('   → Content-Encoding information');
    console.log('   → Cache control headers');
    console.log('   → Server information');
    console.log('   → Timing and connection details');
  }
  
  // Demonstrate verbose logging with different fetch methods
  async demonstrateVerboseWithMethods(): Promise<void> {
    console.log('\n🔧 Verbose logging with different fetch methods...\n');
    
    // Test GET with verbose
    console.log('GET request with verbose:');
    try {
      const response = await fetch('http://localhost:3001/api/content-type/examples', {
        verbose: true
      });
      console.log(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    // Test POST with verbose and different body types
    console.log('\nPOST with FormData and verbose:');
    try {
      const formData = new FormData();
      formData.append('test', 'verbose');
      formData.append('type', 'form-data');
      
      const response = await fetch('http://localhost:3001/api/content-type/test', {
        method: 'POST',
        body: formData,
        verbose: true
      });
      console.log(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    // Test with custom headers and verbose
    console.log('\nCustom headers with verbose:');
    try {
      const response = await fetch('http://localhost:3001/api/content-type/test', {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPES.JSON,
          'X-Custom-Header': 'Verbose-Test',
          'User-Agent': 'Bun-Verbose-Demo/1.0'
        },
        body: JSON.stringify({ verbose: true, custom: 'header' }),
        verbose: true
      });
      console.log(`Status: ${response.status}`);
      await response.json();
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  // Demonstrate verbose with error scenarios
  async demonstrateVerboseWithErrors(): Promise<void> {
    console.log('\n❌ Verbose logging with error scenarios...\n');
    
    // Test timeout with verbose
    console.log('Timeout with verbose logging:');
    try {
      const response = await fetch('http://httpbin.org/delay/5', {
        signal: AbortSignal.timeout(1000), // 1 second timeout
        verbose: true
      });
      await response.text();
    } catch (error) {
      console.log(`Expected timeout error: ${error.message}`);
    }
    
    // Test 404 with verbose
    console.log('\n404 error with verbose logging:');
    try {
      const response = await fetch('http://localhost:3001/nonexistent-endpoint', {
        verbose: true
      });
      console.log(`Status: ${response.status}`);
      await response.text();
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    // Test invalid domain with verbose
    console.log('\nInvalid domain with verbose logging:');
    try {
      const response = await fetch('http://invalid-domain-that-does-not-exist.com/', {
        verbose: true
      });
      await response.text();
    } catch (error) {
      console.log(`Expected DNS error: ${error.message}`);
    }
  }
  
  // Run all verbose demonstrations
  async runAllVerboseDemos(): Promise<void> {
    console.log('🎯 Running comprehensive verbose fetch demonstrations...\n');
    
    try {
      await this.demonstrateVerboseLogging();
      await this.demonstrateVerboseWithMethods();
      await this.demonstrateVerboseWithErrors();
      
      console.log('\n✅ All verbose demos completed successfully!');
      console.log('\n📚 Verbose logging is a Bun-specific feature that helps with:');
      console.log('   • Debugging HTTP requests and responses');
      console.log('   • Understanding content-type handling');
      console.log('   • Analyzing caching behavior');
      console.log('   • Troubleshooting network issues');
      console.log('   • Learning HTTP protocol details');
      
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
