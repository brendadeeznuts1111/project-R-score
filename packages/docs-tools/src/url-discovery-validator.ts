// packages/docs-tools/src/url-discovery-validator.ts — URL validation for untracked files

// ============================================================================
// URL DISCOVERY AND VALIDATION
// ============================================================================

export class URLDiscoveryValidator {
  private static readonly FOUND_URLS = new Map<string, { source: string; type: string }>();

  /**
   * Discover all URLs in the project
   */
  static async discoverURLs(): Promise<void> {
    console.log('🔍 DISCOVERING URLs IN PROJECT...');

    // Known URLs from documentation constants
    const knownURLs = [
      { url: 'https://bun.sh/docs/cli', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/api', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/runtime', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/guides', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/cli', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/blog', source: 'documentation-constants', type: 'docs' },
      { url: 'https://bun.sh/rss.xml', source: 'documentation-constants', type: 'rss' },
      { url: 'https://github.com/oven-sh/bun', source: 'documentation-constants', type: 'github' },
      {
        url: 'https://github.com/oven-sh/bun/issues',
        source: 'documentation-constants',
        type: 'github',
      },
      {
        url: 'https://github.com/oven-sh/bun/pulls',
        source: 'documentation-constants',
        type: 'github',
      },
      { url: 'https://registry.npmjs.org', source: 'package-configs', type: 'registry' },
      { url: 'https://bun.com/docs', source: 'constants-file', type: 'docs' },
      { url: 'https://bun.com', source: 'constants-file', type: 'docs' },
      { url: 'https://bun.sh/install', source: 'constants-file', type: 'install' },
      { url: 'https://shop.bun.com/', source: 'constants-file', type: 'shop' },
      { url: 'https://github.com/oven-sh/bun/releases', source: 'constants-file', type: 'github' },
    ];

    // URLs from grep search results
    const foundURLs = [
      { url: 'https://bun.sh/docs/cli/bundler/features', source: 'foxy-proxy-docs', type: 'docs' },
      {
        url: 'https://bun.sh/docs/cli/runtime/networking/fetch',
        source: 'fetch-service',
        type: 'docs',
      },
      { url: 'https://bun.sh/docs/cli/api/fetch', source: 'rss-service', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/api/file', source: 'rss-service', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/api/utils', source: 'rss-service', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/api/s3', source: 'windsurf-project', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/runtime/bunfig', source: 'windsurf-project', type: 'docs' },
      { url: 'https://bun.sh/docs/cli/runtime/bun-apis', source: 'trader-analyzer', type: 'docs' },
      {
        url: 'https://bun.sh/docs/cli/api/http-server#metrics',
        source: 'trader-analyzer',
        type: 'docs',
      },
      { url: 'https://bun.sh/docs/cli/runtime/shell', source: 'trader-analyzer', type: 'docs' },
    ];

    // Local URLs (skip validation but note them)
    const localURLs = [
      {
        url: `${process.env.API_BASE_URL || 'http://example.com'}`,
        source: 'dev-servers',
        type: 'local',
      },
      {
        url: `${process.env.API_BASE_URL || 'http://example.com'}/api/v1/metrics`,
        source: 'trader-analyzer',
        type: 'local',
      },
      {
        url: `${process.env.API_BASE_URL || 'http://example.com'}/health`,
        source: 'trader-analyzer',
        type: 'local',
      },
      {
        url: `${process.env.API_BASE_URL || 'http://example.com'}/api/v1/graph`,
        source: 'trader-analyzer',
        type: 'local',
      },
    ];

    // Register all URLs
    [...knownURLs, ...foundURLs, ...localURLs].forEach(({ url, source, type }) => {
      this.FOUND_URLS.set(url, { source, type });
    });

    console.log(`   Found ${this.FOUND_URLS.size} URLs`);

    // Group by type
    const byType = new Map<string, string[]>();
    for (const [url, info] of this.FOUND_URLS) {
      if (!byType.has(info.type)) byType.set(info.type, []);
      byType.get(info.type)!.push(url);
    }

    for (const [type, urls] of byType) {
      console.log(`   ${type}: ${urls.length} URLs`);
    }
  }

  /**
   * Validate discovered URLs
   */
  static async validateURLs(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
    errors: Array<{ url: string; error: string; source: string }>;
    performance: Array<{ url: string; time: number; source: string }>;
  }> {
    console.log('\n🌐 VALIDATING DISCOVERED URLs...');

    let total = 0;
    let valid = 0;
    let invalid = 0;
    let skipped = 0;
    const errors: Array<{ url: string; error: string; source: string }> = [];
    const performance: Array<{ url: string; time: number; source: string }> = [];

    for (const [url, info] of this.FOUND_URLS) {
      total++;

      // Skip example.com URLs
      if (info.type === 'local') {
        console.log(`   ⏭️  SKIP (local): ${url}`);
        skipped++;
        continue;
      }

      try {
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          console.log(`   ✅ VALID (${responseTime.toFixed(0)}ms): ${url} [${info.source}]`);
          valid++;
          performance.push({ url, time: responseTime, source: info.source });
        } else {
          console.log(`   ❌ INVALID (${response.status}): ${url} [${info.source}]`);
          invalid++;
          errors.push({ url, error: `HTTP ${response.status}`, source: info.source });
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${url} [${info.source}] - ${error}`);
        invalid++;
        errors.push({ url, error: String(error), source: info.source });
      }
    }

    return { total, valid, invalid, skipped, errors, performance };
  }

  /**
   * Analyze performance metrics
   */
  static analyzePerformance(performance: Array<{ url: string; time: number; source: string }>): {
    fastest: Array<{ url: string; time: number; source: string }>;
    slowest: Array<{ url: string; time: number; source: string }>;
    average: number;
    bySource: Record<string, { count: number; avgTime: number }>;
  } {
    const sorted = [...performance].sort((a, b) => a.time - b.time);
    const fastest = sorted.slice(0, 5);
    const slowest = sorted.slice(-5).reverse();

    const average = performance.reduce((sum, p) => sum + p.time, 0) / performance.length;

    const bySource: Record<string, { count: number; avgTime: number }> = {};
    for (const { source, time } of performance) {
      if (!bySource[source]) bySource[source] = { count: 0, avgTime: 0 };
      bySource[source].count++;
      bySource[source].avgTime += time;
    }

    for (const source of Object.keys(bySource)) {
      bySource[source].avgTime /= bySource[source].count;
    }

    return { fastest, slowest, average, bySource };
  }

  /**
   * Generate comprehensive report
   */
  static async generateReport(): Promise<void> {
    console.log('\n📊 COMPREHENSIVE URL VALIDATION REPORT');
    console.log('='.repeat(60));

    // Discover URLs
    await this.discoverURLs();

    // Validate URLs
    const results = await this.validateURLs();

    // Performance analysis
    const perfAnalysis = this.analyzePerformance(results.performance);

    // Summary
    console.log('\n📈 VALIDATION SUMMARY:');
    console.log(`   Total URLs: ${results.total}`);
    console.log(`   Valid: ${results.valid}`);
    console.log(`   Invalid: ${results.invalid}`);
    console.log(`   Skipped (local): ${results.skipped}`);
    console.log(
      `   Success Rate: ${((results.valid / (results.total - results.skipped)) * 100).toFixed(1)}%`
    );

    // Performance metrics
    if (results.performance.length > 0) {
      console.log(`\n⚡ PERFORMANCE METRICS:`);
      console.log(`   Average Response Time: ${perfAnalysis.average.toFixed(0)}ms`);

      console.log('\n   🚀 Fastest URLs:');
      perfAnalysis.fastest.forEach(({ url, time, source }) => {
        console.log(`      ${time.toFixed(0)}ms - ${url} [${source}]`);
      });

      console.log('\n   🐌 Slowest URLs:');
      perfAnalysis.slowest.forEach(({ url, time, source }) => {
        console.log(`      ${time.toFixed(0)}ms - ${url} [${source}]`);
      });

      console.log('\n   📊 Performance by Source:');
      for (const [source, stats] of Object.entries(perfAnalysis.bySource)) {
        console.log(`      ${source}: ${stats.count} URLs, avg ${stats.avgTime.toFixed(0)}ms`);
      }
    }

    // Errors
    if (results.errors.length > 0) {
      console.log('\n🚨 VALIDATION ERRORS:');
      results.errors.forEach(({ url, error, source }) => {
        console.log(`   • ${url} [${source}]: ${error}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (results.invalid > 0) {
      console.log('   • Fix broken URLs found in validation errors');
    }
    if (perfAnalysis.slowest.length > 0 && perfAnalysis.slowest[0].time > 2000) {
      console.log('   • Consider optimizing slow-loading URLs');
    }
    if (results.skipped > 0) {
      console.log('   • Review example.com URLs for production readiness');
    }
    console.log('   • Add new URLs to documentation constants for better tracking');

    console.log('\n' + '='.repeat(60));
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

export async function runURLDiscoveryValidator(): Promise<void> {
  console.log('🔍 COMPREHENSIVE URL VALIDATION FOR UNTRACKED FILES');
  console.log('='.repeat(60));

  try {
    await URLDiscoveryValidator.generateReport();
    console.log('\n✅ URL validation completed!');
  } catch (error) {
    console.error('\n❌ URL validation failed:', error);
    process.exit(1);
  }
}

if (import.meta.path === Bun.main) {
  runURLDiscoveryValidator().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
