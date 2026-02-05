#!/usr/bin/env bun

/**
 * Fire22 DNS Performance Testing Script
 *
 * Tests DNS caching performance with different TTL configurations
 * Validates Fire22 integration DNS optimization
 */

import { dns } from 'bun';
import { Fire22Integration } from '../src/fire22-integration';

interface DNSTestResult {
  ttl: number;
  verboseMode: string;
  testRuns: number;
  results: {
    avgResponseTime: number;
    cacheHitRate: number;
    totalOperations: number;
    errors: number;
    cacheSize: number;
  };
  domains: {
    fire22: number;
    database: number;
  };
}

class DNSPerformanceTester {
  private testEnv = {
    NODE_ENV: 'development',
    FIRE22_DEMO_MODE: 'true',
    DATABASE_URL: 'postgresql://test@localhost:5432/test',
  };

  /**
   * Run comprehensive DNS performance tests
   */
  async runPerformanceTests(): Promise<void> {
    console.log('🧪 Fire22 DNS Performance Testing Suite');
    console.log('='.repeat(60));

    // Test different TTL configurations
    const ttlConfigs = [5, 30, 60];
    const verboseModes = ['false', 'true', 'curl'];

    const results: DNSTestResult[] = [];

    for (const ttl of ttlConfigs) {
      for (const verbose of verboseModes) {
        console.log(`\n🔬 Testing TTL=${ttl}s, Verbose=${verbose}`);
        const result = await this.testConfiguration(ttl, verbose);
        results.push(result);

        // Add delay between tests to avoid overwhelming DNS
        await this.sleep(2000);
      }
    }

    this.printSummaryReport(results);
    await this.testRealWorldScenarios();
  }

  /**
   * Test specific DNS configuration
   */
  private async testConfiguration(ttl: number, verboseMode: string): Promise<DNSTestResult> {
    // Set environment variables
    process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = ttl.toString();
    process.env.BUN_CONFIG_VERBOSE_FETCH = verboseMode;

    const fire22 = new Fire22Integration(this.testEnv);
    const testRuns = 5;
    const responseTimes: number[] = [];

    // Warm up DNS cache
    await fire22.refreshDnsCache();

    // Run multiple test iterations
    for (let i = 0; i < testRuns; i++) {
      const startTime = Date.now();

      try {
        // Simulate Fire22 API operations
        await this.simulateApiCalls(fire22);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        console.log(`  Run ${i + 1}/${testRuns}: ${endTime - startTime}ms`);
      } catch (error) {
        console.warn(`  Run ${i + 1}/${testRuns}: Error - ${error.message}`);
        responseTimes.push(999999); // High value for error cases
      }
    }

    const finalStats = fire22.getDnsStats();

    return {
      ttl,
      verboseMode,
      testRuns,
      results: {
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        cacheHitRate:
          finalStats.totalCount > 0
            ? (finalStats.cacheHitsCompleted / finalStats.totalCount) * 100
            : 0,
        totalOperations: finalStats.totalCount,
        errors: finalStats.errors,
        cacheSize: finalStats.cacheSize,
      },
      domains: {
        fire22: finalStats.domains.length,
        database: finalStats.databaseDomains.length,
      },
    };
  }

  /**
   * Simulate Fire22 API calls for testing
   */
  private async simulateApiCalls(fire22: Fire22Integration): Promise<void> {
    try {
      // Test authorization check (demo mode)
      await fire22.getAuthorizations('BLAKEPPH');

      // Test customer data retrieval (demo mode)
      await fire22.getCustomersWithPermissions('BLAKEPPH', 1, 10);

      // Get DNS stats to trigger cache operations
      fire22.getDnsStats();

      // Test debugging configuration
      fire22.getDebuggingConfig();
    } catch (error) {
      // Expected in demo mode, just for timing tests
      console.log(`   Demo mode simulation: ${error.message}`);
    }
  }

