#!/usr/bin/env bun

/**
 * 📚 Enhanced Documentation Integration Examples
 * 
 * Comprehensive examples demonstrating the enhanced documentation system
 * with GitHub integration, text fragments, and enterprise-grade URL management.
 */

import { 
  docs,
  DocumentationProvider,
  DocumentationCategory,
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  exampleCommit,
  getBunReferenceURL,
  getBunGuidesURL,
  getBunRSSURL,
  getBunReferenceWithTextFragment,
  getGitHubBunTypesCommitURL,
  getAllCriticalURLs
} from '../../lib/docs/documentation-index.ts';

/**
 * Example 1: Basic Portal Access
 */
async function basicPortalAccess() {
  console.info('📚 Basic Portal Access');
  console.info('='.repeat(50));
  
  // Access the specific URLs you mentioned
  console.info('🔗 Bun Reference Portal:');
  console.info(`   ${getBunReferenceURL()}`);
  
  console.info('\n📖 Bun Guides:');
  console.info(`   ${getBunGuidesURL()}`);
  
  console.info('\n📰 Bun RSS Feed:');
  console.info(`   ${getBunRSSURL()}`);
  
  // Using the convenience API
  console.info('\n🎯 Convenience API:');
  console.info(`   Reference: ${docs.reference()}`);
  console.info(`   Guides: ${docs.guides()}`);
  console.info(`   RSS: ${docs.rss()}`);
}

/**
 * Example 2: Text Fragment Support
 */
async function textFragmentSupport() {
  console.info('\n🔍 Text Fragment Support');
  console.info('='.repeat(50));
  
  // Get text fragment URLs
  const textFragments = getBunReferenceWithTextFragment();
  console.info('🎯 Text Fragment URLs:');
  console.info(`   Node Zlib: ${textFragments.nodeZlib}`);
  console.info(`   Bun API Reference: ${textFragments.bunAPIReference}`);
  
  // Extract and analyze text fragments
  const nodeZlibURL = textFragments.nodeZlib;
  const textAnalysis = EnhancedDocumentationURLValidator.extractTextFragment(nodeZlibURL);
  
  console.info('\n🔍 Text Fragment Analysis:');
  console.info(`   Has Text Fragment: ${textAnalysis.hasTextFragment}`);
  console.info(`   Raw Fragment: ${textAnalysis.rawFragment}`);
  console.info(`   Decoded Text: ${textAnalysis.decodedText}`);
  console.info(`   Components: ${JSON.stringify(textAnalysis.components, null, 2)}`);
  
  // Build custom text fragment
  const customFragment = docsURLBuilder.buildURLWithTextFragment(
    'https://bun.com/reference/api',
    'TypedArray methods',
    { 
      prefix: 'Bun', 
      suffix: 'documentation' 
    }
  );
  
  console.info('\n🛠️ Custom Text Fragment:');
  console.info(`   ${customFragment}`);
}

/**
 * Example 3: GitHub Integration
 */
