#!/usr/bin/env bun

/**
 * 🏷️ Advanced Tag System Demonstration
 * 
 * Shows the complete structured tag format implementation:
 * [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]
 */

import { AdvancedTagSystem } from './scripts/tag-system.ts';

console.log('🏷️  Advanced Tag System - Complete Demonstration');
console.log('================================================\n');

const tagSystem = new AdvancedTagSystem();

console.log('📋 STRUCTURED TAG FORMAT');
console.log('========================');
console.log('[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]\n');

console.log('🔧 COMPONENT BREAKDOWN');
console.log('=======================');
console.log('• DOMAIN: Required - High-level categorization (CORE, CLI, DOCS, etc.)');
console.log('• SCOPE: Optional - Execution scope (SYSTEM, USER, DEV, PROD, etc.)');
console.log('• TYPE: Required - File type (TYPESCRIPT, JAVASCRIPT, JSON, etc.)');
console.log('• META: Optional - Key-value metadata (version=1.0, timeout=5000)');
console.log('• CLASS: Optional - Priority/importance (CRITICAL, HIGH, MEDIUM, etc.)');
console.log('• #REF: Optional - Cross-references to other artifacts');
console.log('• BUN-NATIVE: Optional - Flag for Bun-specific optimizations\n');

console.log('📊 EXAMPLE TAGS');
console.log('===============');
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
  console.log(`${index + 1}. ${example}`);
});

console.log('\n🔍 TAG PARSING DEMONSTRATION');
console.log('=============================');

const complexTag = '[CORE][SYSTEM][TYPESCRIPT][META:version=1.2.3][META:author=dev-team][CRITICAL][#REF:bootstrap][#REF:config][BUN-NATIVE]';
console.log(`Parsing: ${complexTag}\n`);

const parseResult = tagSystem.parseTag(complexTag);
if (parseResult.success) {
  console.log('✅ Parse successful!');
  console.log('Components:');
  console.log(`  • Domain: ${parseResult.tag!.domain}`);
  console.log(`  • Scope: ${parseResult.tag!.scope}`);
  console.log(`  • Type: ${parseResult.tag!.type}`);
  console.log(`  • Class: ${parseResult.tag!.class}`);
  console.log(`  • Bun-Native: ${parseResult.tag!.bunNative}`);
  console.log(`  • Metadata: ${JSON.stringify(parseResult.tag!.metadata, null, 4)}`);
  console.log(`  • References: ${JSON.stringify(parseResult.tag!.references, null, 4)}`);
} else {
  console.log('❌ Parse failed:', parseResult.error);
}

console.log('\n🛡️  TAG VALIDATION DEMONSTRATION');
console.log('===============================');

const testTags = [
  '[CORE][SYSTEM][TYPESCRIPT][CRITICAL][BUN-NATIVE]',  // Valid
  '[INVALID][SYSTEM][TYPESCRIPT]',                     // Invalid domain
  '[CORE][INVALID_SCOPE][TYPESCRIPT]',                 // Invalid scope
  '[CORE][SYSTEM][INVALID_TYPE]',                      // Invalid type
  '[CORE][SYSTEM][TYPESCRIPT][INVALID_CLASS]'          // Invalid class
];

