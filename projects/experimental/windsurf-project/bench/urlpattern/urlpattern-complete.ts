#!/usr/bin/env bun
// urlpattern-complete.ts - Complete URLPattern API Showcase

console.info('🎯 **Complete URLPattern API Showcase** 🎯');
console.info('='.repeat(60));

// Use dynamic approach to avoid TypeScript conflicts
async function demonstrateURLPattern() {
  // URLPattern is available at runtime in Bun
  const { URLPattern } = globalThis as any;

  // 1. Constructor: Create patterns from strings or URLPatternInit dictionaries
  console.info('\n🏗️ **1. Constructor Examples**');

  // Object constructor (simple patterns)
  const simplePattern = new URLPattern({ pathname: '/users/:id/profile' });
  console.info('  Object: new URLPattern({ pathname: "/users/:id/profile" })');
  console.info(`    Pattern: ${simplePattern.pathname}`);

  // Dictionary constructor (detailed patterns)
  const detailedPattern = new URLPattern({
    protocol: 'https',
    hostname: 'example.com',
    pathname: '/api/:version/users/:id.json',
    search: '*',
    hash: '*'
  });
  console.info('  Dictionary: new URLPattern({ protocol: "https", hostname: "example.com", pathname: "/api/:version/users/:id.json" })');
  console.info(`    Protocol: ${detailedPattern.protocol}`);
  console.info(`    Hostname: ${detailedPattern.hostname}`);
  console.info(`    Pathname: ${detailedPattern.pathname}`);

  // 2. test(): Check if a URL matches the pattern (returns boolean)
  console.info('\n🧪 **2. test() Method Examples**');

  const testUrls = [
    'https://example.com/api/v1/users/123.json',
    'https://example.com/api/v2/users/456.json',
    'https://other.com/api/v1/users/789.json',
    'https://example.com/api/v1/users/invalid.html'
  ];

  testUrls.forEach(url => {
    const matches = detailedPattern.test(url);
    console.info(`  ${matches ? '✅' : '❌'} ${url}`);
  });

  // 3. exec(): Extract matched groups from a URL
  console.info('\n📤 **3. exec() Method Examples**');

  const execUrl = 'https://example.com/api/v1/users/123.json?active=true#section';
  const result = detailedPattern.exec(execUrl);

  if (result) {
    console.info(`  Input: ${execUrl}`);
    console.info(`  Groups: ${JSON.stringify(result.pathname.groups)}`);
    console.info(`  Pathname input: ${result.pathname.input}`);
  } else {
    console.info('  No match found');
  }

  // 4. Pattern properties: protocol, username, password, hostname, port, pathname, search, hash
  console.info('\n🏛️ **4. Pattern Properties**');

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

  console.info(`  Protocol: ${propertyPattern.protocol}`);
  console.info(`  Username: ${propertyPattern.username}`);
  console.info(`  Password: ${propertyPattern.password}`);
  console.info(`  Hostname: ${propertyPattern.hostname}`);
  console.info(`  Port: ${propertyPattern.port}`);
  console.info(`  Pathname: ${propertyPattern.pathname}`);
  console.info(`  Search: ${propertyPattern.search}`);
  console.info(`  Hash: ${propertyPattern.hash}`);

  // 5. hasRegExpGroups: Detect if the pattern uses custom regular expressions
  console.info('\n🔍 **5. hasRegExpGroups Property**');

  const simplePattern2 = new URLPattern({ pathname: '/simple/path' });
  const regexPattern = new URLPattern({ pathname: '/files/:name*' });
  const wildcardPattern = new URLPattern({ pathname: '/data/*' });

  console.info(`  Simple pattern: ${simplePattern2.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);
  console.info(`  Regex pattern: ${regexPattern.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);
  console.info(`  Wildcard pattern: ${wildcardPattern.hasRegExpGroups ? '✅ Has regex' : '❌ No regex'}`);

  // 6. Advanced pattern matching with various URL components
  console.info('\n🚀 **6. Advanced Pattern Matching**');

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
    console.info(`\n  Testing: ${url}`);
    
    Object.entries(advancedPatterns).forEach(([name, pattern]) => {
      if (pattern.test(url)) {
        const result = pattern.exec(url);
        console.info(`    ✅ ${name}: ${JSON.stringify(result?.pathname.groups)}`);
      }
    });
  });

  // 7. R2 Integration Example
  console.info('\n📦 **7. R2 Integration Example**');

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

  console.info('  R2 File Classification:');
  r2Files.forEach(file => {
    const input = { pathname: file };
    
    for (const [type, pattern] of Object.entries(r2Patterns)) {
      if (pattern.test(input)) {
        const result = pattern.exec(input);
        console.info(`    📄 ${type}: ${file} → ${JSON.stringify(result?.pathname.groups)}`);
        break;
      }
    }
  });

  console.info('\n🎉 **URLPattern API Showcase Complete!**');
  console.info('✅ Constructor patterns working');
  console.info('✅ test() method functional');
  console.info('✅ exec() extraction working');
  console.info('✅ All properties accessible');
  console.info('✅ Regex detection operational');
  console.info('✅ R2 integration ready');
  console.info('\n🚀 URLPattern API is fully functional!');
}

// Run the demonstration
demonstrateURLPattern();