async function githubIntegration() {
  console.info('\n🐙 GitHub Integration');
  console.info('='.repeat(50));
  
  // Get the specific commit URL you provided
  const commitURL = getGitHubBunTypesCommitURL();
  console.info('🔗 GitHub Commit URL:');
  console.info(`   ${commitURL}`);
  
  // Parse GitHub URL
  const parsed = EnhancedDocumentationURLValidator.parseGitHubURL(commitURL);
  console.info('\n🔍 Parsed GitHub URL:');
  console.info(`   Valid: ${parsed.isValid}`);
  console.info(`   Type: ${parsed.type}`);
  console.info(`   Owner: ${parsed.owner}`);
  console.info(`   Repo: ${parsed.repo}`);
  console.info(`   Commit Hash: ${parsed.commitHash}`);
  console.info(`   Path: ${parsed.path}`);
  console.info(`   File: ${parsed.file}`);
  
  // Extract commit hash
  const commitHash = EnhancedDocumentationURLValidator.extractCommitHash(commitURL);
  console.info(`\n🔑 Extracted Commit Hash: ${commitHash}`);
  
  // Check if it's a specific commit
  const isSpecific = EnhancedDocumentationURLValidator.isSpecificCommitURL(commitURL);
  console.info(`\n✅ Is Specific Commit: ${isSpecific}`);
  
  // Check if it's bun-types URL
  const isBunTypes = EnhancedDocumentationURLValidator.isBunTypesURL(commitURL);
  console.info(`\n📦 Is Bun Types URL: ${isBunTypes}`);
  
  // Get example commit metadata
  console.info('\n📋 Example Commit Metadata:');
  console.info(`   Hash: ${exampleCommit.hash}`);
  console.info(`   Short Hash: ${exampleCommit.shortHash}`);
  console.info(`   URL: ${exampleCommit.url}`);
  console.info(`   Date: ${exampleCommit.date}`);
  console.info(`   Description: ${exampleCommit.description}`);
  
  // Build different GitHub URLs
  console.info('\n🛠️ GitHub URL Building:');
  const treeURL = docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', 'main', 'packages/bun-types', 'tree');
  const blobURL = docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', 'main', 'packages/bun-types/index.d.ts', 'blob');
  const rawURL = docsURLBuilder.buildGitHubRawURL('main', 'packages/bun-types/index.d.ts');
  
  console.info(`   Tree URL: ${treeURL}`);
  console.info(`   Blob URL: ${blobURL}`);
  console.info(`   Raw URL: ${rawURL}`);
}

/**
 * Example 4: Enhanced URL Building
 */
async function enhancedURLBuilding() {
  console.info('\n🔗 Enhanced URL Building');
  console.info('='.repeat(50));
  
  // Build documentation URL with provider
  const docURL = docs.build({
    provider: DocumentationProvider.BUN_REFERENCE,
    category: DocumentationCategory.API_REFERENCE,
    path: 'fetch',
    fragment: {
      example: 'timeout',
      interactive: 'true',
      theme: 'dark'
    }
  });
  
  console.info('📖 Documentation URL:');
  console.info(`   ${docURL}`);
  
  // Build interactive URL
  const interactiveURL = docs.buildInteractive({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'typedarray',
    runnable: true,
    editable: true,
    theme: 'auto',
    example: 'performance'
  });
  
  console.info('\n🎮 Interactive URL:');
  console.info(`   ${interactiveURL}`);
  
  // Build example URL
  const exampleURL = docs.buildExample({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'fetch',
    exampleName: 'http-request',
    language: 'typescript',
    highlight: true
  });
  
  console.info('\n💡 Example URL:');
  console.info(`   ${exampleURL}`);
  
  // Build search URL
  const searchURL = docs.buildSearch({
    provider: DocumentationProvider.BUN_REFERENCE,
    query: 'timeout configuration',
    category: DocumentationCategory.API_REFERENCE,
    filters: {
      version: 'latest',
      platform: 'node'
    }
  });
  
  console.info('\n🔍 Search URL:');
  console.info(`   ${searchURL}`);
  
  // Build shareable link
  const shareableURL = docs.buildShareable({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'getting-started',
    fragment: {
      section: 'installation',
      platform: 'macos'
    },
    expiresIn: 3600 // 1 hour
  });
  
  console.info('\n🔗 Shareable Link:');
  console.info(`   ${shareableURL}`);
}

/**
 * Example 5: URL Validation
 */
