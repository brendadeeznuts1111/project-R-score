#!/usr/bin/env bun

// tools/url-validator.ts - URL validation and testing tool

import { URLHelper } from '../utils/url-helper';
import { URLMonitor, URL_SETS } from '../utils/url-monitor';

class URLValidator {
  private monitor: URLMonitor;
  
  constructor() {
    this.monitor = new URLMonitor({
      timeout: 10000,
      interval: 30000,
      retries: 2
    });
  }
  
  async validateAllUrls() {
    console.log('🔍 Validating all DuoPlus Enterprise URLs...\n');
    
    const allUrls = [
      ...URL_SETS.REGISTRY,
      ...URL_SETS.MONITORING,
      ...URL_SETS.DOCUMENTATION,
      ...URL_SETS.CRITICAL,
      ...URL_SETS.PAYMENT_APIS,
      ...URL_SETS.EXTERNAL_SERVICES,
      ...URL_SETS.TESTING,
      ...URL_SETS.DEVELOPMENT,
      ...URL_SETS.STORAGE,
      ...URL_SETS.CDN,
      ...URL_SETS.WEBSOCKET,
      ...URL_SETS.DATABASE,
      ...URL_SETS.CONFIG
    ];
    
    // Remove duplicates
    const uniqueUrls = [...new Set(allUrls)];
    
    console.log(`📊 Testing ${uniqueUrls.length} unique URLs...\n`);
    
    const results = await this.monitor.checkMultipleHealth(uniqueUrls);
    
    // Group results by status
    const healthy = results.filter(r => r.status === 'healthy');
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    
    // Print results
    console.log(`✅ Healthy URLs (${healthy.length}):`);
    healthy.forEach(result => {
      console.log(`  ✓ ${result.url} (${result.responseTime}ms)`);
    });
    
    if (unhealthy.length > 0) {
      console.log(`\n❌ Unhealthy URLs (${unhealthy.length}):`);
      unhealthy.forEach(result => {
        console.log(`  ✗ ${result.url}`);
        console.log(`    Error: ${result.error}`);
      });
    }
    
    // Summary
    console.log(`\n📈 Summary:`);
    console.log(`  Total: ${results.length}`);
    console.log(`  Healthy: ${healthy.length}`);
    console.log(`  Unhealthy: ${unhealthy.length}`);
    console.log(`  Success Rate: ${((healthy.length / results.length) * 100).toFixed(1)}%`);
    
    return {
      total: results.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      successRate: (healthy.length / results.length) * 100
    };
  }
  
  async validateUrlSet(setName: keyof typeof URL_SETS) {
    console.log(`🔍 Validating URL set: ${setName}...\n`);
    
    const urls = URL_SETS[setName];
    const results = await this.monitor.checkMultipleHealth(urls);
    
    const healthy = results.filter(r => r.status === 'healthy');
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    
    console.log(`📊 Results for ${setName}:`);
    console.log(`  Total: ${results.length}`);
    console.log(`  Healthy: ${healthy.length}`);
    console.log(`  Unhealthy: ${unhealthy.length}`);
    
    if (unhealthy.length > 0) {
      console.log(`\n❌ Unhealthy URLs:`);
      unhealthy.forEach(result => {
        console.log(`  ✗ ${result.url} - ${result.error}`);
      });
    }
    
    return results;
  }
  
  async validateSingleUrl(url: string) {
    console.log(`🔍 Validating: ${url}`);
    
    const result = await this.monitor.checkHealth(url);
    
    if (result.status === 'healthy') {
      console.log(`✅ Healthy (${result.responseTime}ms)`);
    } else {
      console.log(`❌ Unhealthy - ${result.error}`);
    }
    
    return result;
  }
  
