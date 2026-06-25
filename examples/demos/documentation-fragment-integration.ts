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
  console.info('📚 Basic Documentation URL Generation with Fragments');
  console.info('='.repeat(60));

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
  console.info('🔗 Basic Documentation URL:');
  console.info(`   ${basicURL}`);

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
  console.info('\n🔧 Utils Documentation URL:');
  console.info(`   ${utilsURL}`);

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
  console.info('\n💻 CLI Documentation URL:');
  console.info(`   ${cliURL}`);
}

/**
 * Example 2: Enhanced URL Parsing and Fragment Extraction
 */
async function enhancedURLParsing() {
  console.info('\n🔍 Enhanced URL Parsing and Fragment Extraction');
  console.info('='.repeat(60));

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

  console.info('🔗 Complex Documentation URL:');
  console.info(`   ${complexURL}`);

  // Parse the URL
  const parsed = DocumentationURLHandler.parseDocumentationURL(complexURL);
  console.info('\n🔍 Parsed URL Components:');
  console.info(`   Valid: ${parsed.valid}`);
  console.info(`   Type: ${parsed.type}`);
  console.info(`   Category: ${parsed.category}`);
  console.info(`   Page: ${parsed.page}`);
  console.info(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  console.info(`   Search: ${JSON.stringify(parsed.search, null, 2)}`);
  console.info(`   Pattern: ${parsed.pattern}`);
  console.info(`   Groups: ${JSON.stringify(parsed.groups, null, 2)}`);
}

/**
 * Example 3: Interactive Documentation Links
 */
async function interactiveDocumentationLinks() {
  console.info('\n🎮 Interactive Documentation Links');
  console.info('='.repeat(60));

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

  console.info('🎮 Interactive Utils Documentation:');
  console.info(`   ${interactiveUtils}`);

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

  console.info('\n💡 Syntax-Highlighted Example:');
  console.info(`   ${exampleURL}`);

  // Generate comparison URL
  const comparisonURL = DocumentationURLHandler.generateComparisonURL([
    { name: 'Bun readFile', url: 'https://bun.sh/docs/api/utils#readfile', type: 'bun' },
    { name: 'Node fs.readFile', url: 'https://nodejs.org/api/fs.html#fsreadfilepath-options-callback', type: 'custom' }
  ], {
    category: 'file-system',
    performance: 'true'
  });

  console.info('\n⚖️ Performance Comparison:');
  console.info(`   ${comparisonURL}`);
}

/**
 * Example 4: Breadcrumb Navigation Generation
 */
async function breadcrumbNavigation() {
  console.info('\n🍞 Breadcrumb Navigation Generation');
  console.info('='.repeat(60));

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
    console.info(`\n📍 URL ${index + 1}:`);
    console.info(`   ${url}`);
    console.info('   Breadcrumbs:');
    breadcrumbs.forEach((crumb, i) => {
      const arrow = i < breadcrumbs.length - 1 ? ' > ' : '';
      console.info(`     ${crumb.name}${arrow}`);
    });
  });
}

/**
 * Example 5: Enhanced Docs Reference Integration
 */