  /**
   * Print comprehensive test results
   */
  private printSummaryReport(results: DNSTestResult[]): void {
    console.log('\n📊 DNS Performance Test Results');
    console.log('='.repeat(60));

    // Group by TTL
    const ttlGroups = results.reduce(
      (groups, result) => {
        const key = result.ttl;
        if (!groups[key]) groups[key] = [];
        groups[key].push(result);
        return groups;
      },
      {} as Record<number, DNSTestResult[]>
    );

    for (const [ttl, ttlResults] of Object.entries(ttlGroups)) {
      console.log(`\n🕒 TTL: ${ttl} seconds`);

      ttlResults.forEach(result => {
        const hitRate = result.results.cacheHitRate.toFixed(1);
        const avgTime = result.results.avgResponseTime.toFixed(0);

        console.log(
          `  ${result.verboseMode.padEnd(5)}: ${avgTime}ms avg, ${hitRate}% cache hit, ${result.results.totalOperations} ops`
        );
      });

      // Find best performer for this TTL
      const bestResult = ttlResults.reduce((best, current) =>
        current.results.avgResponseTime < best.results.avgResponseTime ? current : best
      );

      console.log(
        `  🏆 Best: ${bestResult.verboseMode} mode (${bestResult.results.avgResponseTime.toFixed(0)}ms)`
      );
    }

    // Overall recommendations
    console.log('\n💡 Performance Recommendations:');

    const overallBest = results.reduce((best, current) =>
      current.results.avgResponseTime < best.results.avgResponseTime ? current : best
    );

    console.log(
      `  • Optimal configuration: TTL=${overallBest.ttl}s, Verbose=${overallBest.verboseMode}`
    );
    console.log(
      `  • Best performance: ${overallBest.results.avgResponseTime.toFixed(0)}ms average`
    );
    console.log(
      `  • Best cache hit rate: ${Math.max(...results.map(r => r.results.cacheHitRate)).toFixed(1)}%`
    );

    // Environment-specific recommendations
    console.log('\n🔧 Environment Configuration Recommendations:');
    console.log('  Development:');
    console.log('    BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5');
    console.log('    BUN_CONFIG_VERBOSE_FETCH=true');
    console.log('  Production:');
    console.log('    BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=30');
    console.log('    BUN_CONFIG_VERBOSE_FETCH=false');
    console.log('  High-Performance:');
    console.log('    BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=60');
    console.log('    BUN_CONFIG_VERBOSE_FETCH=false');
  }

  /**
   * Test real-world Fire22 integration scenarios
   */
  private async testRealWorldScenarios(): Promise<void> {
    console.log('\n🌐 Real-World Scenario Testing');
    console.log('='.repeat(60));

    // Test cold start scenario
    console.log('\n❄️ Cold Start Test:');
    process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = '30';

    const coldStartTime = Date.now();
    const fire22Cold = new Fire22Integration(this.testEnv);
    const coldStats = fire22Cold.getDnsStats();
    console.log(`  Cold start time: ${Date.now() - coldStartTime}ms`);
    console.log(
      `  Domains prefetched: Fire22=${coldStats.domains.length}, DB=${coldStats.databaseDomains.length}`
    );

    // Test warm cache performance
    console.log('\n🔥 Warm Cache Test:');
    const warmStartTime = Date.now();

    for (let i = 0; i < 3; i++) {
      await this.simulateApiCalls(fire22Cold);
    }

    const warmStats = fire22Cold.getDnsStats();
    console.log(`  Warm cache operations: ${Date.now() - warmStartTime}ms for 3 rounds`);
    console.log(`  Cache efficiency: ${warmStats.cacheSize > 0 ? 'Active' : 'Inactive'}`);
    console.log(`  Total operations: ${warmStats.totalCount}`);

    // Test cache refresh
    console.log('\n🔄 Cache Refresh Test:');
    const refreshStartTime = Date.now();
    await fire22Cold.refreshDnsCache();
    console.log(`  Cache refresh time: ${Date.now() - refreshStartTime}ms`);

    // Test verbose fetch modes
    console.log('\n🔍 Verbose Fetch Mode Test:');
    fire22Cold.enableVerboseFetch('curl');
    console.log('  Enabled curl mode - check console for curl commands');

    await this.simulateApiCalls(fire22Cold);

    fire22Cold.disableVerboseFetch();
    console.log('  Disabled verbose fetch');
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test Bun DNS API availability
   */
  async testBunDnsApi(): Promise<void> {
    console.log('\n🔬 Bun DNS API Compatibility Test');
    console.log('-'.repeat(40));

    try {
      const stats = dns.getCacheStats();
      console.log('✅ dns.getCacheStats() available');
      console.log(`   Current stats:`, stats);
    } catch (error) {
      console.log('❌ dns.getCacheStats() unavailable:', error.message);
    }

    try {
      // Test DNS prefetch if available
      if (dns.prefetch) {
        await dns.prefetch('fire22.ag');
        console.log('✅ dns.prefetch() available and working');
      } else {
        console.log('⚠️ dns.prefetch() not available');
      }
    } catch (error) {
      console.log('❌ dns.prefetch() failed:', error.message);
    }

    // Test environment variable reading
    const ttl = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || 'not set';
    const verbose = process.env.BUN_CONFIG_VERBOSE_FETCH || 'not set';

    console.log('📋 Environment Variables:');
    console.log(`   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS: ${ttl}`);
    console.log(`   BUN_CONFIG_VERBOSE_FETCH: ${verbose}`);
  }
}

// Run the test suite
async function runTests() {
  console.log('🚀 Starting Fire22 DNS Performance Test Suite\n');

  const tester = new DNSPerformanceTester();

  try {
    await tester.testBunDnsApi();
    await tester.runPerformanceTests();

    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review performance recommendations above');
    console.log('   2. Update wrangler.toml with optimal DNS TTL settings');
    console.log('   3. Test in production environment');
    console.log('   4. Monitor DNS cache hit rates via /api/fire22/dns-stats');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await runTests();
}

export { DNSPerformanceTester };