async function urlValidation() {
  console.info('\n✅ URL Validation');
  console.info('='.repeat(50));
  
  // Test URLs for validation
  const testURLs = [
    'https://bun.com/reference',
    'https://bun.com/guides',
    'https://bun.com/rss.xml',
    'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    'https://bun.com/reference#:~:text=node%3Azlib',
    'https://bun.com/reference#:~:text=Bun%20API%20Reference',
    'https://www.npmjs.com/package/bun-types',
    'invalid-url',
    'http://insecure.example.com/docs'
  ];
  
  // Validate batch
  const validationResults = docs.validateBatch(testURLs);
  
  console.info('🔍 Batch Validation Results:');
  validationResults.forEach(({ url, result }) => {
    console.info(`\n   URL: ${url}`);
    console.info(`   Valid: ${result.isValid}`);
    console.info(`   Provider: ${result.provider || 'Unknown'}`);
    
    if (result.errors.length > 0) {
      console.info(`   Errors: ${result.errors.join(', ')}`);
    }
    
    if (result.warnings.length > 0) {
      console.info(`   Warnings: ${result.warnings.join(', ')}`);
    }
    
    if (result.metadata) {
      console.info(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
    }
  });
  
  // Get validation statistics
  const stats = EnhancedDocumentationURLValidator.getValidationStats(validationResults);
  
  console.info('\n📊 Validation Statistics:');
  console.info(`   Total: ${stats.total}`);
  console.info(`   Valid: ${stats.valid}`);
  console.info(`   Invalid: ${stats.invalid}`);
  console.info(`   Warnings: ${stats.warnings}`);
  
  console.info('\n   By Provider:');
  Object.entries(stats.byProvider).forEach(([provider, data]) => {
    console.info(`     ${provider}: ${data.valid}/${data.total} valid`);
  });
  
  console.info('\n   Common Errors:');
  stats.commonErrors.forEach(({ error, count }) => {
    console.info(`     ${error}: ${count}`);
  });
  
  console.info('\n   Common Warnings:');
  stats.commonWarnings.forEach(({ warning, count }) => {
    console.info(`     ${warning}: ${count}`);
  });
}

/**
 * Example 6: Fragment Utilities
 */
async function fragmentUtilities() {
  console.info('\n🔗 Fragment Utilities');
  console.info('='.repeat(50));
  
  // Fragment building
  console.info('🛠️ Fragment Building:');
  
  const navigationFragment = docs.fragment.build.navigation('overview', {
    theme: 'dark',
    interactive: 'true'
  });
  console.info(`   Navigation: ${JSON.stringify(navigationFragment)}`);
  
  const interactiveFragment = docs.fragment.build.interactive(true, {
    editable: 'true',
    theme: 'auto'
  });
  console.info(`   Interactive: ${JSON.stringify(interactiveFragment)}`);
  
  const exampleFragment = docs.fragment.build.example('http-request', {
    language: 'typescript',
    highlight: 'true'
  });
  console.info(`   Example: ${JSON.stringify(exampleFragment)}`);
  
  const searchFragment = docs.fragment.build.search('fetch timeout', {
    category: 'api',
    version: 'latest'
  });
  console.info(`   Search: ${JSON.stringify(searchFragment)}`);
  
  // Fragment parsing
  console.info('\n🔍 Fragment Parsing:');
  
  const testFragment = '#view=overview&theme=dark&interactive=true';
  const parsedStandard = docs.fragment.parse.parseStandard(testFragment);
  console.info(`   Standard Fragment: ${JSON.stringify(parsedStandard)}`);
  
  const textFragment = '#:~:text=node%3Azlib';
  const parsedText = docs.fragment.parse.parseTextFragment(textFragment);
  console.info(`   Text Fragment: ${JSON.stringify(parsedText)}`);
  
  const mixedFragment = '#view=overview&theme=dark#:~:text=Bun%20API%20Reference';
  const parsedMixed = docs.fragment.parse.parseMixed(mixedFragment);
  console.info(`   Mixed Fragment: ${JSON.stringify(parsedMixed)}`);
  
  // Text fragment specification
  console.info('\n📋 Text Fragment Specification:');
  console.info(`   Basic Pattern: ${docs.fragment.spec.BASIC}`);
  console.info(`   With Prefix: ${docs.fragment.spec.WITH_PREFIX}`);
  console.info(`   With Suffix: ${docs.fragment.spec.WITH_SUFFIX}`);
  console.info(`   Full Pattern: ${docs.fragment.spec.FULL}`);
  
  // Build custom text fragment
  const customTextFragment = docs.fragment.spec.build({
    textStart: 'TypedArray methods',
    prefix: 'Bun',
    suffix: 'reference'
  });
  console.info(`   Custom Text Fragment: ${customTextFragment}`);
}

/**
 * Example 7: All Critical URLs
 */
async function allCriticalURLs() {
  console.info('\n🌐 All Critical URLs');
  console.info('='.repeat(50));
  
  const allURLs = getAllCriticalURLs();
  
  console.info('📚 Reference Portal:');
  console.info(`   Main: ${allURLs.referencePortal.main}`);
  console.info(`   API: ${allURLs.referencePortal.api}`);
  console.info(`   CLI: ${allURLs.referencePortal.cli}`);
  
  console.info('\n📖 Guides Portal:');
  console.info(`   Main: ${allURLs.guidesPortal.main}`);
  console.info(`   Getting Started: ${allURLs.guidesPortal.gettingStarted}`);
  
  console.info('\n📰 RSS Feeds:');
  console.info(`   Main: ${allURLs.rssFeeds.main}`);
  console.info(`   Blog: ${allURLs.rssFeeds.blog}`);
  console.info(`   Technical: ${allURLs.rssFeeds.technical}`);
  
  console.info('\n🐙 GitHub Resources:');
  console.info(`   Repository: ${allURLs.github.repository}`);
  console.info(`   Bun Types Latest: ${allURLs.github.bunTypes.latest}`);
  console.info(`   Bun Types Specific Commit: ${allURLs.github.bunTypes.specificCommit}`);
  console.info(`   Bun Types NPM: ${allURLs.github.bunTypes.npm}`);
  
  console.info('\n📦 GitHub Packages:');
  Object.entries(allURLs.github.packages).forEach(([name, url]) => {
    console.info(`   ${name}: ${url}`);
  });
  
  console.info('\n🔧 Technical Documentation:');
  console.info(`   TypedArray: ${allURLs.technicalDocs.typedArray}`);
  console.info(`   Fetch API: ${allURLs.technicalDocs.fetchAPI}`);
  console.info(`   Binary Data: ${allURLs.technicalDocs.binaryData}`);
  
  // Text fragment URLs
  console.info('\n🔍 Text Fragment URLs:');
  Object.entries(allURLs.referencePortal.textFragments).forEach(([name, url]) => {
    console.info(`   ${name}: ${url}`);
  });
}

/**
 * Example 8: Provider Information
 */
async function providerInformation() {
  console.info('\n🏢 Provider Information');
  console.info('='.repeat(50));
  
  // Get all available providers
  const providers = docsURLBuilder.getAvailableProviders();
  
  console.info('📋 Available Providers:');
  providers.forEach(({ provider, metadata }) => {
    console.info(`\n   ${provider}:`);
    console.info(`     Name: ${metadata.name}`);
    console.info(`     Description: ${metadata.description}`);
    console.info(`     Supports Text Fragments: ${metadata.supportsTextFragments}`);
    console.info(`     Supports Search: ${metadata.supportsSearch}`);
    console.info(`     Last Updated: ${metadata.lastUpdated}`);
    console.info(`     Version: ${metadata.version}`);
  });
  
  // Get provider metadata for specific providers
  console.info('\n📊 Specific Provider Metadata:');
  
  const bunReferenceMeta = docsURLBuilder.getProviderMetadata(DocumentationProvider.BUN_REFERENCE);
  console.info(`\n   BUN_REFERENCE:`);
  console.info(`     ${JSON.stringify(bunReferenceMeta, null, 2)}`);
  
  const githubMeta = docsURLBuilder.getProviderMetadata(DocumentationProvider.GITHUB_PUBLIC);
  console.info(`\n   GITHUB_PUBLIC:`);
  console.info(`     ${JSON.stringify(githubMeta, null, 2)}`);
}

/**
 * Example 9: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.info('\n⚡ Quick Reference URLs');
  console.info('='.repeat(50));
  
  const quickRefs = docs.quick();
  
  console.info('🔗 Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    if (typeof url === 'string') {
      console.info(`   ${name}: ${url}`);
    } else {
      console.info(`\n   ${name}:`);
      Object.entries(url).forEach(([subName, subUrl]) => {
        console.info(`     ${subName}: ${subUrl}`);
      });
    }
  });
}

/**
 * Example 10: Real-world Usage Scenario
 */
async function realWorldUsageScenario() {
  console.info('\n🌍 Real-world Usage Scenario');
  console.info('='.repeat(50));
  
  // Scenario: Developer is looking for fetch timeout configuration
  console.info('👨‍💻 Developer Scenario: Finding Fetch Timeout Configuration');
  
  // 1. Search for fetch timeout
  const searchURL = docs.buildSearch({
    provider: DocumentationProvider.BUN_REFERENCE,
    query: 'fetch timeout configuration',
    category: DocumentationCategory.API_REFERENCE
  });
  
  console.info(`\n1️⃣ Search URL: ${searchURL}`);
  
  // 2. Navigate to specific documentation with interactive example
  const interactiveDocURL = docs.buildInteractive({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'api/fetch',
    runnable: true,
    theme: 'dark',
    example: 'timeout-configuration'
  });
  
  console.info(`\n2️⃣ Interactive Documentation: ${interactiveDocURL}`);
  
  // 3. Get related GitHub commit for implementation details
  const githubCommitURL = docsURLBuilder.buildGitHubCommitURL(
    'oven-sh',
    'bun',
    'main',
    'src/js/fetch.ts',
    'blob'
  );
  
  console.info(`\n3️⃣ GitHub Implementation: ${githubCommitURL}`);
  
  // 4. Create shareable link for team
  const shareableLink = docs.buildShareable({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'api/fetch',
    fragment: {
      section: 'timeout',
      example: 'configuration',
      team: 'backend'
    },
    expiresIn: 86400 // 24 hours
  });
  
  console.info(`\n4️⃣ Shareable Team Link: ${shareableLink}`);
  
  // 5. Validate all URLs
  const scenarioURLs = [searchURL, interactiveDocURL, githubCommitURL, shareableLink];
  const validation = docs.validateBatch(scenarioURLs);
  
  console.info('\n5️⃣ URL Validation:');
  validation.forEach(({ url, result }) => {
    console.info(`   ${result.isValid ? '✅' : '❌'} ${url}`);
    if (!result.isValid) {
      console.info(`      Errors: ${result.errors.join(', ')}`);
    }
  });
  
  // 6. Generate comprehensive report
  console.info('\n📊 Scenario Summary:');
  console.info(`   Total URLs: ${scenarioURLs.length}`);
  console.info(`   Valid URLs: ${validation.filter(v => v.result.isValid).length}`);
  console.info(`   Providers Used: ${[...new Set(validation.map(v => v.result.provider).filter(Boolean))].join(', ')}`);
  
  console.info('\n🎯 Scenario Complete! Developer has all resources needed.');
}

/**
 * Main demonstration function
 */
async function main() {
  console.info('📚 Enhanced Documentation Integration Examples');
  console.info('='.repeat(70));
  console.info('');
  
  try {
    await basicPortalAccess();
    await textFragmentSupport();
    await githubIntegration();
    await enhancedURLBuilding();
    await urlValidation();
    await fragmentUtilities();
    await allCriticalURLs();
    await providerInformation();
    await quickReferenceURLs();
    await realWorldUsageScenario();
    
    console.info('\n✅ All enhanced documentation integration examples completed successfully!');
    console.info('');
    console.info('📋 Key Features Demonstrated:');
    console.info('   • Primary portal access (bun.com/reference, bun.com/guides, RSS)');
    console.info('   • Text fragment support (Scroll to Text Fragment)');
    console.info('   • GitHub integration (commit-specific URLs, parsing, validation)');
    console.info('   • Enhanced URL building (interactive, examples, search, shareable)');
    console.info('   • Comprehensive URL validation (batch processing, statistics)');
    console.info('   • Fragment utilities (building, parsing, validation)');
    console.info('   • Provider management (metadata, capabilities)');
    console.info('   • Quick reference URLs');
    console.info('   • Real-world usage scenarios');
    
  } catch (error) {
    console.error('❌ Error in enhanced documentation integration examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main();
}

export {
  basicPortalAccess,
  textFragmentSupport,
  githubIntegration,
  enhancedURLBuilding,
  urlValidation,
  fragmentUtilities,
  allCriticalURLs,
  providerInformation,
  quickReferenceURLs,
  realWorldUsageScenario
};
