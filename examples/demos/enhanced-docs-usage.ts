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
} from '../lib/docs/documentation-index.ts';

console.info('🚀 Enhanced Enterprise Documentation System Demo');
console.info('='.repeat(60));
console.info();

// 1. Basic URL Access - Your Specific URLs
console.info('📍 1. Primary Documentation URLs');
console.info('-'.repeat(40));
console.info('Bun Reference Portal:', getBunReferenceURL());
console.info('Bun Guides Portal:   ', getBunGuidesURL());
console.info('Bun RSS Feed:        ', getBunRSSURL());
console.info('GitHub Bun Types:    ', getGitHubBunTypesCommitURL());
console.info();

// 2. Text Fragment URLs - Deep Linking
console.info('🔗 2. Text Fragment Deep Linking');
console.info('-'.repeat(40));
const textFragments = getBunReferenceWithTextFragment();
console.info('node:zlib reference:     ', textFragments.nodeZlib);
console.info('Bun API Reference:       ', textFragments.bunAPIReference);

// Custom text fragment
const customFragment = docsURLBuilder.buildURLWithTextFragment(
  'https://bun.com/reference/api',
  'TypedArray methods',
  { prefix: 'Bun', suffix: 'reference' }
);
console.info('Custom fragment:         ', customFragment);
console.info();

// 3. GitHub Integration - Commit References
console.info('🐙 3. GitHub Commit Integration');
console.info('-'.repeat(40));
console.info('Your example commit: ', docsURLBuilder.getExampleCommitURL());
console.info('Specific commit hash: ', SIGNIFICANT_COMMITS.AF762966);
console.info('Latest release:       ', SIGNIFICANT_COMMITS.LATEST_RELEASE);
console.info('Canary build:         ', SIGNIFICANT_COMMITS.CANARY_BUILD);

// Build different commit URLs
const mainBranchURL = docsURLBuilder.buildBunTypesURL('main');
const canaryURL = docsURLBuilder.buildBunTypesURL('canary');
console.info('Main branch:          ', mainBranchURL);
console.info('Canary branch:        ', canaryURL);
console.info();

// 4. GitHub URL Parsing & Validation
console.info('🔍 4. GitHub URL Analysis');
console.info('-'.repeat(40));
const exampleURL = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';
const parsed = EnhancedDocumentationURLValidator.parseGitHubURL(exampleURL);
console.info('URL:', exampleURL);
console.info('Parsed:', {
  valid: parsed.isValid,
  type: parsed.type,
  owner: parsed.owner,
  repo: parsed.repo,
  commit: parsed.commitHash?.slice(0, 12) + '...',
  path: parsed.path
});

// Extract commit hash
const commitHash = EnhancedDocumentationURLValidator.extractCommitHash(exampleURL);
console.info('Extracted hash:       ', commitHash);
console.info('Is specific commit:   ', EnhancedDocumentationURLValidator.isSpecificCommitURL(exampleURL));
console.info('Is bun-types URL:     ', EnhancedDocumentationURLValidator.isBunTypesURL(exampleURL));
console.info();

// 5. Text Fragment Analysis
console.info('📄 5. Text Fragment Analysis');
console.info('-'.repeat(40));
const fragmentURL = 'https://bun.com/reference#:~:text=node%3Azlib,TypedArray%20methods,-performance';
const fragmentAnalysis = EnhancedDocumentationURLValidator.extractTextFragment(fragmentURL);
console.info('URL:', fragmentURL);
console.info('Has text fragment:    ', fragmentAnalysis.hasTextFragment);
console.info('Raw fragment:         ', fragmentAnalysis.rawFragment);
console.info('Decoded text:         ', fragmentAnalysis.decodedText);
console.info('Components:', fragmentAnalysis.components);
console.info();

// 6. TypeScript Definition URLs
console.info('📝 6. TypeScript Definition Resources');
console.info('-'.repeat(40));
const typeURLs = docsURLBuilder.getTypeDefinitionURLs();
console.info('NPM Package:          ', typeURLs.npmPackage);
console.info('GitHub Package:       ', typeURLs.githubPackage);
console.info('Latest Types:         ', typeURLs.latestTypes);
console.info('Example Commit:       ', typeURLs.exampleCommit);
console.info('TypeScript Playground:', typeURLs.typescriptPlayground);
console.info();

