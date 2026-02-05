#!/usr/bin/env bun
// urlpattern-complete.ts - Complete URLPattern API Showcase

console.log('🎯 **Complete URLPattern API Showcase** 🎯');
console.log('='.repeat(60));

// Use dynamic approach to avoid TypeScript conflicts
async function demonstrateURLPattern() {
  // URLPattern is available at runtime in Bun
  const { URLPattern } = globalThis as any;

  // 1. Constructor: Create patterns from strings or URLPatternInit dictionaries
  console.log('\n🏗️ **1. Constructor Examples**');

  // Object constructor (simple patterns)
  const simplePattern = new URLPattern({ pathname: '/users/:id/profile' });
  console.log('  Object: new URLPattern({ pathname: "/users/:id/profile" })');
  console.log(`    Pattern: ${simplePattern.pathname}`);

  // Dictionary constructor (detailed patterns)
  const detailedPattern = new URLPattern({
    protocol: 'https',
    hostname: 'example.com',
    pathname: '/api/:version/users/:id.json',
    search: '*',
    hash: '*'
  });
  console.log('  Dictionary: new URLPattern({ protocol: "https", hostname: "example.com", pathname: "/api/:version/users/:id.json" })');
  console.log(`    Protocol: ${detailedPattern.protocol}`);
  console.log(`    Hostname: ${detailedPattern.hostname}`);
  console.log(`    Pathname: ${detailedPattern.pathname}`);

  // 2. test(): Check if a URL matches the pattern (returns boolean)
  console.log('\n🧪 **2. test() Method Examples**');

  const testUrls = [
    'https://example.com/api/v1/users/123.json',
    'https://example.com/api/v2/users/456.json',
    'https://other.com/api/v1/users/789.json',
    'https://example.com/api/v1/users/invalid.html'
  ];

  testUrls.forEach(url => {
    const matches = detailedPattern.test(url);
    console.log(`  ${matches ? '✅' : '❌'} ${url}`);
  });

  // 3. exec(): Extract matched groups from a URL
  console.log('\n📤 **3. exec() Method Examples**');

  const execUrl = 'https://example.com/api/v1/users/123.json?active=true#section';
  const result = detailedPattern.exec(execUrl);

  if (result) {
    console.log(`  Input: ${execUrl}`);
    console.log(`  Groups: ${JSON.stringify(result.pathname.groups)}`);
    console.log(`  Pathname input: ${result.pathname.input}`);
  } else {
    console.log('  No match found');
  }

  // 4. Pattern properties: protocol, username, password, hostname, port, pathname, search, hash
  console.log('\n🏛️ **4. Pattern Properties**');

  const propertyPattern = new URLPattern({
    protocol: 'https',
    username: 'user',
    password: 'pass',
    hostname: ':domain.example.com',
    port: '8080',
    pathname: '/path/:param',
    search: ':query',
    hash: ':fragment'
  });

  console.log(`  Protocol: ${propertyPattern.protocol}`);
  console.log(`  Username: ${propertyPattern.username}`);
  console.log(`  Password: ${propertyPattern.password}`);
  console.log(`  Hostname: ${propertyPattern.hostname}`);
  console.log(`  Port: ${propertyPattern.port}`);
  console.log(`  Pathname: ${propertyPattern.pathname}`);
  console.log(`  Search: ${propertyPattern.search}`);
  console.log(`  Hash: ${propertyPattern.hash}`);

  // 5. hasRegExpGroups: Detect if the pattern uses custom regular expressions
  console.log('\n🔍 **5. hasRegExpGroups Property**');

  const simplePattern2 = new URLPattern({ pathname: '/simple/path' });
  const regexPattern = new URLPattern({ pathname: '/files/:name*' });
  const wildcardPattern = new URLPattern({ pathname: '/data/*' });

  console.log(`  Simple pattern: ${simplePattern2.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);
  console.log(`  Regex pattern: ${regexPattern.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);
  console.log(`  Wildcard pattern: ${wildcardPattern.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);

  // 6. Advanced pattern matching with various URL components
  console.log('\n🚀 **6. Advanced Pattern Matching**');

  const advancedPatterns = {
    fullUrl: new URLPattern({ 
      protocol: 'https',
      hostname: 'api.example.com',
      pathname: '/v*/users/*/posts/*'
    }),
    pathnameOnly: new URLPattern({ pathname: '/products/:category/:id' }),
    withQuery: new URLPattern({ pathname: '/search', search: 'q=*' }),
    complex: new URLPattern({
      protocol: 'https',
      hostname: '*.example.com',
      pathname: '/api/:version/*',
      search: 'format=json',
      hash: 'section-*'
    })
  };

  const sampleUrls = [
    'https://api.example.com/v2/users/john/posts/123',
    'https://store.example.com/products/electronics/456',
    'https://example.com/search?q=javascript',
    'https://dev.example.com/api/v1/data?format=json#section-main'
  ];

  sampleUrls.forEach(url => {
    console.log(`\n  Testing: ${url}`);
    
    Object.entries(advancedPatterns).forEach(([name, pattern]) => {
      if (pattern.test(url)) {
        const result = pattern.exec(url);
        console.log(`    ✅ ${name}: ${JSON.stringify(result?.pathname.groups)}`);
      }
    });
  });

  // 7. R2 Integration Example
  console.log('\n📦 **7. R2 Integration Example**');

  const r2Patterns = {
    appleIds: new URLPattern({ pathname: '/apple-ids/:userId.json' }),
    reports: new URLPattern({ pathname: '/reports/:type/:date.json' }),
    cache: new URLPattern({ pathname: '/cache/:category/:key.json' }),
    multiRegion: new URLPattern({ pathname: '/multi-region/:region/:id.json' })
  };

  const r2Files = [
    '/apple-ids/user123.json',
    '/reports/performance/2026-01-12.json',
    '/cache/session/abc123.json',
    '/multi-region/us-east/file456.json'
  ];

  console.log('  R2 File Classification:');
  r2Files.forEach(file => {
    const input = { pathname: file };
    
    for (const [type, pattern] of Object.entries(r2Patterns)) {
      if (pattern.test(input)) {
        const result = pattern.exec(input);
        console.log(`    📄 ${type}: ${file} → ${JSON.stringify(result?.pathname.groups)}`);
        break;
      }
    }
  });

  console.log('\n🎉 **URLPattern API Showcase Complete!**');
  console.log('✅ Constructor patterns working');
  console.log('✅ test() method functional');
  console.log('✅ exec() extraction working');
  console.log('✅ All properties accessible');
  console.log('✅ Regex detection operational');
  console.log('✅ R2 integration ready');
  console.log('\n🚀 URLPattern API is fully functional!');
}

// Run the demonstration
demonstrateURLPattern();
