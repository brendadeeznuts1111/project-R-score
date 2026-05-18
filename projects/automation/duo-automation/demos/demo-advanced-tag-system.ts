#!/usr/bin/env bun

/**
 * 🏷️ Advanced Tag System Demonstration
 * 
 * Shows the complete structured tag format implementation:
 * [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]
 */

import { AdvancedTagSystem } from './scripts/tag-system.ts';

console.info('🏷️  Advanced Tag System - Complete Demonstration');
console.info('================================================\n');

const tagSystem = new AdvancedTagSystem();

console.info('📋 STRUCTURED TAG FORMAT');
console.info('========================');
console.info('[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]\n');

console.info('🔧 COMPONENT BREAKDOWN');
console.info('=======================');
console.info('• DOMAIN: Required - High-level categorization (CORE, CLI, DOCS, etc.)');
console.info('• SCOPE: Optional - Execution scope (SYSTEM, USER, DEV, PROD, etc.)');
console.info('• TYPE: Required - File type (TYPESCRIPT, JAVASCRIPT, JSON, etc.)');
console.info('• META: Optional - Key-value metadata (version=1.0, timeout=5000)');
console.info('• CLASS: Optional - Priority/importance (CRITICAL, HIGH, MEDIUM, etc.)');
console.info('• #REF: Optional - Cross-references to other artifacts');
console.info('• BUN-NATIVE: Optional - Flag for Bun-specific optimizations\n');

console.info('📊 EXAMPLE TAGS');
console.info('===============');
const examples = [
  '[CORE][SYSTEM][TYPESCRIPT][META:version=1.0][CRITICAL][BUN-NATIVE]',
  '[CLI][USER][JAVASCRIPT][HIGH]',
  '[DOCS][GLOBAL][MARKDOWN][#REF:README]',
  '[SCRIPTS][DEV][TYPESCRIPT][META:timeout=5000][MEDIUM]',
  '[SECURITY][PROD][JSON][CRITICAL][#REF:config][#REF:secrets]',
  '[TESTS][MODULE][TYPESCRIPT][META:coverage=95][HIGH][#REF:unit-tests]',
  '[INFRASTRUCTURE][GLOBAL][YAML][CRITICAL][#REF:docker-compose]',
  '[MONITORING][PROD][JAVASCRIPT][META:interval=60][MEDIUM][BUN-NATIVE]'
];

examples.forEach((example, index) => {
  console.info(`${index + 1}. ${example}`);
});

console.info('\n🔍 TAG PARSING DEMONSTRATION');
console.info('=============================');

const complexTag = '[CORE][SYSTEM][TYPESCRIPT][META:version=1.2.3][META:author=dev-team][CRITICAL][#REF:bootstrap][#REF:config][BUN-NATIVE]';
console.info(`Parsing: ${complexTag}\n`);

const parseResult = tagSystem.parseTag(complexTag);
if (parseResult.success) {
  console.info('✅ Parse successful!');
  console.info('Components:');
  console.info(`  • Domain: ${parseResult.tag!.domain}`);
  console.info(`  • Scope: ${parseResult.tag!.scope}`);
  console.info(`  • Type: ${parseResult.tag!.type}`);
  console.info(`  • Class: ${parseResult.tag!.class}`);
  console.info(`  • Bun-Native: ${parseResult.tag!.bunNative}`);
  console.info(`  • Metadata: ${JSON.stringify(parseResult.tag!.metadata, null, 4)}`);
  console.info(`  • References: ${JSON.stringify(parseResult.tag!.references, null, 4)}`);
} else {
  console.info('❌ Parse failed:', parseResult.error);
}

console.info('\n🛡️  TAG VALIDATION DEMONSTRATION');
console.info('===============================');

const testTags = [
  '[CORE][SYSTEM][TYPESCRIPT][CRITICAL][BUN-NATIVE]',  // Valid
  '[INVALID][SYSTEM][TYPESCRIPT]',                     // Invalid domain
  '[CORE][INVALID_SCOPE][TYPESCRIPT]',                 // Invalid scope
  '[CORE][SYSTEM][INVALID_TYPE]',                      // Invalid type
  '[CORE][SYSTEM][TYPESCRIPT][INVALID_CLASS]'          // Invalid class
];

