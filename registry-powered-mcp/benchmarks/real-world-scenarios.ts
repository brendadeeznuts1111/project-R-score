#!/usr/bin/env bun

interface Scenario {
  name: string;
  description: string;
  urls: string[];
  urlPattern: URLPatternInit;
  regex: RegExp;
  operations: number;
}

class RealWorldBenchmark {
  private scenarios: Scenario[] = [
    {
      name: 'API Gateway',
      description: 'Routing API requests with versioning',
      urls: [
        'https://api.example.com/v1/users/123',
        'https://api.example.com/v2/products/456',
        'https://api.example.com/v1/orders/789',
        'https://api.example.com/v2/inventory/101',
      ],
      urlPattern: {
        hostname: 'api.example.com',
        pathname: '/:version/users/:id'
      },
      regex: /^https:\/\/api\.example\.com\/(v[12])\/users\/(\d+)$/,
      operations: 50000
    },
    {
      name: 'Static Asset Server',
      description: 'Serving files with cache busting',
      urls: [
        'https://cdn.example.com/assets/main.js?v=abc123',
        'https://cdn.example.com/styles/app.css?v=def456',
        'https://cdn.example.com/images/logo.png?v=ghi789',
      ],
      urlPattern: {
        hostname: 'cdn.example.com',
        pathname: '/assets/:file',
        search: 'v=:version'
      },
      regex: /^https:\/\/cdn\.example\.com\/assets\/([^?]+)\?v=([a-z0-9]+)$/,
      operations: 100000
    },
    {
      name: 'E-commerce Product URLs',
      description: 'Product page URLs with categories',
      urls: [
        'https://shop.example.com/electronics/laptops/apple-macbook-pro',
        'https://shop.example.com/clothing/shirts/formal-white-shirt',
        'https://shop.example.com/home/kitchen/blender-500w',
      ],
      urlPattern: {
        hostname: 'shop.example.com',
        pathname: '/:category/:subcategory/:slug'
      },
      regex: /^https:\/\/shop\.example\.com\/([^/]+)\/([^/]+)\/([^/]+)$/,
      operations: 30000
    },
    {
      name: 'Authentication Callbacks',
      description: 'OAuth2 callback URLs',
      urls: [
        'https://app.example.com/auth/callback?code=abc123&state=xyz789',
        'https://app.example.com/auth/callback?code=def456&state=uvw012',
        'https://app.example.com/auth/callback?code=ghi789&state=rst345',
      ],
      urlPattern: {
        pathname: '/auth/callback',
        search: 'code=:code&state=:state'
      },
      regex: /^https:\/\/app\.example\.com\/auth\/callback\?code=([^&]+)&state=([^&]+)$/,
      operations: 20000
    }
  ];

  async runScenarios() {
    console.log('🌍 Real-World Scenario Benchmarks\n');

    const results: any[] = [];

    for (const scenario of this.scenarios) {
      console.log(`📦 ${scenario.name}`);
      console.log(`   ${scenario.description}`);

      const urlPattern = new URLPattern(scenario.urlPattern);
      const regex = scenario.regex;

      // Warm up
      for (const url of scenario.urls.slice(0, 2)) {
        urlPattern.test(url);
        regex.test(url);
      }

      // Benchmark URLPattern
      const urlPatternStart = performance.now();
      let urlPatternMatches = 0;

      for (let i = 0; i < scenario.operations; i++) {
        const url = scenario.urls[i % scenario.urls.length];
        if (urlPattern.test(url)) {
          urlPatternMatches++;
        }
      }

      const urlPatternDuration = performance.now() - urlPatternStart;

      // Benchmark RegExp
      const regexStart = performance.now();
      let regexMatches = 0;

      for (let i = 0; i < scenario.operations; i++) {
        const url = scenario.urls[i % scenario.urls.length];
        if (regex.test(url)) {
          regexMatches++;
        }
      }

      const regexDuration = performance.now() - regexStart;

      // Calculate results
      const urlPatternOps = (scenario.operations / urlPatternDuration) * 1000;
      const regexOps = (scenario.operations / regexDuration) * 1000;
      const difference = ((urlPatternOps - regexOps) / regexOps) * 100;

      results.push({
        scenario: scenario.name,
        urlPatternOps: Math.round(urlPatternOps),
        regexOps: Math.round(regexOps),
        difference: difference.toFixed(1) + '%',
        faster: urlPatternOps > regexOps ? 'URLPattern' : 'RegExp'
      });

      console.log(`   URLPattern: ${Math.round(urlPatternOps).toLocaleString()} ops/sec`);
      console.log(`   RegExp:     ${Math.round(regexOps).toLocaleString()} ops/sec`);
      console.log(`   Difference: ${urlPatternOps > regexOps ? 'URLPattern' : 'RegExp'} is ${Math.abs(difference).toFixed(1)}% faster\n`);
    }

    this.printSummary(results);
  }

  private printSummary(results: any[]) {
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log('Scenario           | URLPattern   | RegExp       | Faster by');
    console.log('-'.repeat(60));

    for (const result of results) {
      console.log(
        result.scenario.padEnd(18),
        '|',
        result.urlPatternOps.toLocaleString().padEnd(12),
        '|',
        result.regexOps.toLocaleString().padEnd(12),
        '|',
        result.difference
      );
    }

    // Calculate averages
    const avgURLPattern = results.reduce((sum, r) => sum + r.urlPatternOps, 0) / results.length;
    const avgRegExp = results.reduce((sum, r) => sum + r.regexOps, 0) / results.length;
    const overallDifference = ((avgURLPattern - avgRegExp) / avgRegExp) * 100;

    console.log('\n📈 Overall Performance:');
    console.log(`   Average URLPattern: ${Math.round(avgURLPattern).toLocaleString()} ops/sec`);
    console.log(`   Average RegExp:     ${Math.round(avgRegExp).toLocaleString()} ops/sec`);
    console.log(`   Overall difference: ${overallDifference.toFixed(1)}%`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (overallDifference > 0) {
      console.log('✅ URLPattern performs better in real-world scenarios');
      console.log('   Consider using URLPattern for:');
      console.log('   • Production API routing');
      console.log('   • Maintainable codebases');
      console.log('   • TypeScript projects');
    } else {
      console.log('✅ RegExp performs better in real-world scenarios');
      console.log('   Consider using RegExp for:');
      console.log('   • Performance-critical paths');
      console.log('   • Simple pattern matching');
      console.log('   • Legacy codebases');
    }
  }
}

// Run if main
if (import.meta.main) {
  const benchmark = new RealWorldBenchmark();
  await benchmark.runScenarios();
}