testTags.forEach((tag, index) => {
  console.log(`\n${index + 1}. Testing: ${tag}`);
  const result = tagSystem.parseTag(tag);
  if (result.success) {
    const validation = tagSystem.validateTag(result.tag!);
    console.log(`   Result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (validation.errors.length > 0) {
      validation.errors.forEach(error => console.log(`   ❌ Error: ${error}`));
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.log(`   ⚠️  Warning: ${warning}`));
    }
    if (validation.suggestions.length > 0) {
      validation.suggestions.forEach(suggestion => console.log(`   💡 Suggestion: ${suggestion}`));
    }
  } else {
    console.log(`   ❌ Parse Error: ${result.error}`);
  }
});

console.log('\n🏗️  TAG GENERATION DEMONSTRATION');
console.log('===============================');

const components = [
  { domain: 'CORE', type: 'TYPESCRIPT', class: 'CRITICAL', bunNative: true },
  { domain: 'CLI', scope: 'USER', type: 'JAVASCRIPT', class: 'HIGH' },
  { domain: 'DOCS', scope: 'GLOBAL', type: 'MARKDOWN', references: ['README', 'GUIDE'] },
  { domain: 'SCRIPTS', scope: 'DEV', type: 'TYPESCRIPT', metadata: { timeout: 5000, retry: 3 }, class: 'MEDIUM' }
];

components.forEach((component, index) => {
  const generatedTag = tagSystem.generateTag(component);
  console.log(`${index + 1.} Input:  ${JSON.stringify(component)}`);
  console.log(`   Output: ${generatedTag}\n`);
});

console.log('🔍 SEARCH DEMONSTRATION');
console.log('=======================');

const searchCriteria = [
  { domain: 'CORE' },
  { type: 'TYPESCRIPT', bunNative: true },
  { class: 'CRITICAL' },
  { hasMetadata: 'version' },
  { hasReference: 'config' }
];

searchCriteria.forEach((criteria, index) => {
  console.log(`${index + 1}. Search criteria: ${JSON.stringify(criteria)}`);
  const results = tagSystem.searchByTags(criteria);
  console.log(`   Results: ${results.length} found`);
  results.forEach(result => console.log(`   • ${result}`));
  console.log();
});

console.log('📊 ANALYTICS DEMONSTRATION');
console.log('===========================');

const analytics = tagSystem.getTagAnalytics();
console.log(`📈 Overall Statistics:`);
console.log(`   • Total tags: ${analytics.totalTags}`);
console.log(`   • Metadata usage: ${analytics.metadataUsage} (${Math.round(analytics.metadataUsage / analytics.totalTags * 100)}%)`);
console.log(`   • Reference usage: ${analytics.referenceUsage} (${Math.round(analytics.referenceUsage / analytics.totalTags * 100)}%)`);
console.log(`   • Bun-Native usage: ${analytics.bunNativeUsage} (${Math.round(analytics.bunNativeUsage / analytics.totalTags * 100)}%)`);

console.log(`\n🏷️  Domain Distribution:`);
Object.entries(analytics.domainDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([domain, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.log(`   • ${domain}: ${count} (${percentage}%)`);
  });

console.log(`\n🗂️  Type Distribution:`);
Object.entries(analytics.typeDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.log(`   • ${type}: ${count} (${percentage}%)`);
  });

console.log(`\n⭐ Class Distribution:`);
Object.entries(analytics.classDistribution)
  .sort(([,a], [,b]) => b - a)
  .forEach(([className, count]) => {
    const percentage = Math.round(count / analytics.totalTags * 100);
    console.log(`   • ${className}: ${count} (${percentage}%)`);
  });

console.log('\n🎯 PRACTICAL APPLICATIONS');
console.log('=========================');

console.log('1. 📁 File Organization:');
console.log('   • Group files by domain and scope');
console.log('   • Filter by type and class for targeted operations');
console.log('   • Use metadata for version and configuration management\n');

console.log('2. 🔍 Advanced Search:');
console.log('   • Find all critical core TypeScript files');
console.log('   • Locate Bun-optimized scripts');
console.log('   • Cross-reference related artifacts\n');

console.log('3. 📊 Analytics & Reporting:');
console.log('   • Track technology adoption across domains');
console.log('   • Monitor code quality by class distribution');
console.log('   • Identify optimization opportunities\n');

console.log('4. 🚀 Automation & CI/CD:');
console.log('   • Validate tags on commit');
console.log('   • Generate documentation from tags');
console.log('   • Automate dependency management\n');

console.log('5. 🔗 Cross-Reference System:');
console.log('   • Build dependency graphs from #REF tags');
console.log('   • Track impact analysis across artifacts');
console.log('   • Maintain documentation consistency\n');

console.log('🔧 INTEGRATION COMMANDS');
console.log('========================');
console.log('# Parse a tag');
console.log('bun run scripts/tag-system.ts parse "[CORE][SYSTEM][TYPESCRIPT][CRITICAL]"');
console.log('');
console.log('# Validate a tag');
console.log('bun run scripts/tag-system.ts validate "[CLI][USER][JAVASCRIPT][HIGH]"');
console.log('');
console.log('# Generate a tag');
console.log('bun run scripts/tag-system.ts generate \'{"domain":"CORE","type":"TYPESCRIPT","class":"CRITICAL"}\'');
console.log('');
console.log('# Search tags');
console.log('bun run scripts/tag-system.ts search domain=CORE bunNative=true');
console.log('');
console.log('# Show analytics');
console.log('bun run scripts/tag-system.ts analytics');
console.log('');
console.log('# Show registry');
console.log('bun run scripts/tag-system.ts registry');

console.log('\n✅ Advanced Tag System Demonstration Complete!');
console.log('🚀 Ready for production deployment with artifact enhancement system!');
