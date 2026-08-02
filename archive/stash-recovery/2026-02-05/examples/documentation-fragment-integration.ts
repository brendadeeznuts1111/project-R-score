#!/usr/bin/env bun

/**
 * 📚 Documentation Fragment Integration Examples
 * 
 * Comprehensive examples demonstrating enhanced documentation URLs
 * with fragment support, deep linking, and interactive features
 */

import { 
  DocumentationURLHandler,
  type DocumentationURLConfig 
} from '../lib/core/documentation-url-handler.ts';
import { 
  docs, 
  buildDocsUrl, 
  buildInteractiveDocsUrl, 
  buildExampleDocsUrl,
  DocReferenceResolver 
} from '../lib/docs/reference.ts';
import { 
  UtilityFactory,
  UtilsCategory,
  UTILITIES 
} from '../lib/docs/constants/utils.ts';
import { 
  CLIDocumentationHandler,
  CLICategory 
} from '../lib/core/cli-documentation-handler.ts';
import { URLHandler, URLFragmentUtils } from '../lib/core/url-handler.ts';

/**
 * Example 1: Basic Documentation URL Generation with Fragments
 */
async function basicDocumentationURLs() {
  console.log('📚 Basic Documentation URL Generation with Fragments');
  console.log('='.repeat(60));

  // Generate basic documentation URLs
  const basicConfig: DocumentationURLConfig = {
    type: 'bun',
    category: 'api',
    fragment: {
      view: 'overview',
      theme: 'auto'
    }
  };

  const basicURL = DocumentationURLHandler.generateDocumentationURL(basicConfig);
  console.log('🔗 Basic Documentation URL:');
  console.log(`   ${basicURL}`);

  // Generate utilities documentation with category
  const utilsConfig: DocumentationURLConfig = {
    type: 'utils',
    category: UtilsCategory.FILE_SYSTEM,
    fragment: {
      example: 'readFile',
      interactive: 'true'
    }
  };

  const utilsURL = DocumentationURLHandler.generateDocumentationURL(utilsConfig);
  console.log('\n🔧 Utils Documentation URL:');
  console.log(`   ${utilsURL}`);

  // Generate CLI documentation with page
  const cliConfig: DocumentationURLConfig = {
    type: 'cli',
    category: CLICategory.COMMANDS,
    page: 'TEST',
    fragment: {
      example: 'basic',
      highlight: 'true'
    }
  };

  const cliURL = DocumentationURLHandler.generateDocumentationURL(cliConfig);
  console.log('\n💻 CLI Documentation URL:');
  console.log(`   ${cliURL}`);
}

/**
 * Example 2: Enhanced URL Parsing and Fragment Extraction
 */
async function enhancedURLParsing() {
  console.log('\n🔍 Enhanced URL Parsing and Fragment Extraction');
  console.log('='.repeat(60));

  // Create a complex documentation URL
  const complexURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'utils',
    category: UtilsCategory.NETWORKING,
    page: 'FETCH',
    fragment: {
      example: 'http-request',
      interactive: 'true',
      theme: 'dark',
      editable: 'true',
      section: 'configuration'
    },
    search: {
      q: 'fetch timeout',
      sort: 'relevance'
    }
  });

  console.log('🔗 Complex Documentation URL:');
  console.log(`   ${complexURL}`);

  // Parse the URL
  const parsed = DocumentationURLHandler.parseDocumentationURL(complexURL);
  console.log('\n🔍 Parsed URL Components:');
  console.log(`   Valid: ${parsed.valid}`);
  console.log(`   Type: ${parsed.type}`);
  console.log(`   Category: ${parsed.category}`);
  console.log(`   Page: ${parsed.page}`);
  console.log(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  console.log(`   Search: ${JSON.stringify(parsed.search, null, 2)}`);
  console.log(`   Pattern: ${parsed.pattern}`);
  console.log(`   Groups: ${JSON.stringify(parsed.groups, null, 2)}`);
}

/**
 * Example 3: Interactive Documentation Links
 */
