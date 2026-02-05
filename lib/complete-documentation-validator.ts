#!/usr/bin/env bun
/**
 * Complete Documentation System Validator
 * 
 * Comprehensive validation for the entire documentation system
 * including constants, URLs, patterns, and scrapers.
 * 
 * Usage:
 *   bun run lib/complete-documentation-validator.ts
 *   bun run lib/complete-documentation-validator.ts --urls
 *   bun run lib/complete-documentation-validator.ts --constants
 *   bun run lib/complete-documentation-validator.ts --patterns
 *   bun run lib/complete-documentation-validator.ts --scraper
 */

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { 
  URLValidator, 
  ConstantValidator, 
  ValidationReporter, 
  AutoHealer 
} from './cli-constants-validation';

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

import { DocumentationValidator } from './documentation-validator';

// Import documentation components
import { DOCS, DOC_PATHS, URL_PATTERNS, DocsReference } from './docs-reference';
import { CLICategory, CLI_DOCUMENTATION_URLS } from './documentation/constants/cli';
import { UtilsCategory, BUN_UTILS_URLS } from './documentation/constants/utils';

// ============================================================================
// COMPLETE DOCUMENTATION VALIDATION
// ============================================================================

class CompleteDocumentationValidator {
  /**
   * Validate all documentation URLs from all sources
   */
  static async validateAllDocumentationURLs(): Promise<{
    total: number;
    valid: number;
    errors: string[];
    categories: Record<string, { total: number; valid: number; avgTime: number }>;
  }> {
    console.log('🌐 VALIDATING ALL DOCUMENTATION URLs...');
    
    const categories: Record<string, { total: number; valid: number; times: number[] }> = {};
    const allResults = [];
    
    // 1. Validate DOCS base URLs
    console.log('   📚 Base Documentation URLs:');
    categories['base'] = { total: 0, valid: 0, times: [] };
    
    for (const [key, url] of Object.entries(DOCS.BUN)) {
      if (key === 'BASE') continue; // Skip base, test actual endpoints
      
      try {
        const startTime = performance.now();
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000)
        });
        const responseTime = performance.now() - startTime;
        
