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
  console.info('═══════════════════════════════════════════════════════');
  console.info('📚 Bun Native APIs Documentation Access Examples');
  console.info('═══════════════════════════════════════════════════════\n');

  // Type-safe access to URLPattern documentation
  const urlPatternDoc: ApiDocEntry = BUN_NATIVE_APIS.ROUTING.URL_PATTERN;
  console.info(`API: ${urlPatternDoc.api}`);
  console.info(`Optimization: ${urlPatternDoc.optimization}`);
  console.info(`Performance: ${urlPatternDoc.performance}`);
  console.info(`Use Case: ${urlPatternDoc.use_case}`);
  console.info(`Security: ${urlPatternDoc.security}`);
  console.info(`Docs: ${urlPatternDoc.documentation}`);
  console.info(`Location: ${urlPatternDoc.code_location}\n`);

  // Access Map documentation
  const mapDoc: ApiDocEntry = BUN_NATIVE_APIS.DATA_STRUCTURES.MAP;
  console.info(`API: ${mapDoc.api}`);
  console.info(`Optimization: ${mapDoc.optimization}`);
  console.info(`Performance: ${mapDoc.performance} (${mapDoc.performance.includes('33x') ? '33x faster!' : 'optimized'})`);
  console.info();

  // Access Bun.serve documentation
  const serveDoc: ApiDocEntry = BUN_NATIVE_APIS.HTTP_NETWORKING.BUN_SERVE;
  console.info(`API: ${serveDoc.api}`);
  console.info(`Optimization: ${serveDoc.optimization}`);
  console.info(`Performance Impact: ${serveDoc.performance}`);
  console.info();
}

/**
 * Example 2: Iterating through all APIs in a category
 */
function demonstrateCategoryIteration() {
  console.info('═══════════════════════════════════════════════════════');
  console.info('🔍 Routing APIs Performance Summary');
  console.info('═══════════════════════════════════════════════════════\n');

  const routingApis = BUN_NATIVE_APIS.ROUTING;

  for (const [apiName, apiDoc] of Object.entries(routingApis)) {
    console.info(`${apiName}:`);
    console.info(`  ⚡ ${apiDoc.optimization}`);
    console.info(`  📊 ${apiDoc.performance}`);
    console.info();
  }
}

/**
 * Example 3: Performance comparison table
 */
function demonstratePerformanceComparison() {
  console.info('═══════════════════════════════════════════════════════');
  console.info('📊 Performance Optimization Summary');
  console.info('═══════════════════════════════════════════════════════\n');

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
  console.info('═══════════════════════════════════════════════════════');
  console.info('🔒 Security Features Audit');
  console.info('═══════════════════════════════════════════════════════\n');

  const securityApis = [
    BUN_NATIVE_APIS.ROUTING.URL_PATTERN,
    BUN_NATIVE_APIS.SECURITY_CRYPTO.CRYPTO_UUID,
    BUN_NATIVE_APIS.SECURITY_CRYPTO.CRYPTO_RANDOM,
    BUN_NATIVE_APIS.HTTP_NETWORKING.HEADERS,
  ];

  securityApis.forEach(api => {
    console.info(`✅ ${api.api}`);
    console.info(`   Security: ${api.security}`);
    console.info(`   Implementation: ${api.implementation}`);
    console.info();
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
  console.info('═══════════════════════════════════════════════════════');
  console.info('✓ Validating API Documentation Completeness');
  console.info('═══════════════════════════════════════════════════════\n');

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
          console.info(`❌ ${categoryName}.${apiName}.${field} is missing or empty`);
          isComplete = false;
        }
      }
    }
  }

  if (isComplete) {
    console.info('✅ All API documentation is complete!\n');
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

  console.info('═══════════════════════════════════════════════════════');
  console.info('📝 Generated Markdown Documentation (Routing APIs)');
  console.info('═══════════════════════════════════════════════════════\n');
  console.info(generateApiMarkdown('ROUTING'));

  validateApiDocumentation();
}

// Run examples if executed directly
if (import.meta.main) {
  runExamples();
}
