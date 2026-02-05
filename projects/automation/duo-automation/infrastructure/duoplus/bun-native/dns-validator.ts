// duoplus/bun-native/dns-validator.ts
import { dns } from 'bun';

export interface DnsValidationResult {
  isValid: boolean;
  actualDnsProvider: string;
  expectedProvider: string;
  leakDetected: boolean;
  responseTime: number;
  details: {
    ipv4Results: string[];
    ipv6Results: string[];
    dnsServer: string;
  };
}

export class BunNativeDnsValidator {
  private expectedDnsProvider: 'google' | 'cloudflare' | 'proxy-custom';
  private timeout: number;
  private knownProviders: Record<string, { ips: string[]; patterns: RegExp[] }> = {
    google: {
      ips: ['8.8.8.8', '8.8.4.4', '2001:4860:4860::8888', '2001:4860:4860::8844'],
      patterns: [/google\.com/i, /dns\.google/i]
    },
    cloudflare: {
      ips: ['1.1.1.1', '1.0.0.1', '2606:4700:4700::1111', '2606:4700:4700::1001'],
      patterns: [/cloudflare\.com/i, /1\.1\.1\.1/i]
    },
    'proxy-custom': {
      ips: [], // Will be configured dynamically
      patterns: [] // Will be configured dynamically
    }
  };

  constructor(options: {
    expectedDnsProvider: 'google' | 'cloudflare' | 'proxy-custom';
    timeout?: number;
    customProviderConfig?: {
      ips: string[];
      patterns: RegExp[];
    };
  }) {
    this.expectedDnsProvider = options.expectedDnsProvider;
    this.timeout = options.timeout ?? 500;
    
    if (options.customProviderConfig) {
      this.knownProviders['proxy-custom'] = options.customProviderConfig;
    }
  }