async function enhancedDocsReference() {
  console.info('\n📖 Enhanced Docs Reference Integration');
  console.info('='.repeat(60));

  // Use enhanced docs reference with fragments
  const typedArrayURL = docs.getUrlWithFragment('MEMORY_POOL', {
    interactive: 'true',
    example: 'shared-array-buffer',
    performance: 'true'
  });

  console.info('🔗 Enhanced Typed Array URL:');
  console.info(`   ${typedArrayURL}`);

  // Parse with fragment support
  const parsed = docs.parseUrlWithFragments(typedArrayURL);
  console.info('\n🔍 Parsed with Fragments:');
  console.info(`   Valid: ${parsed.valid}`);
  console.info(`   Pattern: ${parsed.pattern}`);
  console.info(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  console.info(`   Anchor: ${parsed.anchor}`);

  // Generate interactive links
  const interactiveLinks = docs.generateInteractiveLinks();
  console.info('\n🎮 Interactive Documentation Links:');
  interactiveLinks.forEach(link => {
    console.info(`   ${link.name}:`);
    console.info(`     URL: ${link.url}`);
    console.info(`     Fragment: ${JSON.stringify(link.fragment, null, 2)}`);
    console.info(`     Description: ${link.description}`);
  });

  // Generate markdown table with fragments
  const markdownTable = docs.generateMarkdownTable('Enhanced Documentation References', true);
  console.info('\n📋 Markdown Table with Fragments:');
  console.info(markdownTable);
}

/**
 * Example 6: Enhanced Utility Factory with Fragments
 */
async function enhancedUtilityFactory() {
  console.info('\n🔧 Enhanced Utility Factory with Fragments');
  console.info('='.repeat(60));

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

  console.info('🎮 Interactive Utility:');
  console.info(`   ID: ${interactiveUtility.id}`);
  console.info(`   Name: ${interactiveUtility.name}`);
  console.info(`   URL: ${interactiveUtility.docUrl}`);
  console.info(`   Fragment: ${JSON.stringify(interactiveUtility.fragment, null, 2)}`);

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
  console.info(value.toUpperCase());
}`,
    exampleName: 'type-validation',
    language: 'typescript'
  });

  console.info('\n💡 Example-Highlighted Utility:');
  console.info(`   ID: ${exampleUtility.id}`);
  console.info(`   URL: ${exampleUtility.docUrl}`);
  console.info(`   Fragment: ${JSON.stringify(exampleUtility.fragment, null, 2)}`);

  // Update existing utilities with fragments
  const enhancedUtilities = UTILITIES.map(utility => ({
    ...utility,
    fragment: {
      interactive: 'true',
      category: utility.category,
      utility: utility.id
    }
  }));

  console.info(`\n📊 Enhanced ${enhancedUtilities.length} utilities with fragments`);
}

/**
 * Example 7: CLI Documentation with Fragment Support
 */
async function cliDocumentationFragments() {
  console.info('\n💻 CLI Documentation with Fragment Support');
  console.info('='.repeat(60));

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

  console.info('💻 CLI Documentation URL:');
  console.info(`   ${cliURL}`);

  // Parse CLI URL
  const parsedCLI = CLIDocumentationHandler.parseDocumentationURL(cliURL);
  console.info('\n🔍 Parsed CLI Documentation:');
  console.info(`   Valid: ${parsedCLI.valid}`);
  console.info(`   Category: ${parsedCLI.category}`);
  console.info(`   Page: ${parsedCLI.page}`);
  console.info(`   Fragment: ${JSON.stringify(parsedCLI.fragment, null, 2)}`);

  // Generate shareable CLI link
  const shareableCLI = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.INSTALLATION,
    page: 'MACOS',
    section: 'homebrew',
    example: 'brew-install'
  }, 3600);

  console.info('\n🔗 Shareable CLI Link:');
  console.info(`   ${shareableCLI}`);

  // Generate CLI search
  const searchURL = CLIDocumentationHandler.generateSearchURL('build scripts', CLICategory.COMMANDS, {
    filter: 'examples',
    sort: 'relevance'
  });

  console.info('\n🔍 CLI Search URL:');
  console.info(`   ${searchURL}`);
}

/**
 * Example 8: Documentation Search and Discovery
 */
async function documentationSearch() {
  console.info('\n🔍 Documentation Search and Discovery');
  console.info('='.repeat(60));

  // Search utilities
  const searchResults = DocumentationURLHandler.getAvailableCategories('utils');
  console.info('📚 Available Utils Categories:');
  searchResults.forEach(category => {
    console.info(`   ${category.category}: ${category.url}`);
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

  console.info('\n🔍 Generated Search URLs:');
  searchURLs.forEach((url, index) => {
    console.info(`   Search ${index + 1}: ${url}`);
  });

  // Parse search URLs
  searchURLs.forEach((url, index) => {
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);
    console.info(`\n🔍 Search ${index + 1} Parsed:`);
    console.info(`   Type: ${parsed.type}`);
    console.info(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
  });
}

/**
 * Example 9: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.info('\n🚀 Quick Reference URLs');
  console.info('='.repeat(60));

  // Generate quick reference URLs
  const quickRefs = DocumentationURLHandler.generateQuickReferenceURLs();
  console.info('🚀 Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    console.info(`   ${name}: ${url}`);
  });

  // Validate all quick reference URLs
  console.info('\n✅ Quick Reference Validation:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    const isValid = DocumentationURLHandler.validateDocumentationURL(url);
    console.info(`   ${name}: ${isValid ? '✅' : '❌'}`);
  });

  // Parse a few quick reference URLs
  const urlsToParse = [quickRefs.utilsMain, quickRefs.bunCLI, quickRefs.search];
  urlsToParse.forEach((url, index) => {
    const parsed = DocumentationURLHandler.parseDocumentationURL(url);
    console.info(`\n🔍 Quick Ref ${index + 1}:`);
    console.info(`   URL: ${url}`);
    console.info(`   Valid: ${parsed.valid}`);
    console.info(`   Type: ${parsed.type}`);
    console.info(`   Category: ${parsed.category}`);
  });
}

/**
 * Example 10: Real-world Documentation Workflow
 */
async function realWorldDocumentationWorkflow() {
  console.info('\n🌍 Real-world Documentation Workflow');
  console.info('='.repeat(60));

  // Simulate a developer learning workflow
  console.info('👨‍💻 Developer Learning Workflow:');

  // 1. Start with basic documentation
  const startURL = DocumentationURLHandler.generateDocumentationURL({
    type: 'bun',
    fragment: {
      welcome: 'true',
      level: 'beginner'
    }
  });
  console.info(`\n1️⃣ Starting Point: ${startURL}`);

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
  console.info(`\n2️⃣ Learn File Operations: ${utilsURL}`);

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
  console.info(`\n3️⃣ Advanced Networking: ${networkingURL}`);

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
  console.info(`\n4️⃣ CLI Project Setup: ${cliURL}`);

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

  console.info(`\n5️⃣ Shareable Learning Path: ${learningPath}`);

  // 6. Generate breadcrumbs for navigation
  const breadcrumbs = DocumentationURLHandler.generateBreadcrumbs(cliURL);
  console.info('\n🍞 Navigation Breadcrumbs:');
  breadcrumbs.forEach((crumb, i) => {
    const arrow = i < breadcrumbs.length - 1 ? ' > ' : '';
    console.info(`   ${crumb.name}${arrow}`);
  });

  // 7. Validate the entire workflow
  const workflowURLs = [startURL, utilsURL, networkingURL, cliURL, learningPath];
  console.info('\n✅ Workflow Validation:');
  workflowURLs.forEach((url, index) => {
    const isValid = DocumentationURLHandler.validateDocumentationURL(url);
    console.info(`   Step ${index + 1}: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * Main demonstration function
 */
async function main() {
  console.info('📚 Documentation Fragment Integration Examples');
  console.info('='.repeat(70));
  console.info('');

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

    console.info('\n✅ All documentation fragment integration examples completed successfully!');
    console.info('');
    console.info('📋 Key Features Demonstrated:');
    console.info('   • Enhanced URL generation with fragment support');
    console.info('   • Advanced URL parsing and fragment extraction');
    console.info('   • Interactive documentation links');
    console.info('   • Breadcrumb navigation generation');
    console.info('   • Enhanced docs reference integration');
    console.info('   • Utility factory with fragment support');
    console.info('   • CLI documentation with fragments');
    console.info('   • Documentation search and discovery');
    console.info('   • Quick reference URLs');
    console.info('   • Real-world documentation workflows');

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