async function interactiveDocumentationLinks() {
  console.log('\n🎮 Interactive Documentation Links');
  console.log('='.repeat(60));

  // Generate interactive utilities links
  const interactiveUtils = DocumentationURLHandler.generateDocumentationURL({
    type: 'utils',
    category: UtilsCategory.FILE_SYSTEM,
    fragment: {
      interactive: 'true',
      runnable: 'true',
      editable: 'true',
      theme: 'auto',
      example: 'file-operations'
    }
  });

  console.log('🎮 Interactive Utils Documentation:');
  console.log(`   ${interactiveUtils}`);

  // Generate example with syntax highlighting
  const exampleURL = DocumentationURLHandler.generateExampleURL({
    type: 'bun',
    category: 'api',
    example: 'import { readFile } from "bun";\nconst content = await readFile("file.txt");',
    language: 'typescript',
    highlight: true,
    fragment: {
      runnable: 'true',
      copyable: 'true'
    }
  });

  console.log('\n💡 Syntax-Highlighted Example:');
  console.log(`   ${exampleURL}`);

  // Generate comparison URL
  const comparisonURL = DocumentationURLHandler.generateComparisonURL([
    { name: 'Bun readFile', url: 'https://bun.sh/docs/api/utils#readfile', type: 'bun' },
    { name: 'Node fs.readFile', url: 'https://nodejs.org/api/fs.html#fsreadfilepath-options-callback', type: 'custom' }
  ], {
    category: 'file-system',
    performance: 'true'
  });

  console.log('\n⚖️ Performance Comparison:');
  console.log(`   ${comparisonURL}`);
}

/**
 * Example 4: Breadcrumb Navigation Generation
 */
async function breadcrumbNavigation() {
  console.log('\n🍞 Breadcrumb Navigation Generation');
  console.log('='.repeat(60));

  // Generate breadcrumbs for different URL types
  const urls = [
    DocumentationURLHandler.generateDocumentationURL({
      type: 'bun',
      category: 'api',
      page: 'utils',
      fragment: { example: 'readFile' }
    }),
    DocumentationURLHandler.generateDocumentationURL({
      type: 'utils',
      category: UtilsCategory.VALIDATION,
      page: 'IS_STRING',
      fragment: { interactive: 'true' }
    }),
    DocumentationURLHandler.generateDocumentationURL({
      type: 'cli',
      category: CLICategory.INSTALLATION,
      page: 'WINDOWS',
      fragment: { platform: 'windows' }
    })
  ];

  urls.forEach((url, index) => {
    const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(url);
    console.log(`\n📍 URL ${index + 1}:`);
    console.log(`   ${url}`);
    console.log('   Breadcrumbs:');
    breadcrumbs.forEach((crumb, i) => {
      const arrow = i < breadcrumbs.length - 1 ? ' > ' : '';
      console.log(`     ${crumb.name}${arrow}`);
    });
  });
}

/**
 * Example 5: Enhanced Docs Reference Integration
 */
