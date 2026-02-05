/**
 * Example: Using BUN_NATIVE_APIS Documentation
 * Demonstrates type-safe access to Bun Native APIs documentation
 */

import { BUN_NATIVE_APIS } from '../constants';
import type { ApiDocEntry, ApiCategory } from '../types/bun-apis';

/**
 * Example 1: Accessing specific API documentation
 */
function demonstrateApiAccess() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 Bun Native APIs Documentation Access Examples');
  console.log('═══════════════════════════════════════════════════════\n');

  // Type-safe access to URLPattern documentation
  const urlPatternDoc: ApiDocEntry = BUN_NATIVE_APIS.ROUTING.URL_PATTERN;
  console.log(`API: ${urlPatternDoc.api}`);
  console.log(`Optimization: ${urlPatternDoc.optimization}`);
  console.log(`Performance: ${urlPatternDoc.performance}`);
  console.log(`Use Case: ${urlPatternDoc.use_case}`);
  console.log(`Security: ${urlPatternDoc.security}`);
  console.log(`Docs: ${urlPatternDoc.documentation}`);
  console.log(`Location: ${urlPatternDoc.code_location}\n`);

  // Access Map documentation
  const mapDoc: ApiDocEntry = BUN_NATIVE_APIS.DATA_STRUCTURES.MAP;
  console.log(`API: ${mapDoc.api}`);
  console.log(`Optimization: ${mapDoc.optimization}`);
  console.log(`Performance: ${mapDoc.performance} (${mapDoc.performance.includes('33x') ? '33x faster!' : 'optimized'})`);
  console.log();

  // Access Bun.serve documentation
  const serveDoc: ApiDocEntry = BUN_NATIVE_APIS.HTTP_NETWORKING.BUN_SERVE;
  console.log(`API: ${serveDoc.api}`);
  console.log(`Optimization: ${serveDoc.optimization}`);
  console.log(`Performance Impact: ${serveDoc.performance}`);
  console.log();
}

/**
 * Example 2: Iterating through all APIs in a category
 */
function demonstrateCategoryIteration() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 Routing APIs Performance Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  const routingApis = BUN_NATIVE_APIS.ROUTING;

  for (const [apiName, apiDoc] of Object.entries(routingApis)) {
    console.log(`${apiName}:`);
    console.log(`  ⚡ ${apiDoc.optimization}`);
    console.log(`  📊 ${apiDoc.performance}`);
    console.log();
  }
}

/**
 * Example 3: Performance comparison table
 */
function demonstratePerformanceComparison() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Performance Optimization Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  const performanceData = [
    {
      category: 'Routing',
      api: BUN_NATIVE_APIS.ROUTING.URL_PATTERN,
      impact: 'Baseline'
    },
    {
      category: 'Data Structures',
      api: BUN_NATIVE_APIS.DATA_STRUCTURES.MAP,
      impact: '33x faster'
    },
    {
      category: 'Data Structures',
      api: BUN_NATIVE_APIS.DATA_STRUCTURES.SWITCH_STATEMENTS,
      impact: '89x faster'
    },
    {
      category: 'HTTP',
      api: BUN_NATIVE_APIS.HTTP_NETWORKING.BUN_SERVE,
      impact: '-14% heap'
    },
    {
      category: 'Security',
      api: BUN_NATIVE_APIS.SECURITY_CRYPTO.CRYPTO_UUID,
      impact: 'CSPRNG'
    },
  ];

  console.table(performanceData.map(item => ({
    Category: item.category,
    API: item.api.api,
    Optimization: item.api.optimization,
    Performance: item.api.performance,
    Impact: item.impact,
  })));
}

/**
 * Example 4: Security features audit
 */
function demonstrateSecurityAudit() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔒 Security Features Audit');
  console.log('═══════════════════════════════════════════════════════\n');

  const securityApis = [
    BUN_NATIVE_APIS.ROUTING.URL_PATTERN,
    BUN_NATIVE_APIS.SECURITY_CRYPTO.CRYPTO_UUID,
    BUN_NATIVE_APIS.SECURITY_CRYPTO.CRYPTO_RANDOM,
    BUN_NATIVE_APIS.HTTP_NETWORKING.HEADERS,
  ];

  securityApis.forEach(api => {
    console.log(`✅ ${api.api}`);
    console.log(`   Security: ${api.security}`);
    console.log(`   Implementation: ${api.implementation}`);
    console.log();
  });
}

/**
 * Example 5: Generate documentation markdown
 */
function generateApiMarkdown(category: ApiCategory): string {
  const categoryApis = BUN_NATIVE_APIS[category];
  let markdown = `# ${category} APIs\n\n`;

  for (const [apiName, apiDoc] of Object.entries(categoryApis)) {
    markdown += `## ${apiDoc.api}\n\n`;
    markdown += `**Optimization:** ${apiDoc.optimization}\n\n`;
    markdown += `**Performance:** ${apiDoc.performance}\n\n`;
    markdown += `**Use Case:** ${apiDoc.use_case}\n\n`;
    markdown += `**Security:** ${apiDoc.security}\n\n`;
    markdown += `**Implementation:** ${apiDoc.implementation}\n\n`;
    markdown += `**Documentation:** [${apiDoc.documentation}](${apiDoc.documentation})\n\n`;
    markdown += `**Code Location:** \`${apiDoc.code_location}\`\n\n`;
    markdown += '---\n\n';
  }

  return markdown;
}

/**
 * Example 6: Validate API documentation completeness
 */
function validateApiDocumentation(): boolean {
  console.log('═══════════════════════════════════════════════════════');
  console.log('✓ Validating API Documentation Completeness');
  console.log('═══════════════════════════════════════════════════════\n');

  let isComplete = true;
  const requiredFields: (keyof ApiDocEntry)[] = [
    'api',
    'optimization',
    'performance',
    'implementation',
    'use_case',
    'security',
    'documentation',
    'code_location'
  ];

  for (const [categoryName, categoryApis] of Object.entries(BUN_NATIVE_APIS)) {
    for (const [apiName, apiDoc] of Object.entries(categoryApis)) {
      for (const field of requiredFields) {
        if (!apiDoc[field] || apiDoc[field].trim() === '') {
          console.log(`❌ ${categoryName}.${apiName}.${field} is missing or empty`);
          isComplete = false;
        }
      }
    }
  }

  if (isComplete) {
    console.log('✅ All API documentation is complete!\n');
  }

  return isComplete;
}

/**
 * Run all examples
 */
export function runExamples() {
  demonstrateApiAccess();
  demonstrateCategoryIteration();
  demonstratePerformanceComparison();
  demonstrateSecurityAudit();

  console.log('═══════════════════════════════════════════════════════');
  console.log('📝 Generated Markdown Documentation (Routing APIs)');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(generateApiMarkdown('ROUTING'));

  validateApiDocumentation();
}

// Run examples if executed directly
if (import.meta.main) {
  runExamples();
}