// 7. GitHub Package URLs
console.info('📦 7. GitHub Package URLs');
console.info('-'.repeat(40));
const packageURLs = docsURLBuilder.getGitHubPackageURLs('bun-types');
console.info('Package root:         ', packageURLs.tree);
console.info('Package.json:         ', packageURLs.blob + '/package.json');
console.info('README:               ', packageURLs.blob + '/README.md');
console.info('Source directory:     ', packageURLs.blob + '/src');
console.info();

// 8. Common Text Fragment URLs
console.info('🎯 8. Common Text Fragment URLs');
console.info('-'.repeat(40));
const commonFragments = docsURLBuilder.getCommonTextFragmentURLs();
console.info('node:zlib:            ', commonFragments.nodeZlib);
console.info('Bun API Reference:    ', commonFragments.bunAPIReference);
console.info();

// 9. All Critical URLs Collection
console.info('🌟 9. Complete Critical URLs Collection');
console.info('-'.repeat(40));
const allURLs = getAllCriticalURLs();

console.info('📖 Reference Portal:');
Object.entries(allURLs.referencePortal).forEach(([key, value]) => {
  console.info(`  ${key.padEnd(12)}: ${typeof value === 'string' ? value : '[object]'}`);
});

console.info('\n🐙 GitHub Resources:');
Object.entries(allURLs.github).forEach(([key, value]) => {
  console.info(`  ${key.padEnd(12)}: ${typeof value === 'string' ? value : '[object]'}`);
});

console.info('\n📰 RSS Feeds:');
Object.entries(allURLs.rssFeeds).forEach(([key, value]) => {
  console.info(`  ${key.padEnd(12)}: ${value}`);
});
console.info();

// 10. Text Fragment Patterns
console.info('🔧 10. Text Fragment Patterns & Encoding');
console.info('-'.repeat(40));
console.info('NODE_ZLIB:            ', TEXT_FRAGMENT_PATTERNS.NODE_ZLIB);
console.info('BUN_API_REFERENCE:    ', TEXT_FRAGMENT_PATTERNS.BUN_API_REFERENCE);
console.info('Encode "Bun API":     ', TEXT_FRAGMENT_PATTERNS.encode('Bun API'));
console.info('Decode "Bun%20API":   ', TEXT_FRAGMENT_PATTERNS.decode('Bun%20API'));
console.info();

// 11. Example Commit Metadata
console.info('📋 11. Example Commit Metadata');
console.info('-'.repeat(40));
console.info('Hash:                 ', exampleCommit.hash);
console.info('URL:                  ', exampleCommit.url);
console.info('Short Hash:           ', exampleCommit.shortHash);
console.info('Date:                 ', exampleCommit.date);
console.info('Description:          ', exampleCommit.description);
console.info();

// 12. Advanced Usage Examples
console.info('⚡ 12. Advanced Usage Examples');
console.info('-'.repeat(40));

// Build raw GitHub URL for direct file access
const rawURL = docsURLBuilder.buildGitHubRawURL(
  SIGNIFICANT_COMMITS.AF762966,
  'packages/bun-types/index.d.ts'
);
console.info('Raw file URL:         ', rawURL);

// Build GitHub blob URL for viewing with line numbers
const blobURL = docsURLBuilder.buildGitHubCommitURL(
  'oven-sh',
  'bun',
  SIGNIFICANT_COMMITS.AF762966,
  'packages/bun-types/globals.d.ts',
  'blob'
);
console.info('Blob view URL:        ', blobURL);

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
console.info('Complex fragment:     ', complexFragment);
console.info();

// Summary
console.info('✅ Demo completed successfully!');
console.info('🎉 Your enhanced enterprise documentation system is ready.');
console.info();
console.info('Key features demonstrated:');
console.info('• GitHub commit URL generation and parsing');
console.info('• Text fragment deep linking');
console.info('• TypeScript definition resource management');
console.info('• Enterprise-grade URL validation');
console.info('• Comprehensive URL collections');
console.info('• Text fragment encoding/decoding utilities');