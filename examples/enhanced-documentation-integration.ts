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
} from '../lib/documentation/index.ts';

/**
 * Example 1: Basic Portal Access
 */
async function basicPortalAccess() {
  console.log('📚 Basic Portal Access');
  console.log('='.repeat(50));
  
  // Access the specific URLs you mentioned
  console.log('🔗 Bun Reference Portal:');
  console.log(`   ${getBunReferenceURL()}`);
  
  console.log('\n📖 Bun Guides:');
  console.log(`   ${getBunGuidesURL()}`);
  
  console.log('\n📰 Bun RSS Feed:');
  console.log(`   ${getBunRSSURL()}`);
  
  // Using the convenience API
  console.log('\n🎯 Convenience API:');
  console.log(`   Reference: ${docs.reference()}`);
  console.log(`   Guides: ${docs.guides()}`);
  console.log(`   RSS: ${docs.rss()}`);
}

/**
 * Example 2: Text Fragment Support
 */
async function textFragmentSupport() {
  console.log('\n🔍 Text Fragment Support');
  console.log('='.repeat(50));
  
  // Get text fragment URLs
  const textFragments = getBunReferenceWithTextFragment();
  console.log('🎯 Text Fragment URLs:');
  console.log(`   Node Zlib: ${textFragments.nodeZlib}`);
  console.log(`   Bun API Reference: ${textFragments.bunAPIReference}`);
  
  // Extract and analyze text fragments
  const nodeZlibURL = textFragments.nodeZlib;
  const textAnalysis = EnhancedDocumentationURLValidator.extractTextFragment(nodeZlibURL);
  
  console.log('\n🔍 Text Fragment Analysis:');
  console.log(`   Has Text Fragment: ${textAnalysis.hasTextFragment}`);
  console.log(`   Raw Fragment: ${textAnalysis.rawFragment}`);
  console.log(`   Decoded Text: ${textAnalysis.decodedText}`);
  console.log(`   Components: ${JSON.stringify(textAnalysis.components, null, 2)}`);
  
  // Build custom text fragment
  const customFragment = docsURLBuilder.buildURLWithTextFragment(
    'https://bun.com/reference/api',
    'TypedArray methods',
    { 
      prefix: 'Bun', 
      suffix: 'documentation' 
    }
  );
  
  console.log('\n🛠️ Custom Text Fragment:');
  console.log(`   ${customFragment}`);
}

/**
 * Example 3: GitHub Integration
 */
async function githubIntegration() {
  console.log('\n🐙 GitHub Integration');
  console.log('='.repeat(50));
  
  // Get the specific commit URL you provided
  const commitURL = getGitHubBunTypesCommitURL();
  console.log('🔗 GitHub Commit URL:');
  console.log(`   ${commitURL}`);
  
  // Parse GitHub URL
  const parsed = EnhancedDocumentationURLValidator.parseGitHubURL(commitURL);
  console.log('\n🔍 Parsed GitHub URL:');
  console.log(`   Valid: ${parsed.isValid}`);
  console.log(`   Type: ${parsed.type}`);
  console.log(`   Owner: ${parsed.owner}`);
  console.log(`   Repo: ${parsed.repo}`);
  console.log(`   Commit Hash: ${parsed.commitHash}`);
  console.log(`   Path: ${parsed.path}`);
  console.log(`   File: ${parsed.file}`);
  
  // Extract commit hash
  const commitHash = EnhancedDocumentationURLValidator.extractCommitHash(commitURL);
  console.log(`\n🔑 Extracted Commit Hash: ${commitHash}`);
  
  // Check if it's a specific commit
  const isSpecific = EnhancedDocumentationURLValidator.isSpecificCommitURL(commitURL);
  console.log(`\n✅ Is Specific Commit: ${isSpecific}`);
  
  // Check if it's bun-types URL
  const isBunTypes = EnhancedDocumentationURLValidator.isBunTypesURL(commitURL);
  console.log(`\n📦 Is Bun Types URL: ${isBunTypes}`);
  
  // Get example commit metadata
  console.log('\n📋 Example Commit Metadata:');
  console.log(`   Hash: ${exampleCommit.hash}`);
  console.log(`   Short Hash: ${exampleCommit.shortHash}`);
  console.log(`   URL: ${exampleCommit.url}`);
  console.log(`   Date: ${exampleCommit.date}`);
  console.log(`   Description: ${exampleCommit.description}`);
  
  // Build different GitHub URLs
  console.log('\n🛠️ GitHub URL Building:');
  const treeURL = docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', 'main', 'packages/bun-types', 'tree');
  const blobURL = docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', 'main', 'packages/bun-types/index.d.ts', 'blob');
  const rawURL = docsURLBuilder.buildGitHubRawURL('main', 'packages/bun-types/index.d.ts');
  
  console.log(`   Tree URL: ${treeURL}`);
  console.log(`   Blob URL: ${blobURL}`);
  console.log(`   Raw URL: ${rawURL}`);
}