async function enhancedDocsReference() {
  console.log('\n📖 Enhanced Docs Reference Integration');
  console.log('='.repeat(60));

  // Use enhanced docs reference with fragments
  const typedArrayURL = docs.getUrlWithFragment('MEMORY_POOL', {
    interactive: 'true',
    example: 'shared-array-buffer',
    performance: 'true'
  });

  console.log('🔗 Enhanced Typed Array URL:');
  console.log(`   ${typedArrayURL}`);

  // Parse with fragment support
  const parsed = docs.parseUrlWithFragments(typedArrayURL);
  console.log('\n🔍 Parsed with Fragments:');
  console.log(`   Valid: ${parsed.valid}`);
  console.log(`   Pattern: ${parsed.pattern}`);
  console.log(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  console.log(`   Anchor: ${parsed.anchor}`);

  // Generate interactive links
  const interactiveLinks = docs.generateInteractiveLinks();
  console.log('\n🎮 Interactive Documentation Links:');
  interactiveLinks.forEach(link => {
    console.log(`   ${link.name}:`);
    console.log(`     URL: ${link.url}`);
    console.log(`     Fragment: ${JSON.stringify(link.fragment, null, 2)}`);
    console.log(`     Description: ${link.description}`);
  });

  // Generate markdown table with fragments
  const markdownTable = docs.generateMarkdownTable('Enhanced Documentation References', true);
  console.log('\n📋 Markdown Table with Fragments:');
  console.log(markdownTable);
}

/**
 * Example 6: Enhanced Utility Factory with Fragments
 */
async function enhancedUtilityFactory() {
  console.log('\n🔧 Enhanced Utility Factory with Fragments');
  console.log('='.repeat(60));

  // Create interactive utility
  const interactiveUtility = UtilityFactory.createInteractive({
    id: 'interactive_fetch',
    name: 'Interactive Fetch',
    category: UtilsCategory.NETWORKING,
    docUrl: 'https://bun.sh/docs/api/utils#fetch-utility',
    description: 'Interactive HTTP client with real-time examples',
    exampleCode: `import { fetch } from 'bun';
const response = await fetch('https://api.example.com/data');
const data = await response.json();`,
    options: {
      runnable: true,
      editable: true,
      theme: 'dark'
    }
  });

  console.log('🎮 Interactive Utility:');
  console.log(`   ID: ${interactiveUtility.id}`);
  console.log(`   Name: ${interactiveUtility.name}`);
  console.log(`   URL: ${interactiveUtility.docUrl}`);
  console.log(`   Fragment: ${JSON.stringify(interactiveUtility.fragment, null, 2)}`);

  // Create utility with example highlighting
  const exampleUtility = UtilityFactory.createWithExample({
    id: 'validation_example',
    name: 'Validation Example',
    category: UtilsCategory.VALIDATION,
    docUrl: 'https://bun.sh/docs/api/utils#isstring',
    description: 'Type validation with syntax highlighting',
    exampleCode: `import { isString } from 'bun';
const value = 'hello world';
if (isString(value)) {
  console.log(value.toUpperCase());
}`,
    exampleName: 'type-validation',
    language: 'typescript'
  });

  console.log('\n💡 Example-Highlighted Utility:');
  console.log(`   ID: ${exampleUtility.id}`);
  console.log(`   URL: ${exampleUtility.docUrl}`);
  console.log(`   Fragment: ${JSON.stringify(exampleUtility.fragment, null, 2)}`);

  // Update existing utilities with fragments
  const enhancedUtilities = UTILITIES.map(utility => ({
    ...utility,
    fragment: {
      interactive: 'true',
      category: utility.category,
      utility: utility.id
    }
  }));

  console.log(`\n📊 Enhanced ${enhancedUtilities.length} utilities with fragments`);
}

/**
 * Example 7: CLI Documentation with Fragment Support
 */
async function cliDocumentationFragments() {
  console.log('\n💻 CLI Documentation with Fragment Support');
  console.log('='.repeat(60));

  // Generate CLI documentation with navigation state
  const cliURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'TEST',
    {
      view: 'examples',
      example: 'watch-mode',
      highlight: 'true',
      theme: 'dark'
    }
  );

  console.log('💻 CLI Documentation URL:');
  console.log(`   ${cliURL}`);

  // Parse CLI URL
  const parsedCLI = CLIDocumentationHandler.parseDocumentationURL(cliURL);
  console.log('\n🔍 Parsed CLI Documentation:');
  console.log(`   Valid: ${parsedCLI.valid}`);
  console.log(`   Category: ${parsedCLI.category}`);
  console.log(`   Page: ${parsedCLI.page}`);
  console.log(`   Fragment: ${JSON.stringify(parsedCLI.fragment, null, 2)}`);

  // Generate shareable CLI link
  const shareableCLI = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.INSTALLATION,
    page: 'MACOS',
    section: 'homebrew',
    example: 'brew-install'
  }, 3600);

  console.log('\n🔗 Shareable CLI Link:');
  console.log(`   ${shareableCLI}`);

  // Generate CLI search
  const searchURL = CLIDocumentationHandler.generateSearchURL('build scripts', CLICategory.COMMANDS, {
    filter: 'examples',
    sort: 'relevance'
  });

  console.log('\n🔍 CLI Search URL:');
  console.log(`   ${searchURL}`);
}

/**
 * Example 8: Documentation Search and Discovery
 */
async function documentationSearch() {
  console.log('\n🔍 Documentation Search and Discovery');
  console.log('='.repeat(60));

  // Search utilities
  const searchResults = DocumentationURLHandler.getAvailableCategories('utils');
  console.log('📚 Available Utils Categories:');
  searchResults.forEach(category => {
    console.log(`   ${category.category}: ${category.url}`);
  });

  // Generate search URLs
  const searchURLs = [
    DocumentationURLHandler.generateSearchURL('file operations', 'utils'),
    DocumentationURLHandler.generateSearchURL('testing', 'cli', {
      category: CLICategory.COMMANDS,
      fragment: { filter: 'examples' }
    }),
    DocumentationURLHandler.generateSearchURL('performance optimization', 'bun')
  ];

  console.log('\n🔍 Generated Search URLs:');
  searchURLs.forEach((url, index) => {
    console.log(`   Search ${index + 1}: ${url}`);
  });

  // Parse search URLs
  searchURLs.forEach((url, index) => {
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);
    console.log(`\n🔍 Search ${index + 1} Parsed:`);
    console.log(`   Type: ${parsed.type}`);
    console.log(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  });
}

