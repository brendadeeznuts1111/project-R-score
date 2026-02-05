// scripts/verify-dns.ts [#REF:CLI]
export class DNSVerifier {
  async verifyAll(): Promise<VerificationResult> {
    console.log('🔍 Verifying DuoPlus DNS Configuration...\n');
    
    const results = {
      dnsRecords: await this.verifyDNSRecords(),
      sslCertificates: await this.verifySSL(),
      workerRoutes: await this.verifyWorkerRoutes(),
      apiEndpoints: await this.verifyAPIEndpoints(),
      propagation: await this.checkPropagation(),
    };
    
    // Generate report
    console.log('\n📋 VERIFICATION REPORT');
    console.log('='.repeat(50));
    
    const allPassed = Object.values(results).every(r => r.passed);
    
    if (allPassed) {
      console.log('✅ ALL SYSTEMS GO! Your apple. subdomain architecture is fully operational.');
    } else {
      console.log('❌ Some issues detected. See details above.');
      process.exit(1);
    }
    
    return { passed: allPassed, details: results };
  }

  private async verifyDNSRecords(): Promise<VerificationResult> {
    console.log('1️⃣  Checking DNS Records...');
    
    const required = ['api.apple', 'qr.apple', 'ws.apple', 'auth.apple', 'monitor.apple'];
    const results = [];
    
    for (const subdomain of required) {
      try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${subdomain}.factory-wager.com&type=A`, {
          headers: { 'Accept': 'application/dns-json' },
        }).then(r => r.json());
        
        const hasRecords = response.Answer && response.Answer.length > 0;
        results.push({ subdomain, passed: hasRecords });
        
        console.log(`  ${hasRecords ? '✅' : '❌'} ${subdomain}.factory-wager.com`);
      } catch (error) {
        results.push({ subdomain, passed: false, error: error.message });
        console.log(`  ❌ ${subdomain}.factory-wager.com - ${error.message}`);
      }
    }
    
    const passed = results.every(r => r.passed);
    return { passed, details: results };
  }

  private async verifyWorkerRoutes(): Promise<VerificationResult> {
    console.log('\n2️⃣  Checking Cloudflare Worker Routes...');
    
    const routes = [
      { pattern: 'api.apple.factory-wager.com/api/*', worker: 'duoplus-api' },
      { pattern: 'qr.apple.factory-wager.com/*', worker: 'duoplus-qr' },
      { pattern: 'ws.apple.factory-wager.com/*', worker: 'duoplus-ws' },
      { pattern: 'auth.apple.factory-wager.com/*', worker: 'duoplus-auth' },
    ];
    
    // Check wrangler.toml configuration
    const wrangler = await Bun.file('./wrangler.toml').text();
    const results = routes.map(route => {
      const isConfigured = wrangler.includes(route.pattern);
      console.log(`  ${isConfigured ? '✅' : '❌'} ${route.pattern} -> ${route.worker}`);
      return { ...route, passed: isConfigured };
    });
    
    const passed = results.every(r => r.passed);
    return { passed, details: results };
  }

  private async verifyAPIEndpoints(): Promise<VerificationResult> {
    console.log('\n3️⃣  Testing API Endpoints...');
    
    const endpoints = [
      { url: 'https://api.apple.factory-wager.com/api/status', expected: 200 },
      { url: 'https://monitor.apple.factory-wager.com/qr-onboard', expected: 200 },
    ];
    
    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint.url, { signal: AbortSignal.timeout(5000) });
          const passed = response.status === endpoint.expected;
          console.log(`  ${passed ? '✅' : '❌'} ${endpoint.url} (${response.status})`);
          return { ...endpoint, actual: response.status, passed };
        } catch (error) {
          console.log(`  ❌ ${endpoint.url} - ${error.message}`);
          return { ...endpoint, passed: false, error: error.message };
        }
      })
    );
    
    const passed = results.every(r => r.passed);
    return { passed, details: results };
  }

  private async checkPropagation(): Promise<VerificationResult> {
    console.log('\n4️⃣  Checking Global Propagation...');
    
    const checkPoints = [
      { location: 'New York', server: '8.8.8.8' },
      { location: 'London', server: '1.1.1.1' },
      { location: 'Tokyo', server: '208.67.222.222' },
      { location: 'Sydney', server: '9.9.9.9' },
    ];
    
    const testDomain = 'api.apple.factory-wager.com';
    const results = [];
    
    for (const checkpoint of checkPoints) {
      try {
        const ip = await this.dnsLookup(testDomain, checkpoint.server);
        const propagated = ip.includes('cloudflare') || ip === this.BASE_DOMAIN;
        results.push({ location: checkpoint.location, propagated, ip });
        console.log(`  ${propagated ? '✅' : '⏳'} ${checkpoint.location} (${checkpoint.server}) - ${ip || 'Not found'}`);
      } catch (error) {
        results.push({ location: checkpoint.location, propagated: false, error: error.message });
        console.log(`  ❌ ${checkpoint.location} - ${error.message}`);
      }
    }
    
    const passed = results.every(r => r.propagated);
    return { passed, details: results };
  }

  private async dnsLookup(domain: string, server: string): Promise<string> {
    const result = await $`dig +short ${domain} @${server}`.text();
    return result.trim();
  }

  private async verifySSL(): Promise<VerificationResult> {
    console.log('\n5️⃣  Verifying SSL Certificates...');
    
    try {
      const response = await fetch('https://api.apple.factory-wager.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      
      const certInfo = response.headers.get('cf-meta-certificate');
      const passed = certInfo !== null;
      
      console.log(`  ${passed ? '✅' : '❌'} SSL Certificate active`);
      return { passed, details: { certInfo } };
    } catch (error) {
      console.log(`  ❌ SSL verification failed: ${error.message}`);
      return { passed: false, details: { error: error.message } };
    }
  }
}

// CLI Usage
if (import.meta.main) {
  const verifier = new DNSVerifier();
  await verifier.verifyAll();
}