/**
 * Example 4: Enhanced URL Building
 */
async function enhancedURLBuilding() {
  console.log('\n🔗 Enhanced URL Building');
  console.log('='.repeat(50));
  
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
  
  console.log('📖 Documentation URL:');
  console.log(`   ${docURL}`);
  
  // Build interactive URL
  const interactiveURL = docs.buildInteractive({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'typedarray',
    runnable: true,
    editable: true,
    theme: 'auto',
    example: 'performance'
  });
  
  console.log('\n🎮 Interactive URL:');
  console.log(`   ${interactiveURL}`);
  
  // Build example URL
  const exampleURL = docs.buildExample({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'fetch',
    exampleName: 'http-request',
    language: 'typescript',
    highlight: true
  });
  
  console.log('\n💡 Example URL:');
  console.log(`   ${exampleURL}`);
  
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
  
  console.log('\n🔍 Search URL:');
  console.log(`   ${searchURL}`);
  
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
  
  console.log('\n🔗 Shareable Link:');
  console.log(`   ${shareableURL}`);
}

/**
 * Example 5: URL Validation
 */
async function urlValidation() {
  console.log('\n✅ URL Validation');
  console.log('='.repeat(50));
  
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
  
  console.log('🔍 Batch Validation Results:');
  validationResults.forEach(({ url, result }) => {
    console.log(`\n   URL: ${url}`);
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Provider: ${result.provider || 'Unknown'}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`);
    }
    
    if (result.metadata) {
      console.log(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
    }
  });
  
  // Get validation statistics
  const stats = EnhancedDocumentationURLValidator.getValidationStats(validationResults);
  
  console.log('\n📊 Validation Statistics:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Valid: ${stats.valid}`);
  console.log(`   Invalid: ${stats.invalid}`);
  console.log(`   Warnings: ${stats.warnings}`);
  
  console.log('\n   By Provider:');
  Object.entries(stats.byProvider).forEach(([provider, data]) => {
    console.log(`     ${provider}: ${data.valid}/${data.total} valid`);
  });
  
  console.log('\n   Common Errors:');
  stats.commonErrors.forEach(({ error, count }) => {
    console.log(`     ${error}: ${count}`);
  });
  
  console.log('\n   Common Warnings:');
  stats.commonWarnings.forEach(({ warning, count }) => {
    console.log(`     ${warning}: ${count}`);
  });
}

/**
 * Example 6: Fragment Utilities
 */
async function fragmentUtilities() {
  console.log('\n🔗 Fragment Utilities');
  console.log('='.repeat(50));
  
  // Fragment building
  console.log('🛠️ Fragment Building:');
  
  const navigationFragment = docs.fragment.build.navigation('overview', {
    theme: 'dark',
    interactive: 'true'
  });
  console.log(`   Navigation: ${JSON.stringify(navigationFragment)}`);
  
  const interactiveFragment = docs.fragment.build.interactive(true, {
    editable: 'true',
    theme: 'auto'
  });
  console.log(`   Interactive: ${JSON.stringify(interactiveFragment)}`);
  
  const exampleFragment = docs.fragment.build.example('http-request', {
    language: 'typescript',
    highlight: 'true'
  });
  console.log(`   Example: ${JSON.stringify(exampleFragment)}`);
  
  const searchFragment = docs.fragment.build.search('fetch timeout', {
    category: 'api',
    version: 'latest'
  });
  console.log(`   Search: ${JSON.stringify(searchFragment)}`);
  
  // Fragment parsing
  console.log('\n🔍 Fragment Parsing:');
  
  const testFragment = '#view=overview&theme=dark&interactive=true';
  const parsedStandard = docs.fragment.parse.parseStandard(testFragment);
  console.log(`   Standard Fragment: ${JSON.stringify(parsedStandard)}`);
  
  const textFragment = '#:~:text=node%3Azlib';
  const parsedText = docs.fragment.parse.parseTextFragment(textFragment);
  console.log(`   Text Fragment: ${JSON.stringify(parsedText)}`);
  
  const mixedFragment = '#view=overview&theme=dark#:~:text=Bun%20API%20Reference';
  const parsedMixed = docs.fragment.parse.parseMixed(mixedFragment);
  console.log(`   Mixed Fragment: ${JSON.stringify(parsedMixed)}`);
  
  // Text fragment specification
  console.log('\n📋 Text Fragment Specification:');
  console.log(`   Basic Pattern: ${docs.fragment.spec.BASIC}`);
  console.log(`   With Prefix: ${docs.fragment.spec.WITH_PREFIX}`);
  console.log(`   With Suffix: ${docs.fragment.spec.WITH_SUFFIX}`);
  console.log(`   Full Pattern: ${docs.fragment.spec.FULL}`);
  
  // Build custom text fragment
  const customTextFragment = docs.fragment.spec.build({
    textStart: 'TypedArray methods',
    prefix: 'Bun',
    suffix: 'reference'
  });
  console.log(`   Custom Text Fragment: ${customTextFragment}`);
}

/**
 * Example 7: All Critical URLs
 */
async function allCriticalURLs() {
  console.log('\n🌐 All Critical URLs');
  console.log('='.repeat(50));
  
  const allURLs = getAllCriticalURLs();
  
  console.log('📚 Reference Portal:');
  console.log(`   Main: ${allURLs.referencePortal.main}`);
  console.log(`   API: ${allURLs.referencePortal.api}`);
  console.log(`   CLI: ${allURLs.referencePortal.cli}`);
  
  console.log('\n📖 Guides Portal:');
  console.log(`   Main: ${allURLs.guidesPortal.main}`);
  console.log(`   Getting Started: ${allURLs.guidesPortal.gettingStarted}`);
  
  console.log('\n📰 RSS Feeds:');
  console.log(`   Main: ${allURLs.rssFeeds.main}`);
  console.log(`   Blog: ${allURLs.rssFeeds.blog}`);
  console.log(`   Technical: ${allURLs.rssFeeds.technical}`);
  
  console.log('\n🐙 GitHub Resources:');
  console.log(`   Repository: ${allURLs.github.repository}`);
  console.log(`   Bun Types Latest: ${allURLs.github.bunTypes.latest}`);
  console.log(`   Bun Types Specific Commit: ${allURLs.github.bunTypes.specificCommit}`);
  console.log(`   Bun Types NPM: ${allURLs.github.bunTypes.npm}`);
  
  console.log('\n📦 GitHub Packages:');
  Object.entries(allURLs.github.packages).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
  
  console.log('\n🔧 Technical Documentation:');
  console.log(`   TypedArray: ${allURLs.technicalDocs.typedArray}`);
  console.log(`   Fetch API: ${allURLs.technicalDocs.fetchAPI}`);
  console.log(`   Binary Data: ${allURLs.technicalDocs.binaryData}`);
  
  // Text fragment URLs
  console.log('\n🔍 Text Fragment URLs:');
  Object.entries(allURLs.referencePortal.textFragments).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
}

/**
 * Example 8: Provider Information
 */
async function providerInformation() {
  console.log('\n🏢 Provider Information');
  console.log('='.repeat(50));
  
  // Get all available providers
  const providers = docsURLBuilder.getAvailableProviders();
  
  console.log('📋 Available Providers:');
  providers.forEach(({ provider, metadata }) => {
    console.log(`\n   ${provider}:`);
    console.log(`     Name: ${metadata.name}`);
    console.log(`     Description: ${metadata.description}`);
    console.log(`     Supports Text Fragments: ${metadata.supportsTextFragments}`);
    console.log(`     Supports Search: ${metadata.supportsSearch}`);
    console.log(`     Last Updated: ${metadata.lastUpdated}`);
    console.log(`     Version: ${metadata.version}`);
  });
  
  // Get provider metadata for specific providers
  console.log('\n📊 Specific Provider Metadata:');
  
  const bunReferenceMeta = docsURLBuilder.getProviderMetadata(DocumentationProvider.BUN_REFERENCE);
  console.log(`\n   BUN_REFERENCE:`);
  console.log(`     ${JSON.stringify(bunReferenceMeta, null, 2)}`);
  
  const githubMeta = docsURLBuilder.getProviderMetadata(DocumentationProvider.GITHUB_PUBLIC);
  console.log(`\n   GITHUB_PUBLIC:`);
  console.log(`     ${JSON.stringify(githubMeta, null, 2)}`);
}

/**
 * Example 9: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.log('\n⚡ Quick Reference URLs');
  console.log('='.repeat(50));
  
  const quickRefs = docs.quick();
  
  console.log('🔗 Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    if (typeof url === 'string') {
      console.log(`   ${name}: ${url}`);
    } else {
      console.log(`\n   ${name}:`);
      Object.entries(url).forEach(([subName, subUrl]) => {
        console.log(`     ${subName}: ${subUrl}`);
      });
    }
  });
}

/**
 * Example 10: Real-world Usage Scenario
 */
async function realWorldUsageScenario() {
  console.log('\n🌍 Real-world Usage Scenario');
  console.log('='.repeat(50));
  
  // Scenario: Developer is looking for fetch timeout configuration
  console.log('👨‍💻 Developer Scenario: Finding Fetch Timeout Configuration');
  
  // 1. Search for fetch timeout
  const searchURL = docs.buildSearch({
    provider: DocumentationProvider.BUN_REFERENCE,
    query: 'fetch timeout configuration',
    category: DocumentationCategory.API_REFERENCE
  });
  
  console.log(`\n1️⃣ Search URL: ${searchURL}`);
  
  // 2. Navigate to specific documentation with interactive example
  const interactiveDocURL = docs.buildInteractive({
    provider: DocumentationProvider.BUN_REFERENCE,
    path: 'api/fetch',
    runnable: true,
    theme: 'dark',
    example: 'timeout-configuration'
  });
  
  console.log(`\n2️⃣ Interactive Documentation: ${interactiveDocURL}`);
  
  // 3. Get related GitHub commit for implementation details
  const githubCommitURL = docsURLBuilder.buildGitHubCommitURL(
    'oven-sh',
    'bun',
    'main',
    'src/js/fetch.ts',
    'blob'
  );
  
  console.log(`\n3️⃣ GitHub Implementation: ${githubCommitURL}`);
  
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
  
  console.log(`\n4️⃣ Shareable Team Link: ${shareableLink}`);
  
  // 5. Validate all URLs
  const scenarioURLs = [searchURL, interactiveDocURL, githubCommitURL, shareableLink];
  const validation = docs.validateBatch(scenarioURLs);
  
  console.log('\n5️⃣ URL Validation:');
  validation.forEach(({ url, result }) => {
    console.log(`   ${result.isValid ? '✅' : '❌'} ${url}`);
    if (!result.isValid) {
      console.log(`      Errors: ${result.errors.join(', ')}`);
    }
  });
  
  // 6. Generate comprehensive report
  console.log('\n📊 Scenario Summary:');
  console.log(`   Total URLs: ${scenarioURLs.length}`);
  console.log(`   Valid URLs: ${validation.filter(v => v.result.isValid).length}`);
  console.log(`   Providers Used: ${[...new Set(validation.map(v => v.result.provider).filter(Boolean))].join(', ')}`);
  
  console.log('\n🎯 Scenario Complete! Developer has all resources needed.');
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('📚 Enhanced Documentation Integration Examples');
  console.log('='.repeat(70));
  console.log('');
  
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
    
    console.log('\n✅ All enhanced documentation integration examples completed successfully!');
    console.log('');
    console.log('📋 Key Features Demonstrated:');
    console.log('   • Primary portal access (bun.com/reference, bun.com/guides, RSS)');
    console.log('   • Text fragment support (Scroll to Text Fragment)');
    console.log('   • GitHub integration (commit-specific URLs, parsing, validation)');
    console.log('   • Enhanced URL building (interactive, examples, search, shareable)');
    console.log('   • Comprehensive URL validation (batch processing, statistics)');
    console.log('   • Fragment utilities (building, parsing, validation)');
    console.log('   • Provider management (metadata, capabilities)');
    console.log('   • Quick reference URLs');
    console.log('   • Real-world usage scenarios');
    
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