/**
 * Example 9: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.log('\n🚀 Quick Reference URLs');
  console.log('='.repeat(60));

  // Generate quick reference URLs
  const quickRefs = DocumentationURLHandler.generateQuickReferenceURLs();
  console.log('🚀 Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });

  // Validate all quick reference URLs
  console.log('\n✅ Quick Reference Validation:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    const isValid = DocumentationURLHandler.validateDocumentationURL(url);
    console.log(`   ${name}: ${isValid ? '✅' : '❌'}`);
  });

  // Parse a few quick reference URLs
  const urlsToParse = [quickRefs.utilsMain, quickRefs.bunCLI, quickRefs.search];
  urlsToParse.forEach((url, index) => {
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);
    console.log(`\n🔍 Quick Ref ${index + 1}:`);
    console.log(`   URL: ${url}`);
    console.log(`   Valid: ${parsed.valid}`);
    console.log(`   Type: ${parsed.type}`);
    console.log(`   Category: ${parsed.category}`);
  });
}

/**
 * Example 10: Real-world Documentation Workflow
 */
async function realWorldDocumentationWorkflow() {
  console.log('\n🌍 Real-world Documentation Workflow');
  console.log('='.repeat(60));

  // Simulate a developer learning workflow
  console.log('👨‍💻 Developer Learning Workflow:');

  // 1. Start with basic documentation
  const startURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'bun',
    fragment: {
      welcome: 'true',
      level: 'beginner'
    }
  });
  console.log(`\n1️⃣ Starting Point: ${startURL}`);

  // 2. Move to utilities with interactive examples
  const utilsURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'utils',
    category: UtilsCategory.FILE_SYSTEM,
    fragment: {
      interactive: 'true',
      runnable: 'true',
      example: 'file-operations',
      level: 'beginner'
    }
  });
  console.log(`\n2️⃣ Learn File Operations: ${utilsURL}`);

  // 3. Progress to advanced networking
  const networkingURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'utils',
    category: UtilsCategory.NETWORKING,
    page: 'FETCH',
    fragment: {
      interactive: 'true',
      advanced: 'true',
      example: 'http-client',
      performance: 'true'
    }
  });
  console.log(`\n3️⃣ Advanced Networking: ${networkingURL}`);

  // 4. Learn CLI for project setup
  const cliURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'cli',
    category: CLICategory.COMMANDS,
    fragment: {
      workflow: 'project-setup',
      examples: 'true',
      interactive: 'true'
    }
  });
  console.log(`\n4️⃣ CLI Project Setup: ${cliURL}`);

  // 5. Create shareable learning path
  const learningPath = DocumentationURLHandler.generateShareableLink({
    type: 'bun',
    fragment: {
      learning_path: 'beginner-to-advanced',
      steps: 'basics,utils,networking,cli',
      duration: '2-hours',
      level: 'intermediate'
    }
  }, 86400); // 24 hours

  console.log(`\n5️⃣ Shareable Learning Path: ${learningPath}`);

  // 6. Generate breadcrumbs for navigation
  const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(cliURL);
  console.log('\n🍞 Navigation Breadcrumbs:');
  breadcrumbs.forEach((crumb, i) => {
    const arrow = i < breadcrumbs.length - 1 ? ' > ' : '';
    console.log(`   ${crumb.name}${arrow}`);
  });

  // 7. Validate the entire workflow
  const workflowURLs = [startURL, utilsURL, networkingURL, cliURL, learningPath];
  console.log('\n✅ Workflow Validation:');
  workflowURLs.forEach((url, index) => {
    const isValid = DocumentationURLHandler.validateDocumentationURL(url);
    console.log(`   Step ${index + 1}: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('📚 Documentation Fragment Integration Examples');
  console.log('='.repeat(70));
  console.log('');

  try {
    await basicDocumentationURLs();
    await enhancedURLParsing();
    await interactiveDocumentationLinks();
    await breadcrumbNavigation();
    await enhancedDocsReference();
    await enhancedUtilityFactory();
    await cliDocumentationFragments();
    await documentationSearch();
    await quickReferenceURLs();
    await realWorldDocumentationWorkflow();

    console.log('\n✅ All documentation fragment integration examples completed successfully!');
    console.log('');
    console.log('📋 Key Features Demonstrated:');
    console.log('   • Enhanced URL generation with fragment support');
    console.log('   • Advanced URL parsing and fragment extraction');
    console.log('   • Interactive documentation links');
    console.log('   • Breadcrumb navigation generation');
    console.log('   • Enhanced docs reference integration');
    console.log('   • Utility factory with fragment support');
    console.log('   • CLI documentation with fragments');
    console.log('   • Documentation search and discovery');
    console.log('   • Quick reference URLs');
    console.log('   • Real-world documentation workflows');

  } catch (error) {
    console.error('❌ Error in documentation fragment integration examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main();
}

export {
  basicDocumentationURLs,
  enhancedURLParsing,
  interactiveDocumentationLinks,
  breadcrumbNavigation,
  enhancedDocsReference,
  enhancedUtilityFactory,
  cliDocumentationFragments,
  documentationSearch,
  quickReferenceURLs,
  realWorldDocumentationWorkflow
};
