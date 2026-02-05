#!/usr/bin/env bun
// urlpattern-simple.ts - Simple URLPattern Demo

console.log('🔍 Testing URLPattern API Features...');

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

  console.log('\n📋 Pattern Definitions:');
  Object.entries(patterns).forEach(([name, pattern]) => {
    console.log(`  ${name}: ${pattern.pathname}`);
  });

  console.log('\n🧪 Testing Pattern Matching:');

  const urlTests = [
    { pathname: '/apple-ids/user123.json' },
    { pathname: '/reports/performance/2026-01-12.json' },
    { pathname: '/cache/session/abc123.json' },
    { pathname: '/invalid/file.txt' }
  ];

  urlTests.forEach(urlObj => {
    console.log(`\n📄 Testing: ${urlObj.pathname}`);
    
    Object.entries(patterns).forEach(([name, pattern]) => {
      if (pattern.test(urlObj)) {
        const result = pattern.exec(urlObj);
        console.log(`  ✅ ${name}: ${JSON.stringify(result?.pathname.groups)}`);
      }
    });
  });

  // Test pattern properties
  console.log('\n🏗️ URLPattern Properties:');
  const pattern = patterns.appleId;
  console.log(`  Protocol: ${pattern.protocol}`);
  console.log(`  Username: ${pattern.username}`);
  console.log(`  Password: ${pattern.password}`);
  console.log(`  Hostname: ${pattern.hostname}`);
  console.log(`  Port: ${pattern.port}`);
  console.log(`  Pathname: ${pattern.pathname}`);
  console.log(`  Search: ${pattern.search}`);
  console.log(`  Hash: ${pattern.hash}`);
  console.log(`  Has RegExp Groups: ${pattern.hasRegExpGroups}`);

  console.log('\n✅ URLPattern API test complete!');
}

// Run the test
testURLPattern();
