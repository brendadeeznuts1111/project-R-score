#!/usr/bin/env bun

/**
 * 🚀 Enhanced Enterprise Documentation System Usage Demo
 *
 * Comprehensive demonstration of the enhanced documentation system
 * with GitHub integration, text fragments, and enterprise-grade features.
 */

import {
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  getBunReferenceURL,
  getBunGuidesURL,
  getBunRSSURL,
  getBunReferenceWithTextFragment,
  getGitHubBunTypesCommitURL,
  getAllCriticalURLs,
  exampleCommit,
  SIGNIFICANT_COMMITS,
  TEXT_FRAGMENT_PATTERNS
} from '../lib/documentation/index.ts';

console.log('🚀 Enhanced Enterprise Documentation System Demo');
console.log('='.repeat(60));
console.log();

// 1. Basic URL Access - Your Specific URLs
console.log('📍 1. Primary Documentation URLs');
console.log('-'.repeat(40));
console.log('Bun Reference Portal:', getBunReferenceURL());
console.log('Bun Guides Portal:   ', getBunGuidesURL());
console.log('Bun RSS Feed:        ', getBunRSSURL());
console.log('GitHub Bun Types:    ', getGitHubBunTypesCommitURL());
console.log();

// 2. Text Fragment URLs - Deep Linking
console.log('🔗 2. Text Fragment Deep Linking');
console.log('-'.repeat(40));
const textFragments = getBunReferenceWithTextFragment();
console.log('node:zlib reference:     ', textFragments.nodeZlib);
console.log('Bun API Reference:       ', textFragments.bunAPIReference);

// Custom text fragment
const customFragment = docsURLBuilder.buildURLWithTextFragment(
  'https://bun.com/reference/api',
  'TypedArray methods',
  { prefix: 'Bun', suffix: 'reference' }
);
console.log('Custom fragment:         ', customFragment);
console.log();

// 3. GitHub Integration - Commit References
console.log('🐙 3. GitHub Commit Integration');
console.log('-'.repeat(40));
console.log('Your example commit: ', docsURLBuilder.getExampleCommitURL());
console.log('Specific commit hash: ', SIGNIFICANT_COMMITS.AF762966);
console.log('Latest release:       ', SIGNIFICANT_COMMITS.LATEST_RELEASE);
console.log('Canary build:         ', SIGNIFICANT_COMMITS.CANARY_BUILD);

// Build different commit URLs
const mainBranchURL = docsURLBuilder.buildBunTypesURL('main');
const canaryURL = docsURLBuilder.buildBunTypesURL('canary');
console.log('Main branch:          ', mainBranchURL);
console.log('Canary branch:        ', canaryURL);
console.log();

// 4. GitHub URL Parsing & Validation
console.log('🔍 4. GitHub URL Analysis');
console.log('-'.repeat(40));
const exampleURL = 'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types';
const parsed = EnhancedDocumentationURLValidator.parseGitHubURL(exampleURL);
console.log('URL:', exampleURL);
console.log('Parsed:', {
  valid: parsed.isValid,
  type: parsed.type,
  owner: parsed.owner,
  repo: parsed.repo,
  commit: parsed.commitHash?.slice(0, 12) + '...',
  path: parsed.path
});

// Extract commit hash
const commitHash = EnhancedDocumentationURLValidator.extractCommitHash(exampleURL);
console.log('Extracted hash:       ', commitHash);
console.log('Is specific commit:   ', EnhancedDocumentationURLValidator.isSpecificCommitURL(exampleURL));
console.log('Is bun-types URL:     ', EnhancedDocumentationURLValidator.isBunTypesURL(exampleURL));
console.log();

// 5. Text Fragment Analysis
console.log('📄 5. Text Fragment Analysis');
console.log('-'.repeat(40));
const fragmentURL = 'https://bun.com/reference#:~:text=node%3Azlib,TypedArray%20methods,-performance';
const fragmentAnalysis = EnhancedDocumentationURLValidator.extractTextFragment(fragmentURL);
console.log('URL:', fragmentURL);
console.log('Has text fragment:    ', fragmentAnalysis.hasTextFragment);
console.log('Raw fragment:         ', fragmentAnalysis.rawFragment);
console.log('Decoded text:         ', fragmentAnalysis.decodedText);
console.log('Components:', fragmentAnalysis.components);
console.log();