  /**
   * Validate DNS configuration for leak prevention
   */
  async validateDnsLeak(testDomain: string = 'dnsleaktest.com'): Promise<DnsValidationResult> {
    const startTime = Date.now();
    
    try {
      // Test IPv4 resolution
      const ipv4Results = await this.resolveWithTimeout(testDomain, 'A');
      
      // Test IPv6 resolution
      const ipv6Results = await this.resolveWithTimeout(testDomain, 'AAAA');
      
      const responseTime = Date.now() - startTime;
      
      // Determine actual DNS provider
      const actualDnsProvider = await this.detectDnsProvider(testDomain);
      
      // Check for leaks
      const leakDetected = actualDnsProvider !== this.expectedDnsProvider;
      
      return {
        isValid: !leakDetected,
        actualDnsProvider,
        expectedProvider: this.expectedDnsProvider,
        leakDetected,
        responseTime,
        details: {
          ipv4Results,
          ipv6Results,
          dnsServer: this.getCurrentDnsServer()
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        actualDnsProvider: 'unknown',
        expectedProvider: this.expectedDnsProvider,
        leakDetected: true,
        responseTime: Date.now() - startTime,
        details: {
          ipv4Results: [],
          ipv6Results: [],
          dnsServer: 'unknown'
        }
      };
    }
  }

  /**
   * Resolve DNS with timeout
   */
  private async resolveWithTimeout(domain: string, type: 'A' | 'AAAA'): Promise<string[]> {
    try {
      // Use Bun's DNS resolution API
      const results = await dns.lookup(domain, { family: type === 'A' ? 'IPv4' : 'IPv6' });
      const addresses = Array.isArray(results) ? results : [results];
      
      // Extract only string addresses, handling both string and DNSLookup object types
      const stringAddresses = addresses.map(r => {
        if (typeof r === 'string') {
          return r;
        } else if (r && typeof r === 'object' && 'address' in r) {
          return typeof r.address === 'string' ? r.address : String(r.address);
        } else {
          return String(r);
        }
      });
      
      const promise = Promise.resolve(stringAddresses);
      
      return Promise.race([
        promise,
        new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('DNS timeout')), this.timeout)
        )
      ]);
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect which DNS provider is being used
   */
  private async detectDnsProvider(testDomain: string): Promise<string> {
    try {
      // Try to get DNS server information
      const dnsServer = this.getCurrentDnsServer();
      
      // Check against known provider IPs
      for (const [provider, config] of Object.entries(this.knownProviders)) {
        if (config.ips.includes(dnsServer)) {
          return provider;
        }
      }
      
      // Check response patterns (some providers have unique response formats)
      const response = await this.resolveWithTimeout(testDomain, 'A');
      const responseText = response.join(',');
      
      for (const [provider, config] of Object.entries(this.knownProviders)) {
        if (config.patterns.some(pattern => pattern.test(responseText))) {
          return provider;
        }
      }
      
      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Get current DNS server (this is a simplified implementation)
   */
  private getCurrentDnsServer(): string {
    // In a real implementation, this would read from system configuration
    // For now, return a placeholder
    return '8.8.8.8'; // Default to Google DNS
  }

  /**
   * Test multiple domains for comprehensive leak detection
   */
  async validateMultipleDomains(domains: string[] = ['google.com', 'cloudflare.com', 'dnsleaktest.com']): Promise<DnsValidationResult[]> {
    const results = await Promise.all(
      domains.map(domain => this.validateDnsLeak(domain))
    );
    
    return results;
  }

  /**
   * Continuous monitoring for DNS leaks
   */
  async startContinuousMonitoring(
    intervalMs: number = 60000, // 1 minute
    callback: (result: DnsValidationResult) => void
  ): Promise<NodeJS.Timeout> {
    const interval = setInterval(async () => {
      const result = await this.validateDnsLeak();
      callback(result);
    }, intervalMs);
    
    return interval;
  }

  /**
   * Test DNS over HTTPS (DoH) if configured
   */
  async testDnsOverHttps(testDomain: string = 'google.com'): Promise<{
    working: boolean;
    provider: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Test with Cloudflare DoH
      const cfUrl = new URL('https://cloudflare-dns.com/dns-query');
      cfUrl.searchParams.set('name', testDomain);
      cfUrl.searchParams.set('type', 'A');
      
      const cfResponse = await fetch(cfUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/dns-json'
        }
      });
      
      if (cfResponse.ok) {
        return {
          working: true,
          provider: 'cloudflare-doh',
          responseTime: Date.now() - startTime
        };
      }
    } catch (error) {
      // Continue to test other providers
    }
    
    try {
      // Test with Google DoH
      const googleUrl = new URL('https://dns.google/resolve');
      googleUrl.searchParams.set('name', testDomain);
      googleUrl.searchParams.set('type', 'A');
      
      const googleResponse = await fetch(googleUrl.toString(), {
        method: 'GET'
      });
      
      if (googleResponse.ok) {
        return {
          working: true,
          provider: 'google-doh',
          responseTime: Date.now() - startTime
        };
      }
    } catch (error) {
      // No DoH working
    }
    
    return {
      working: false,
      provider: 'none',
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Generate DNS leak report
   */
  generateReport(results: DnsValidationResult[]): {
    summary: {
      totalTests: number;
      leaksDetected: number;
      successRate: number;
      averageResponseTime: number;
    };
    recommendations: string[];
  } {
    const totalTests = results.length;
    const leaksDetected = results.filter(r => r.leakDetected).length;
    const successRate = ((totalTests - leaksDetected) / totalTests) * 100;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    
    const recommendations: string[] = [];
    
    if (leaksDetected > 0) {
      recommendations.push('DNS leaks detected. Check proxy configuration.');
      recommendations.push('Ensure all traffic is routed through the expected DNS provider.');
    }
    
    if (averageResponseTime > 1000) {
      recommendations.push('DNS response time is high. Consider using a faster DNS provider.');
    }
    
    if (successRate < 100) {
      recommendations.push('Some DNS queries failed. Check network connectivity.');
    }
    
    return {
      summary: {
        totalTests,
        leaksDetected,
        successRate,
        averageResponseTime
      },
      recommendations
    };
  }
}