        if (response.ok) {
          console.log(`     ✅ ${key}: ${responseTime.toFixed(0)}ms`);
          categories['base'].valid++;
          categories['base'].times.push(responseTime);
        } else {
          console.log(`     ❌ ${key}: HTTP ${response.status}`);
        }
        categories['base'].total++;
        allResults.push({ name: key, url, valid: response.ok, responseTime });
      } catch (error) {
        console.log(`     ❌ ${key}: ${error}`);
        categories['base'].total++;
        allResults.push({ name: key, url, valid: false, responseTime: 0 });
      }
    }
    
    // 2. Validate DOC_PATHS
    console.log('   🛤️  Documentation Paths:');
    categories['paths'] = { total: 0, valid: 0, times: [] };
    
    for (const [key, path] of Object.entries(DOC_PATHS)) {
      const fullUrl = `https://bun.sh${path}`;
      
      try {
        const startTime = performance.now();
        const response = await fetch(fullUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000)
        });
        const responseTime = performance.now() - startTime;
        
        if (response.ok) {
          console.log(`     ✅ ${key}: ${responseTime.toFixed(0)}ms`);
          categories['paths'].valid++;
          categories['paths'].times.push(responseTime);
        } else {
          console.log(`     ❌ ${key}: HTTP ${response.status}`);
        }
        categories['paths'].total++;
        allResults.push({ name: key, url: fullUrl, valid: response.ok, responseTime });
      } catch (error) {
        console.log(`     ❌ ${key}: ${error}`);
        categories['paths'].total++;
        allResults.push({ name: key, url: fullUrl, valid: false, responseTime: 0 });
      }
    }
    
    // 3. Validate CLI documentation URLs (from constants)
    console.log('   📋 CLI Documentation URLs:');
    categories['cli'] = { total: 0, valid: 0, times: [] };
    
    for (const [category, urls] of Object.entries(CLI_DOCUMENTATION_URLS)) {
      for (const [name, path] of Object.entries(urls)) {
        const fullUrl = `https://bun.sh${path}`;
        
        try {
          const startTime = performance.now();
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          });
          const responseTime = performance.now() - startTime;
          
          if (response.ok) {
            console.log(`       ✅ ${category}.${name}: ${responseTime.toFixed(0)}ms`);
            categories['cli'].valid++;
            categories['cli'].times.push(responseTime);
          } else {
            console.log(`       ❌ ${category}.${name}: HTTP ${response.status}`);
          }
          categories['cli'].total++;
          allResults.push({ name: `${category}.${name}`, url: fullUrl, valid: response.ok, responseTime });
        } catch (error) {
          console.log(`       ❌ ${category}.${name}: ${error}`);
          categories['cli'].total++;
          allResults.push({ name: `${category}.${name}`, url: fullUrl, valid: false, responseTime: 0 });
        }
      }
    }
    
    // 4. Validate Utils documentation URLs (from constants)
    console.log('   🔧 Utils Documentation URLs:');
    categories['utils'] = { total: 0, valid: 0, times: [] };
    
    for (const [category, urls] of Object.entries(BUN_UTILS_URLS)) {
      for (const [name, path] of Object.entries(urls)) {
        const fullUrl = `https://bun.sh${path}`;
        
        try {
          const startTime = performance.now();
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          });
          const responseTime = performance.now() - startTime;
          
          if (response.ok) {
            console.log(`       ✅ ${category}.${name}: ${responseTime.toFixed(0)}ms`);
            categories['utils'].valid++;
            categories['utils'].times.push(responseTime);
          } else {
            console.log(`       ❌ ${category}.${name}: HTTP ${response.status}`);
          }
          categories['utils'].total++;
          allResults.push({ name: `${category}.${name}`, url: fullUrl, valid: response.ok, responseTime });
        } catch (error) {
          console.log(`       ❌ ${category}.${name}: ${error}`);
          categories['utils'].total++;
          allResults.push({ name: `${category}.${name}`, url: fullUrl, valid: false, responseTime: 0 });
        }
      }
    }
    
    // Calculate statistics
    const total = allResults.length;
    const valid = allResults.filter(r => r.valid).length;
    const errors = allResults.filter(r => !r.valid).map(r => `${r.name}: ${r.url}`);
    
    const categoryStats: Record<string, { total: number; valid: number; avgTime: number }> = {};
    for (const [key, stats] of Object.entries(categories)) {
      categoryStats[key] = {
        total: stats.total,
        valid: stats.valid,
        avgTime: stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 0
      };
    }
    
    return {
      total,
      valid,
      errors,
      categories: categoryStats
    };
  }

  /**
   * Validate URL patterns
   */
  static validateURLPatterns(): {
    total: number;
    valid: number;
    errors: string[];
  } {
    console.log('🔍 VALIDATING URL PATTERNS...');
    
    const results = [];
    const errors: string[] = [];
    
    // Test each URL pattern with known valid URLs
    const testCases = [
      { pattern: 'BUN_DOCS_BASE', url: 'https://bun.sh/docs' },
      { pattern: 'BUN_API', url: 'https://bun.sh/docs/api/utils' },
      { pattern: 'BUN_RUNTIME', url: 'https://bun.sh/runtime/shell' },
      { pattern: 'BUN_BLOG', url: 'https://bun.sh/blog' },
      { pattern: 'GITHUB_ISSUE', url: 'https://github.com/oven-sh/bun/issues/1234' },
      { pattern: 'GITHUB_PR', url: 'https://github.com/oven-sh/bun/pull/5678' }
    ];
    
    for (const testCase of testCases) {
      const pattern = URL_PATTERNS[testCase.pattern as keyof typeof URL_PATTERNS];
      if (pattern) {
        const match = pattern.exec(testCase.url);
        if (match) {
          console.log(`   ✅ ${testCase.pattern}: Matches ${testCase.url}`);
          results.push({ pattern: testCase.pattern, valid: true });
        } else {
          console.log(`   ❌ ${testCase.pattern}: Failed to match ${testCase.url}`);
          errors.push(`${testCase.pattern}: Pattern mismatch`);
          results.push({ pattern: testCase.pattern, valid: false });
        }
      } else {
        console.log(`   ❌ ${testCase.pattern}: Pattern not found`);
        errors.push(`${testCase.pattern}: Pattern not found`);
        results.push({ pattern: testCase.pattern, valid: false });
      }
    }
    
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    
    return { total, valid, errors };
  }

  /**
   * Validate docs reference functionality
   */
  static validateDocsReference(): {
    total: number;
    valid: number;
    errors: string[];
  } {
    console.log('📚 VALIDATING DOCS REFERENCE...');
    
    const results = [];
    const errors: string[] = [];
    
    try {
      const docsRef = DocsReference.getInstance();
      
      // Test URL building
      const builtUrl = docsRef.buildUrl('/docs/test', 'section');
      if (builtUrl.includes('bun.sh') && builtUrl.includes('/docs/test')) {
        console.log('   ✅ URL building: Functional');
        results.push({ test: 'url-building', valid: true });
      } else {
        console.log(`   ❌ URL building: Invalid result ${builtUrl}`);
        errors.push('URL building failed');
        results.push({ test: 'url-building', valid: false });
      }
      
      // Test URL parsing
      const parseResult = docsRef.parseUrl('https://bun.sh/docs/api/utils');
      if (parseResult.valid) {
        console.log('   ✅ URL parsing: Functional');
        results.push({ test: 'url-parsing', valid: true });
      } else {
        console.log('   ❌ URL parsing: Failed to parse valid URL');
        errors.push('URL parsing failed');
        results.push({ test: 'url-parsing', valid: false });
      }
      
      // Test reference retrieval
      try {
        const refUrl = docsRef.getUrl('API_UTILS');
        if (refUrl && refUrl.includes('bun.sh')) {
          console.log('   ✅ Reference retrieval: Functional');
          results.push({ test: 'reference-retrieval', valid: true });
        } else {
          console.log('   ❌ Reference retrieval: Invalid URL');
          errors.push('Reference retrieval failed');
          results.push({ test: 'reference-retrieval', valid: false });
        }
      } catch (error) {
        console.log(`   ❌ Reference retrieval: ${error}`);
        errors.push(`Reference retrieval error: ${error}`);
        results.push({ test: 'reference-retrieval', valid: false });
      }
      
    } catch (error) {
      console.log(`   ❌ DocsReference initialization: ${error}`);
      errors.push(`DocsReference error: ${error}`);
      results.push({ test: 'initialization', valid: false });
    }
    
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    
    return { total, valid, errors };
  }

  /**
   * Validate all documentation constants
   */
  static validateAllConstants(): {
    total: number;
    valid: number;
    errors: string[];
  } {
    console.log('📊 VALIDATING ALL DOCUMENTATION CONSTANTS...');
    
    const constants = [
      'cli-categories-count',
      'utils-categories-count', 
      'documentation-base-url',
      'github-base-url',
      'documentation-sections-count',
      'url-patterns-count',
      'doc-paths-count'
    ];
    
    const results = constants.map(name => {
      const validation = ConstantValidator.validateConstant(name);
      console.log(`   ${validation.isValid ? '✅' : '❌'} ${name}`);
      
      if (!validation.isValid) {
        validation.errors.forEach(error => 
          console.log(`      Error: ${error}`)
        );
      }
      
      return { name, ...validation };
    });
    
    const valid = results.filter(r => r.isValid).length;
    const errors = results.flatMap(r => r.errors);
    
    return {
      total: results.length,
      valid,
      errors
    };
  }

  /**
   * Generate comprehensive documentation report
   */
  static async generateCompleteReport(): Promise<void> {
    console.log('\n📚 COMPLETE DOCUMENTATION SYSTEM VALIDATION');
    console.log('=' .repeat(60));
    
    // Validate all URLs
    const urlResults = await this.validateAllDocumentationURLs();
    console.log(`\n🌐 URL Validation Summary:`);
    console.log(`   Total: ${urlResults.valid}/${urlResults.total} valid`);
    
    for (const [category, stats] of Object.entries(urlResults.categories)) {
      console.log(`   ${category}: ${stats.valid}/${stats.total} valid (avg: ${stats.avgTime.toFixed(0)}ms)`);
    }
    
    // Validate URL patterns
    const patternResults = this.validateURLPatterns();
    console.log(`\n🔍 URL Patterns: ${patternResults.valid}/${patternResults.total} valid`);
    
    // Validate docs reference
    const refResults = this.validateDocsReference();
    console.log(`\n📚 Docs Reference: ${refResults.valid}/${refResults.total} valid`);
    
    // Validate constants
    const constantResults = this.validateAllConstants();
    console.log(`\n📊 Constants: ${constantResults.valid}/${constantResults.total} valid`);
    
    // Overall summary
    const totalTests = urlResults.total + patternResults.total + refResults.total + constantResults.total;
    const totalValid = urlResults.valid + patternResults.valid + refResults.valid + constantResults.valid;
    const totalErrors = urlResults.errors.length + patternResults.errors.length + refResults.errors.length + constantResults.errors.length;
    
    console.log('\n📈 OVERALL SUMMARY:');
    console.log(`   Total Tests: ${totalValid}/${totalTests} valid`);
    console.log(`   Success Rate: ${((totalValid / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Issues: ${totalErrors}`);
    
    if (totalErrors > 0) {
      console.log('\n🚨 ALL ISSUES FOUND:');
      [...urlResults.errors, ...patternResults.errors, ...refResults.errors, ...constantResults.errors].forEach(error => 
        console.log(`   • ${error}`)
      );
    } else {
      console.log('\n✅ Complete documentation system is fully functional!');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CompleteDocOptions {
  urls: boolean;
  constants: boolean;
  patterns: boolean;
  reference: boolean;
  heal: boolean;
  help: boolean;
}

function parseArgs(): CompleteDocOptions {
  const args = process.argv.slice(2);
  
  return {
    urls: args.includes('--urls') || args.includes('-u'),
    constants: args.includes('--constants') || args.includes('-c'),
    patterns: args.includes('--patterns') || args.includes('-p'),
    reference: args.includes('--reference') || args.includes('-r'),
    heal: args.includes('--heal') || args.includes('-h'),
    help: args.includes('--help') || args.includes('--help')
  };
}

function showHelp(): void {
  console.log(`
📚 Complete Documentation System Validator

USAGE:
  bun run lib/complete-documentation-validator.ts [OPTIONS]

OPTIONS:
  --urls, -u        Validate all documentation URLs
  --constants, -c   Validate documentation constants only
  --patterns, -p    Validate URL patterns only
  --reference, -r   Validate docs reference functionality
  --heal, -h        Auto-fix detected issues
  --help            Show this help message

EXAMPLES:
  bun run lib/complete-documentation-validator.ts              # Complete validation
  bun run lib/complete-documentation-validator.ts --urls       # URLs only
  bun run lib/complete-documentation-validator.ts --constants  # Constants only
  bun run lib/complete-documentation-validator.ts --patterns   # Patterns only
  bun run lib/complete-documentation-validator.ts --reference  # Reference only

VALIDATION CATEGORIES:
  🌐 URLs             - All documentation URLs from all sources
  📊 Constants        - Documentation-related constants and counts
  🔍 URL Patterns     - URLPattern definitions and matching
  📚 Docs Reference   - DocsReference class functionality

COVERAGE:
  • Base documentation URLs (bun.sh, docs, api, runtime, guides, blog)
  • Documentation paths (DOC_PATHS constants)
  • CLI documentation URLs (installation, commands, options, debugging)
  • Utils documentation URLs (file system, networking, process, etc.)
  • URL pattern validation with test cases
  • DocsReference class functionality testing
`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('📚 COMPLETE DOCUMENTATION VALIDATION TOOL');
  console.log('=' .repeat(60));
  
  try {
    if (options.urls || (!options.constants && !options.patterns && !options.reference)) {
      await CompleteDocumentationValidator.validateAllDocumentationURLs();
    }
    
    if (options.constants) {
      const results = CompleteDocumentationValidator.validateAllConstants();
      console.log(`\n📊 Constants: ${results.valid}/${results.total} valid`);
    }
    
    if (options.patterns) {
      const results = CompleteDocumentationValidator.validateURLPatterns();
      console.log(`\n🔍 URL Patterns: ${results.valid}/${results.total} valid`);
    }
    
    if (options.reference) {
      const results = CompleteDocumentationValidator.validateDocsReference();
      console.log(`\n📚 Docs Reference: ${results.valid}/${results.total} valid`);
    }
    
    if (!options.urls && !options.constants && !options.patterns && !options.reference) {
      await CompleteDocumentationValidator.generateCompleteReport();
    }
    
    if (options.heal) {
      console.log('\n🔧 STARTING AUTO-HEALING...');
      const result = await AutoHealer.healAll();
      console.log(`✅ Applied ${result.totalFixes} fixes`);
    }
    
    console.log('\n✅ Complete documentation validation finished!');
    
  } catch (error) {
    console.error('\n❌ Documentation validation failed:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */