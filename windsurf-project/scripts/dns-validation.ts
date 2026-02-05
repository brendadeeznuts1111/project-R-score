// scripts/dns-validation.ts
/**
 * 🎯 PRODUCTION DNS VALIDATION: EMPIRE PRO DEPLOYMENT
 * Validates DNS records, CDN integration, and R2 storage mapping
 */

interface Endpoint {
  name: string;
  url: string;
  pattern: string;
  expectedStatus: number;
}

interface ValidationResult {
  name: string;
  status: '✅' | '❌';
  httpStatus?: number;
  cdnStatus?: string;
  edgeLocation?: string;
  latency?: number;
  error?: string;
  pattern?: string;
}

class DNSValidator {
  private endpoints: Endpoint[] = [
    { name: 'API', url: 'https://api.apple', pattern: '§API:120', expectedStatus: 200 },
    { name: 'Dashboard', url: 'https://dashboard.apple', pattern: '§Pattern:115', expectedStatus: 200 },
    { name: 'Status', url: 'https://status.apple', pattern: '§Workflow:100', expectedStatus: 200 },
    { name: 'Metrics', url: 'https://metrics.apple', pattern: '§Metric:39', expectedStatus: 200 },
    { name: 'Admin', url: 'https://admin.apple', pattern: '§CLI:124', expectedStatus: 200 }
  ];

  async validateEndpoint(endpoint: Endpoint): Promise<ValidationResult> {
    const start = performance.now();
    
    try {
      const response = await fetch(endpoint.url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const latency = performance.now() - start;
      const headers = Object.fromEntries(response.headers.entries());
      
      return {
        name: endpoint.name,
        status: response.status === endpoint.expectedStatus ? '✅' : '❌',
        httpStatus: response.status,
        cdnStatus: headers['cf-cache-status'] || 'unknown',
        edgeLocation: headers['x-empire-pro-edge'] || headers['cf-ray'] || 'unknown',
        latency: Math.round(latency)
      };
    } catch (error) {
      return {
        name: endpoint.name,
        status: '❌',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Math.round(performance.now() - start)
      };
    }
  }

  async validatePhoneIntelligenceAPI(): Promise<ValidationResult> {
    const start = performance.now();
    
    try {
      const response = await fetch('https://api.apple/v1/phone/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+14155552671' }),
        signal: AbortSignal.timeout(10000)
      });
      
      const latency = performance.now() - start;
      const data = await response.json();
      
      return {
        name: 'Phone API',
        status: data.success && data.data?.trustScore > 50 ? '✅' : '❌',
        httpStatus: response.status,
        latency: Math.round(latency),
        error: data.success ? undefined : 'API returned failure'
      };
    } catch (error) {
      return {
        name: 'Phone API',
        status: '❌',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Math.round(performance.now() - start)
      };
    }
  }

  async validateBulkAPI(): Promise<ValidationResult> {
    const start = performance.now();
    
    try {
      const response = await fetch('https://api.apple/v1/phone/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phones: ['+14155552671', '+442071838750', '+16195551234'] 
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      const latency = performance.now() - start;
      const data = await response.json();
      
      // Expect bulk processing in <10ms for 3 numbers (543k/s throughput)
      const expectedMaxLatency = 10;
      
      return {
        name: 'Bulk API',
        status: response.ok && latency < expectedMaxLatency ? '✅' : '❌',
        httpStatus: response.status,
        latency: Math.round(latency),
        error: latency > expectedMaxLatency ? `Too slow: ${Math.round(latency)}ms > ${expectedMaxLatency}ms` : undefined
      };
    } catch (error) {
      return {
        name: 'Bulk API',
        status: '❌',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Math.round(performance.now() - start)
      };
    }
  }

  async validateR2Integration(): Promise<ValidationResult> {
    const start = performance.now();
    
    try {
      // Test R2 Apple Manager DNS resolution
      const { BunR2AppleManager } = await import('../src/storage/r2-apple-manager.js');
      const manager = new BunR2AppleManager();
      
      // Use getMetrics() instead of healthCheck() since healthCheck doesn't exist
      const metrics = await manager.getMetrics();
      const latency = performance.now() - start;
      
      return {
        name: 'R2 Storage',
        status: metrics.status === 'online' ? '✅' : '❌',
        httpStatus: metrics.status === 'online' ? 200 : 500,
        latency: Math.round(latency),
        error: metrics.status === 'online' ? undefined : `Status: ${metrics.status}`
      };
    } catch (error) {
      return {
        name: 'R2 Storage',
        status: '❌',
        httpStatus: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Math.round(performance.now() - start)
      };
    }
  }

  async runFullValidation(): Promise<void> {
    console.log('🌍 EMPIRE PRO PRODUCTION DNS VALIDATION');
    console.log('═'.repeat(70));
    
    // Validate DNS endpoints
    console.log('\n📡 DNS ENDPOINT VALIDATION:');
    const endpointResults = await Promise.all(
      this.endpoints.map(endpoint => this.validateEndpoint(endpoint))
    );
    
    endpointResults.forEach(result => {
      const status = result.status === '✅' ? '✅' : '❌';
      const latency = result.latency ? `${result.latency}ms` : 'N/A';
      const cdn = result.cdnStatus || 'N/A';
      const edge = result.edgeLocation || 'N/A';
      
      console.log(`  ${status} ${result.name.padEnd(10)} (${(result.pattern || '').padEnd(12)})`);
      console.log(`     HTTP: ${result.httpStatus || 'N/A'} | CDN: ${cdn} | Edge: ${edge} | Latency: ${latency}`);
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Validate API functionality
    console.log('\n🔌 API FUNCTIONALITY TESTS:');
    const apiResults = await Promise.all([
      this.validatePhoneIntelligenceAPI(),
      this.validateBulkAPI(),
      this.validateR2Integration()
    ]);
    
    apiResults.forEach(result => {
      const status = result.status === '✅' ? '✅' : '❌';
      const latency = result.latency ? `${result.latency}ms` : 'N/A';
      
      console.log(`  ${status} ${result.name.padEnd(12)} | Latency: ${latency}`);
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Summary
    const allResults = [...endpointResults, ...apiResults];
    const successCount = allResults.filter(r => r.status === '✅').length;
    const totalCount = allResults.length;
    
    console.log('\n📊 VALIDATION SUMMARY:');
    console.log(`   Overall: ${successCount}/${totalCount} tests passed`);
    console.log(`   Success Rate: ${Math.round((successCount / totalCount) * 100)}%`);
    
    if (successCount === totalCount) {
      console.log('\n🚀 EMPIRE PRO PRODUCTION: FULLY OPERATIONAL');
      console.log('   ✅ All DNS records correctly configured');
      console.log('   ✅ CDN integration active');
      console.log('   ✅ R2 storage accessible');
      console.log('   ✅ Phone Intelligence API functional');
      console.log('   ✅ Bulk processing meets performance targets');
    } else {
      console.log('\n⚠️  EMPIRE PRO PRODUCTION: NEEDS ATTENTION');
      console.log(`   ❌ ${totalCount - successCount} systems require investigation`);
    }
    
    console.log('═'.repeat(70));
  }
}

// CLI interface
async function main() {
  const validator = new DNSValidator();
  
  if (process.argv.includes('--quick')) {
    console.log('⚡ Quick DNS validation...');
    // Just test the main endpoints
    const results = await Promise.all([
      validator.validateEndpoint({ name: 'API', url: 'https://api.apple', pattern: '§API:120', expectedStatus: 200 }),
      validator.validateEndpoint({ name: 'Dashboard', url: 'https://dashboard.apple', pattern: '§Pattern:115', expectedStatus: 200 })
    ]);
    
    results.forEach(result => {
      console.log(`${result.status} ${result.name}: ${result.error || 'OK'}`);
    });
  } else {
    await validator.runFullValidation();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DNSValidator };