  generateUrlReport() {
    console.log('📋 Generating URL organization report...\n');
    
    const report = {
      registry: URLHelper.getAllRegistryUrls(),
      monitoring: URLHelper.getAllMonitoringUrls(),
      documentation: URLHelper.getDocumentationUrls(),
      support: URLHelper.getSupportUrls(),
      packages: {
        core: URLHelper.getPackageUrls('core', '1.0.0'),
        disputes: URLHelper.getPackageUrls('disputes', '1.0.0'),
        monitoring: URLHelper.getPackageUrls('monitoring', '1.0.0')
      },
      environments: {
        production: URLHelper.getDeploymentUrls('production'),
        staging: URLHelper.getDeploymentUrls('staging'),
        development: URLHelper.getDeploymentUrls('development')
      }
    };
    
    console.log('📊 URL Organization Report:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }
  
  testUrlHelper() {
    console.log('🧪 Testing URL Helper utilities...\n');
    
    // Test URL building
    const searchUrl = URLHelper.getSearchUrl('@duoplus/core');
    console.log(`✓ Search URL: ${searchUrl}`);
    
    // Test package URLs
    const packageUrls = URLHelper.getPackageUrls('core', '1.0.0');
    console.log(`✓ Package URLs:`, packageUrls);
    
    // Test URL validation
    const validUrl = URLHelper.isValidUrl('https://duoplus-registry.utahj4754.workers.dev');
    console.log(`✓ URL validation: ${validUrl}`);
    
    // Test URL parsing
    const host = URLHelper.getHost('https://registry.factory-wager.com/health');
    console.log(`✓ URL host: ${host}`);
    
    // Test HTTPS check
    const isHttps = URLHelper.isHttps('https://registry.factory-wager.com');
    console.log(`✓ HTTPS check: ${isHttps}`);
    
    // Test local check
    const isLocal = URLHelper.isLocal('http://localhost:3000');
    console.log(`✓ Local check: ${isLocal}`);
    
    // Test URL joining
    const joined = URLHelper.joinPaths('https://registry.factory-wager.com', 'api', 'v1', 'packages');
    console.log(`✓ URL join: ${joined}`);
    
    // Test URL building with params
    const built = URLHelper.buildUrl('https://registry.factory-wager.com', 'search', { text: '@duoplus/core', limit: '10' });
    console.log(`✓ URL build: ${built}`);
    
    console.log('\n✅ All URL Helper tests passed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];
  
  const validator = new URLValidator();
  
  switch (command) {
    case 'validate':
      if (target) {
        if (target in URL_SETS) {
          await validator.validateUrlSet(target as keyof typeof URL_SETS);
        } else {
          await validator.validateSingleUrl(target);
        }
      } else {
        await validator.validateAllUrls();
      }
      break;
      
    case 'report':
      validator.generateUrlReport();
      break;
      
    case 'test':
      validator.testUrlHelper();
      break;
      
    case 'monitor':
      console.log('🔍 Starting URL monitoring...');
      validator.monitor.startCriticalMonitoring();
      
      // Run initial check
      await validator.monitor.checkMultipleHealth(URL_SETS.CRITICAL);
      
      console.log('✅ Monitoring started. Press Ctrl+C to stop.');
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitoring...');
        validator.monitor.stopAllMonitoring();
        process.exit(0);
      });
      
      // Generate periodic reports
      setInterval(() => {
        const report = validator.monitor.generateReport();
        console.log(report);
      }, 60000); // Every minute
      
      break;
      
    default:
      console.log(`
🔍 DuoPlus URL Validator

Usage: bun run tools/url-validator.ts [command] [target]

Commands:
  validate [target]  - Validate URLs (all URLs, specific set, or single URL)
  report            - Generate URL organization report
  test              - Test URL helper utilities
  monitor           - Start continuous URL monitoring

URL Sets:
  registry          - Registry URLs
  monitoring        - Monitoring URLs
  documentation     - Documentation URLs
  external          - External service URLs
  critical          - Critical URLs
  payment_apis      - Payment API URLs
  external_services - External service URLs
  testing           - Testing URLs
  development       - Development URLs
  storage           - Storage URLs
  cdn               - CDN URLs

Examples:
  bun run tools/url-validator.ts validate
  bun run tools/url-validator.ts validate registry
  bun run tools/url-validator.ts validate https://registry.factory-wager.com
  bun run tools/url-validator.ts report
  bun run tools/url-validator.ts test
  bun run tools/url-validator.ts monitor
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { URLValidator };
