/**
 * URLPattern Example - Corrected Domain
 * 
 * Demonstrates proper URLPattern usage with the correct Bun documentation domain
 */

// ✅ CORRECT DOMAIN - Use bun.sh
const docsPattern = new URLPattern({
  protocol: 'https',
  hostname: 'bun.sh',  // Correct domain!
  pathname: '/docs/:section/:subpath*'
});

// ✅ EVEN BETTER: Use our established patterns
import { URL_PATTERNS, docs, validateDocUrl, buildDocsUrl } from '../../lib/docs/reference.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

/**
 * Example usage with corrected domain
 */
function demonstrateUrlPattern() {
  console.info('=== URLPattern Examples ===');
  
  // Test URLs
  const testUrls = [
    'https://bun.sh/docs/runtime/binary-data',
    'https://bun.sh/docs/api/utils',
    'https://bun.sh/docs/cli/bunx',
    'https://bun.sh/docs/guides/performance',
    'https://bun.sh/install',  // Should not match docs pattern
    'https://bun.sh/blog'      // Should not match docs pattern
  ];
  
  testUrls.forEach(url => {
    console.info(`\nTesting: ${url}`);
    
    // Using manual pattern
    const match = docsPattern.exec(url);
    if (match) {
      console.info('  ✅ Manual pattern matched:');
      console.info('    Groups:', match.pathname.groups);
      console.info('    Hash groups:', match.hash.groups);
    } else {
      console.info('  ❌ Manual pattern did not match');
    }
    
    // Using our reference system patterns
    let systemMatched = false;
    for (const [name, pattern] of Object.entries(URL_PATTERNS)) {
      const systemMatch = pattern.exec(url);
      if (systemMatch) {
        console.info(`  ✅ System pattern "${name}" matched:`);
        console.info('    Groups:', { 
          ...systemMatch.pathname.groups, 
          ...systemMatch.hash.groups 
        });
        systemMatched = true;
        break;
      }
    }
    
    if (!systemMatched) {
      console.info('  ❌ No system patterns matched');
    }
  });
}

/**
 * Advanced pattern matching with our reference system
 */
function advancedPatternMatching() {
  console.info('\n=== Advanced Pattern Matching ===');
  
  const url = 'https://bun.sh/docs/runtime/binary-data#typedarray';
  
  // Parse with our reference system
  const parsed = docs.parseUrl(url);
  
  console.info(`URL: ${url}`);
  console.info('Parsed result:', parsed);
  
  if (parsed.valid) {
    console.info(`✅ Matched pattern: ${parsed.pattern}`);
    console.info('Extracted groups:', parsed.groups);
  } else {
    console.info('❌ URL did not match any known patterns');
  }
}

/**
 * Validation examples
 */
function validationExamples() {
  console.info('\n=== URL Validation Examples ===');
  
  const urls = [
    'https://bun.sh/docs/runtime/binary-data',
    'https://bun.sh/docs/api/utils',
    'https://bun.sh/install',
    'https://bun.sh/blog',
    'https://github.com/oven-sh/bun/issues/1234'
  ];
  
  urls.forEach(url => {
    const isValid = validateDocUrl(url);
    const parsed = docs.parseUrl(url);
    
    console.info(`${url}:`);
    console.info(`  Valid: ${isValid ? '✅' : '❌'}`);
    if (parsed.valid) {
      console.info(`  Pattern: ${parsed.pattern}`);
    }
  });
}

/**
 * Build URLs from patterns
 */
function buildFromPatterns() {
  console.info('\n=== Building URLs from Patterns ===');
  
  // Build documentation URLs
  const runtimeUrl = buildDocsUrl('/docs/runtime/binary-data', 'typedarray');
  const apiUrl = buildDocsUrl('/docs/api/utils');
  const customUrl = buildDocsUrl('/docs/custom/section', 'subsection');
  
  console.info('Built URLs:');
  console.info('  Runtime:', runtimeUrl);
  console.info('  API:', apiUrl);
  console.info('  Custom:', customUrl);
  
  // Verify they match patterns
  console.info('\nVerification:');
  [runtimeUrl, apiUrl, customUrl].forEach(url => {
    const parsed = docs.parseUrl(url);
    console.info(`  ${url}: ${parsed.valid ? '✅' : '❌'} ${parsed.pattern || ''}`);
  });
}

// Run all examples
demonstrateUrlPattern();
advancedPatternMatching();
validationExamples();
buildFromPatterns();

/**
 * Key Takeaways:
 * 
 * 1. ✅ Always use 'bun.sh' domain (not 'bun.com')
 * 2. ✅ Use our established URL_PATTERNS for consistency
 * 3. ✅ Leverage docs.parseUrl() for structured parsing
 * 4. ✅ Use validateDocUrl() for validation
 * 5. ✅ Build URLs with buildDocsUrl() for consistency
 */
