#!/usr/bin/env bun
// urlpattern-simple.ts - Simple URLPattern Demo

console.info('🔍 Testing URLPattern API Features...');

// Use dynamic approach to avoid TypeScript conflicts
async function testURLPattern() {
  // URLPattern is available at runtime in Bun
  const { URLPattern } = globalThis as any;
  
  // Test basic URLPattern creation and matching
  const patterns = {
    appleId: new URLPattern({ pathname: '/apple-ids/:id.json' }),
    reports: new URLPattern({ pathname: '/reports/:type/:date.json' }),
    cache: new URLPattern({ pathname: '/cache/:category/:key.json' })
  };

  console.info('\n📋 Pattern Definitions:');
  Object.entries(patterns).forEach(([name, pattern]) => {
    console.info(`  ${name}: ${pattern.pathname}`);
  });

  console.info('\n🧪 Testing Pattern Matching:');

  const urlTests = [
    { pathname: '/apple-ids/user123.json' },
    { pathname: '/reports/performance/2026-01-12.json' },
    { pathname: '/cache/session/abc123.json' },
    { pathname: '/invalid/file.txt' }
  ];

  urlTests.forEach(urlObj => {
    console.info(`\n📄 Testing: ${urlObj.pathname}`);
    
    Object.entries(patterns).forEach(([name, pattern]) => {
      if (pattern.test(urlObj)) {
        const result = pattern.exec(urlObj);
        console.info(`  ✅ ${name}: ${JSON.stringify(result?.pathname.groups)}`);
      }
    });
  });

  // Test pattern properties
  console.info('\n🏗️ URLPattern Properties:');
  const pattern = patterns.appleId;
  console.info(`  Protocol: ${pattern.protocol}`);
  console.info(`  Username: ${pattern.username}`);
  console.info(`  Password: ${pattern.password}`);
  console.info(`  Hostname: ${pattern.hostname}`);
  console.info(`  Port: ${pattern.port}`);
  console.info(`  Pathname: ${pattern.pathname}`);
  console.info(`  Search: ${pattern.search}`);
  console.info(`  Hash: ${pattern.hash}`);
  console.info(`  Has RegExp Groups: ${pattern.hasRegExpGroups}`);

  console.info('\n✅ URLPattern API test complete!');
}

// Run the test
testURLPattern();