testTags.forEach((tag, index) => {
  console.info(`\n${index + 1}. Testing: ${tag}`);
  const result = tagSystem.parseTag(tag);
  if (result.success) {
    const validation = tagSystem.validateTag(result.tag!);
    console.info(`   Result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (validation.errors.length > 0) {
      validation.errors.forEach(error => console.info(`   ❌ Error: ${error}`));
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.info(`   ⚠️  Warning: ${warning}`));
    }
    if (validation.suggestions.length > 0) {
      validation.suggestions.forEach(suggestion => console.info(`   💡 Suggestion: ${suggestion}`));
    }
  } else {
    console.info(`   ❌ Parse Error: ${result.error}`);
  }
});

console.info('\n🏗️  TAG GENERATION DEMONSTRATION');
console.info('===============================');

const components = [
  { domain: 'CORE', type: 'TYPESCRIPT', class: 'CRITICAL', bunNative: true },
  { domain: 'CLI', scope: 'USER', type: 'JAVASCRIPT', class: 'HIGH' },
  { domain: 'DOCS', scope: 'GLOBAL', type: 'MARKDOWN', references: ['README', 'GUIDE'] },
  { domain: 'SCRIPTS', scope: 'DEV', type: 'TYPESCRIPT', metadata: { timeout: 5000, retry: 3 }, class: 'MEDIUM' }
];

components.forEach((component, index) => {
  const generatedTag = tagSystem.generateTag(component);
  console.info(`${index + 1.} Input:  ${JSON.stringify(component)}`);
  console.info(`   Output: ${generatedTag}\n`);
});

console.info('🔍 SEARCH DEMONSTRATION');
console.info('=======================');

const searchCriteria = [
  { domain: 'CORE' },
  { type: 'TYPESCRIPT', bunNative: true },
  { class: 'CRITICAL' },
  { hasMetadata: 'version' },
  { hasReference: 'config' }
];

searchCriteria.forEach((criteria, index) => {
  console.info(`${index + 1}. Search criteria: ${JSON.stringify(criteria)}`);
  const results = tagSystem.searchByTags(criteria);
  console.info(`   Results: ${results.length} found`);
  results.forEach(result => console.info(`   • ${result}`));
  console.info();
});

console.info('📊 ANALYTICS DEMONSTRATION');
console.info('===========================');

const analytics = tagSystem.getTagAnalytics();
console.info(`📈 Overall Statistics:`);
console.info(`   • Total tags: ${analytics.totalTags}`);
console.info(`   • Metadata usage: ${analytics.metadataUsage} (${Math.round(analytics.metadataUsage / analytics.totalTags * 100)}%)`);
console.info(`   • Reference usage: ${analytics.referenceUsage} (${Math.round(analytics.referenceUsage / analytics.totalTags * 100)}%)`);
console.info(`   • Bun-Native usage: ${analytics.bunNativeUsage} (${Math.round(analytics.bunNativeUsage / analytics.totalTags * 100)}%)`);

console.info(`\n🏷️  Domain Distribution:`);
Object.entries(analytics.domainDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([domain, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.info(`   • ${domain}: ${count} (${percentage}%)`);
  });

console.info(`\n🗂️  Type Distribution:`);
Object.entries(analytics.typeDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.info(`   • ${type}: ${count} (${percentage}%)`);
  });

console.info(`\n⭐ Class Distribution:`);
Object.entries(analytics.classDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([className, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.info(`   • ${className}: ${count} (${percentage}%)`);
  });

console.info('\n🎯 PRACTICAL APPLICATIONS');
console.info('=========================');

console.info('1. 📁 File Organization:');
console.info('   • Group files by domain and scope');
console.info('   • Filter by type and class for targeted operations');
console.info('   • Use metadata for version and configuration management\n');

console.info('2. 🔍 Advanced Search:');
console.info('   • Find all critical core TypeScript files');
console.info('   • Locate Bun-optimized scripts');
console.info('   • Cross-reference related artifacts\n');

console.info('3. 📊 Analytics & Reporting:');
console.info('   • Track technology adoption across domains');
console.info('   • Monitor code quality by class distribution');
console.info('   • Identify optimization opportunities\n');

console.info('4. 🚀 Automation & CI/CD:');
console.info('   • Validate tags on commit');
console.info('   • Generate documentation from tags');
console.info('   • Automate dependency management\n');

console.info('5. 🔗 Cross-Reference System:');
console.info('   • Build dependency graphs from #REF tags');
console.info('   • Track impact analysis across artifacts');
console.info('   • Maintain documentation consistency\n');

console.info('🔧 INTEGRATION COMMANDS');
console.info('========================');
console.info('# Parse a tag');
console.info('bun run scripts/tag-system.ts parse "[CORE][SYSTEM][TYPESCRIPT][CRITICAL]"');
console.info('');
console.info('# Validate a tag');
console.info('bun run scripts/tag-system.ts validate "[CLI][USER][JAVASCRIPT][HIGH]"');
console.info('');
console.info('# Generate a tag');
console.info('bun run scripts/tag-system.ts generate \'{"domain":"CORE","type":"TYPESCRIPT","class":"CRITICAL"}\'');
console.info('');
console.info('# Search tags');
console.info('bun run scripts/tag-system.ts search domain=CORE bunNative=true');
console.info('');
console.info('# Show analytics');
console.info('bun run scripts/tag-system.ts analytics');
console.info('');
console.info('# Show registry');
console.info('bun run scripts/tag-system.ts registry');

console.info('\n✅ Advanced Tag System Demonstration Complete!');
console.info('🚀 Ready for production deployment with artifact enhancement system!');