// 6. TypeScript Definition URLs
console.log('📝 6. TypeScript Definition Resources');
console.log('-'.repeat(40));
const typeURLs = docsURLBuilder.getTypeDefinitionURLs();
console.log('NPM Package:          ', typeURLs.npmPackage);
console.log('GitHub Package:       ', typeURLs.githubPackage);
console.log('Latest Types:         ', typeURLs.latestTypes);
console.log('Example Commit:       ', typeURLs.exampleCommit);
console.log('TypeScript Playground:', typeURLs.typescriptPlayground);
console.log();

// 7. GitHub Package URLs
console.log('📦 7. GitHub Package URLs');
console.log('-'.repeat(40));
const packageURLs = docsURLBuilder.getGitHubPackageURLs('bun-types');
console.log('Package root:         ', packageURLs.tree);
console.log('Package.json:         ', packageURLs.blob + '/package.json');
console.log('README:               ', packageURLs.blob + '/README.md');
console.log('Source directory:     ', packageURLs.blob + '/src');
console.log();

// 8. Common Text Fragment URLs
console.log('🎯 8. Common Text Fragment URLs');
console.log('-'.repeat(40));
const commonFragments = docsURLBuilder.getCommonTextFragmentURLs();
console.log('node:zlib:            ', commonFragments.nodeZlib);
console.log('Bun API Reference:    ', commonFragments.bunAPIReference);
console.log();

// 9. All Critical URLs Collection
console.log('🌟 9. Complete Critical URLs Collection');
console.log('-'.repeat(40));
const allURLs = getAllCriticalURLs();

console.log('📖 Reference Portal:');
Object.entries(allURLs.referencePortal).forEach(([key, value]) => {
  console.log(`  ${key.padEnd(12)}: ${typeof value === 'string' ? value : '[object]'}`);
});

console.log('\n🐙 GitHub Resources:');
Object.entries(allURLs.github).forEach(([key, value]) => {
  console.log(`  ${key.padEnd(12)}: ${typeof value === 'string' ? value : '[object]'}`);
});

console.log('\n📰 RSS Feeds:');
Object.entries(allURLs.rssFeeds).forEach(([key, value]) => {
  console.log(`  ${key.padEnd(12)}: ${value}`);
});
console.log();

// 10. Text Fragment Patterns
console.log('🔧 10. Text Fragment Patterns & Encoding');
console.log('-'.repeat(40));
console.log('NODE_ZLIB:            ', TEXT_FRAGMENT_PATTERNS.NODE_ZLIB);
console.log('BUN_API_REFERENCE:    ', TEXT_FRAGMENT_PATTERNS.BUN_API_REFERENCE);
console.log('Encode "Bun API":     ', TEXT_FRAGMENT_PATTERNS.encode('Bun API'));
console.log('Decode "Bun%20API":   ', TEXT_FRAGMENT_PATTERNS.decode('Bun%20API'));
console.log();

// 11. Example Commit Metadata
console.log('📋 11. Example Commit Metadata');
console.log('-'.repeat(40));
console.log('Hash:                 ', exampleCommit.hash);
console.log('URL:                  ', exampleCommit.url);
console.log('Short Hash:           ', exampleCommit.shortHash);
console.log('Date:                 ', exampleCommit.date);
console.log('Description:          ', exampleCommit.description);
console.log();

// 12. Advanced Usage Examples
console.log('⚡ 12. Advanced Usage Examples');
console.log('-'.repeat(40));

// Build raw GitHub URL for direct file access
const rawURL = docsURLBuilder.buildGitHubRawURL(
  SIGNIFICANT_COMMITS.AF762966,
  'packages/bun-types/index.d.ts'
);
console.log('Raw file URL:         ', rawURL);

// Build GitHub blob URL for viewing with line numbers
const blobURL = docsURLBuilder.buildGitHubCommitURL(
  'oven-sh',
  'bun',
  SIGNIFICANT_COMMITS.AF762966,
  'packages/bun-types/globals.d.ts',
  'blob'
);
console.log('Blob view URL:        ', blobURL);

// Build complex text fragment
const complexFragment = docsURLBuilder.buildURLWithTextFragment(
  'https://bun.com/reference',
  'WebSocket API',
  {
    prefix: 'Bun',
    textStart: 'WebSocket',
    textEnd: 'connection',
    suffix: 'examples'
  }
);
console.log('Complex fragment:     ', complexFragment);
console.log();

// Summary
console.log('✅ Demo completed successfully!');
console.log('🎉 Your enhanced enterprise documentation system is ready.');
console.log();
console.log('Key features demonstrated:');
console.log('• GitHub commit URL generation and parsing');
console.log('• Text fragment deep linking');
console.log('• TypeScript definition resource management');
console.log('• Enterprise-grade URL validation');
console.log('• Comprehensive URL collections');
console.log('• Text fragment encoding/decoding utilities');