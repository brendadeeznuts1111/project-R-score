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
import { URL_PATTERNS, docs, validateDocUrl, buildDocsUrl } from '../lib/docs-reference.ts';

/**
 * Example usage with corrected domain
 */
function demonstrateUrlPattern() {
  console.log('=== URLPattern Examples ===');
  
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
    console.log(`\nTesting: ${url}`);
    
    // Using manual pattern
    const match = docsPattern.exec(url);
    if (match) {
      console.log('  ✅ Manual pattern matched:');
      console.log('    Groups:', match.pathname.groups);
      console.log('    Hash groups:', match.hash.groups);
    } else {
      console.log('  ❌ Manual pattern did not match');
    }
    
    // Using our reference system patterns
    let systemMatched = false;
    for (const [name, pattern] of Object.entries(URL_PATTERNS)) {
      const systemMatch = pattern.exec(url);
      if (systemMatch) {
        console.log(`  ✅ System pattern "${name}" matched:`);
        console.log('    Groups:', { 
          ...systemMatch.pathname.groups, 
          ...systemMatch.hash.groups 
        });
        systemMatched = true;
        break;
      }
    }
    
    if (!systemMatched) {
      console.log('  ❌ No system patterns matched');
    }
  });
}

/**
 * Advanced pattern matching with our reference system
 */
function advancedPatternMatching() {
  console.log('\n=== Advanced Pattern Matching ===');
  
  const url = 'https://bun.sh/docs/runtime/binary-data#typedarray';
  
  // Parse with our reference system
  const parsed = docs.parseUrl(url);
  
  console.log(`URL: ${url}`);
  console.log('Parsed result:', parsed);
  
  if (parsed.valid) {
    console.log(`✅ Matched pattern: ${parsed.pattern}`);
    console.log('Extracted groups:', parsed.groups);
  } else {
    console.log('❌ URL did not match any known patterns');
  }
}

/**
 * Validation examples
 */
function validationExamples() {
  console.log('\n=== URL Validation Examples ===');
  
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
    
    console.log(`${url}:`);
    console.log(`  Valid: ${isValid ? '✅' : '❌'}`);
    if (parsed.valid) {
      console.log(`  Pattern: ${parsed.pattern}`);
    }
  });
}

/**
 * Build URLs from patterns
 */
function buildFromPatterns() {
  console.log('\n=== Building URLs from Patterns ===');
  
  // Build documentation URLs
  const runtimeUrl = buildDocsUrl('/docs/runtime/binary-data', 'typedarray');
  const apiUrl = buildDocsUrl('/docs/api/utils');
  const customUrl = buildDocsUrl('/docs/custom/section', 'subsection');
  
  console.log('Built URLs:');
  console.log('  Runtime:', runtimeUrl);
  console.log('  API:', apiUrl);
  console.log('  Custom:', customUrl);
  
  // Verify they match patterns
  console.log('\nVerification:');
  [runtimeUrl, apiUrl, customUrl].forEach(url => {
    const parsed = docs.parseUrl(url);
    console.log(`  ${url}: ${parsed.valid ? '✅' : '❌'} ${parsed.pattern || ''}`);
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
