#!/usr/bin/env bun

/**
 * 📚 CLI Documentation Integration Examples
 * 
 * Comprehensive examples demonstrating CLI documentation with URL fragment support
 */

import { 
  CLIDocumentationHandler, 
  CLIExampleGenerator, 
  CLIDocumentationSearch 
} from '../lib/core/cli-documentation-handler.ts';
import { CLICategory, CLI_COMMAND_EXAMPLES } from '../lib/documentation/constants/cli.ts';
import { cliDocumentationMCPServer } from '../lib/mcp/cli-documentation-mcp.ts';
import { URLHandler, URLFragmentUtils } from '../lib/core/url-handler.ts';

/**
 * Example 1: Basic CLI Documentation URL Generation
 */
async function basicDocumentationURLs() {
  console.log('📚 Basic CLI Documentation URL Generation');
  console.log('='.repeat(50));

  // Generate various documentation URLs
  const installURL = CLIDocumentationHandler.generateInstallationURL('windows', {
    platform: 'windows',
    version: 'latest'
  });

  const testURL = CLIDocumentationHandler.generateCommandURL('TEST', {
    example: 'basic',
    highlight: 'true'
  });

  const debugURL = CLIDocumentationHandler.generateDebuggingURL('logging', {
    level: 'verbose',
    format: 'json'
  });

  console.log('🔗 Generated Documentation URLs:');
  console.log(`   Windows Installation: ${installURL}`);
  console.log(`   Test Command: ${testURL}`);
  console.log(`   Debug Logging: ${debugURL}`);

  // Parse generated URLs
  const parsedTest = CLIDocumentationHandler.parseDocumentationURL(testURL);
  console.log('\n🔍 Parsed Test URL:');
  console.log(`   Valid: ${parsedTest.valid}`);
  console.log(`   Category: ${parsedTest.category}`);
  console.log(`   Page: ${parsedTest.page}`);
  console.log(`   Fragment: ${JSON.stringify(parsedTest.fragment, null, 2)}`);
}

/**
 * Example 2: Advanced Fragment Operations
 */
async function advancedFragmentOperations() {
  console.log('\n🧩 Advanced Fragment Operations');
  console.log('='.repeat(50));

  // Create URL with multiple fragment parameters
  let url = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'BUILD',
    {
      example: 'production',
      target: 'browser',
      minify: 'true',
      sourcemap: 'external'
    }
  );

  console.log('🔗 Complex Documentation URL:');
  console.log(`   ${url}`);

  // Modify fragment parameters
  url = URLFragmentUtils.setFragmentParam(url, 'minify', 'false');
  url = URLFragmentUtils.setFragmentParam(url, 'splitting', 'true');
  url = URLFragmentUtils.removeFragmentParam(url, 'sourcemap');

  console.log('\n✏️ Modified URL:');
  console.log(`   ${url}`);

  // Extract specific fragment values
  const target = URLFragmentUtils.getFragmentParam(url, 'target');
  const minify = URLFragmentUtils.getFragmentParam(url, 'minify');
  const splitting = URLFragmentUtils.getFragmentParam(url, 'splitting');

  console.log('\n🔍 Fragment Parameters:');
  console.log(`   Target: ${target}`);
  console.log(`   Minify: ${minify}`);
  console.log(`   Splitting: ${splitting}`);
}

/**
 * Example 3: CLI Documentation Search
 */
async function documentationSearch() {
  console.log('\n🔍 CLI Documentation Search');
  console.log('='.repeat(50));

  const searchQueries = ['test', 'build', 'install', 'debug'];

  for (const query of searchQueries) {
    const results = CLIDocumentationSearch.searchCommands(query);
    const searchURL = CLIDocumentationSearch.generateSearchResultsURL(query, results);

    console.log(`\n🔍 Search for "${query}":`);
    console.log(`   Found ${results.length} results`);
    
    results.slice(0, 3).forEach(result => {
      console.log(`     📋 ${result.command} (${result.category})`);
      console.log(`        ${result.description}`);
    });

    console.log(`   🔗 Search URL: ${searchURL}`);
  }
}

/**
 * Example 4: Interactive Examples Generation
 */
async function interactiveExamples() {
  console.log('\n💡 Interactive Examples Generation');
  console.log('='.repeat(50));

  // Generate example with syntax highlighting
  const testExample = CLIExampleGenerator.generateExampleWithHighlighting(
    'BASIC',
    'TEST',
    'bun test --watch'
  );

  const buildExample = CLIExampleGenerator.generateExampleWithHighlighting(
    'ADVANCED',
    'BUILD',
    'bun build ./src/index.ts --outdir ./dist --target browser'
  );

  console.log('🎨 Syntax-Highlighted Examples:');
  console.log(`   Test Example: ${testExample}`);
  console.log(`   Build Example: ${buildExample}`);

  // Generate interactive examples
  const interactiveTest = CLIExampleGenerator.generateInteractiveExample('bun test', {
    runnable: true,
    editable: true,
    theme: 'dark'
  });

  const interactiveDev = CLIExampleGenerator.generateInteractiveExample('bun run dev', {
    runnable: true,
    editable: false,
    theme: 'light'
  });

  console.log('\n🚀 Interactive Examples:');
  console.log(`   Interactive Test: ${interactiveTest}`);
  console.log(`   Interactive Dev: ${interactiveDev}`);

  // Generate comparison examples
  const comparison = CLIExampleGenerator.generateComparisonURL(
    'bun install lodash',
    'npm install lodash',
    {
      category: 'package-management',
      showTiming: 'true'
    }
  );

  console.log('\n⚖️ Comparison Example:');
  console.log(`   Bun vs NPM: ${comparison}`);
}

/**
 * Example 5: Navigation Structure
 */
async function navigationStructure() {
  console.log('\n🧭 Navigation Structure');
  console.log('='.repeat(50));

  const navigation = CLIDocumentationHandler.generateNavigationStructure();

  console.log('📋 CLI Documentation Navigation:');
  navigation.forEach(({ category, title, pages }) => {
    console.log(`\n📂 ${title} (${category}):`);
    pages.slice(0, 5).forEach(page => {
      console.log(`   📄 ${page.name}`);
      console.log(`      ${page.url}`);
      if (page.fragment) {
        console.log(`      Fragment: ${JSON.stringify(page.fragment)}`);
      }
    });
    
    if (pages.length > 5) {
      console.log(`   ... and ${pages.length - 5} more pages`);
    }
  });

  // Generate breadcrumbs
  const testURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'TEST',
    { example: 'basic' }
  );

  const breadcrumbs = CLIDocumentationHandler.generateBreadcrumbs(testURL);
  console.log('\n🍞 Breadcrumbs for Test Documentation:');
  breadcrumbs.forEach((crumb, index) => {
    const arrow = index < breadcrumbs.length - 1 ? ' > ' : '';
    console.log(`   ${crumb.name}${arrow}`);
  });
}

/**
 * Example 6: Shareable Documentation Links
 */
async function shareableLinks() {
  console.log('\n🔗 Shareable Documentation Links');
  console.log('='.repeat(50));

  // Create shareable links with context
  const quickStartLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.INSTALLATION,
    page: 'MAIN',
    section: 'quick-start'
  }, 3600); // 1 hour expiry

  const testingGuideLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.COMMANDS,
    page: 'TEST',
    command: 'bun test',
    section: 'examples',
    example: 'basic'
  }, 7200); // 2 hours expiry

  const debuggingSetupLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.DEBUGGING,
    page: 'LOGGING',
    section: 'setup'
  }, 1800); // 30 minutes expiry

  console.log('🔗 Generated Shareable Links:');
  console.log(`   Quick Start: ${quickStartLink}`);
  console.log(`   Testing Guide: ${testingGuideLink}`);
  console.log(`   Debugging Setup: ${debuggingSetupLink}`);

  // Parse shareable links
  const parsedQuickStart = CLIDocumentationHandler.parseDocumentationURL(quickStartLink);
  console.log('\n🔍 Parsed Quick Start Link:');
  console.log(`   Valid: ${parsedQuickStart.valid}`);
  console.log(`   Fragment: ${JSON.stringify(parsedQuickStart.fragment, null, 2)}`);
}

/**
 * Example 7: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.log('\n🚀 Quick Reference URLs');
  console.log('='.repeat(50));

  const quickRefs = CLIDocumentationHandler.generateQuickReferenceURLs();

  console.log('⚡ Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });

  // Validate all quick reference URLs
  console.log('\n✅ Validation Results:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    const isValid = CLIDocumentationHandler.validateDocumentationURL(url);
    console.log(`   ${name}: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * Example 8: MCP Server Integration
 */
async function mcpServerIntegration() {
  console.log('\n🖥️ MCP Server Integration');
  console.log('='.repeat(50));

  // Initialize MCP server
  await cliDocumentationMCPServer.displayStatus();

  // Demonstrate MCP server features
  console.log('\n🎯 MCP Server Features Demonstration:');

  // Get documentation URL via MCP
  const docResult = await cliDocumentationMCPServer.getDocumentationURL(
    CLICategory.COMMANDS,
    'BUILD',
    { example: 'production' }
  );
  console.log(`   📖 Documentation URL: ${docResult.url}`);

  // Search via MCP
  const searchResult = await cliDocumentationMCPServer.searchDocumentation('test');
  console.log(`   🔍 Search Results: Found ${searchResult.results.length} results`);

  // Generate example via MCP
  const exampleResult = await cliDocumentationMCPServer.generateCommandExample(
    'BASIC',
    'TEST',
    'bun test --coverage'
  );
  console.log(`   💡 Example URL: ${exampleResult.url}`);

  // Get navigation via MCP
  const navigation = await cliDocumentationMCPServer.getNavigationStructure();
  console.log(`   🧭 Navigation: ${navigation.length} categories`);

  // Generate breadcrumbs via MCP
  const breadcrumbs = await cliDocumentationMCPServer.getBreadcrumbs(docResult.url);
  console.log(`   🍞 Breadcrumbs: ${breadcrumbs.length} items`);
}

/**
 * Example 9: Real-world Documentation Workflow
 */
async function realWorldWorkflow() {
  console.log('\n🌍 Real-world Documentation Workflow');
  console.log('='.repeat(50));

  // Simulate a developer workflow
  console.log('👨‍💻 Developer Documentation Workflow:');

  // 1. New developer wants to learn testing
  console.log('\n1️⃣ Learning Bun Testing:');
  const testingURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'TEST',
    {
      level: 'beginner',
      examples: 'true',
      interactive: 'true'
    }
  );
  console.log(`   📖 Start here: ${testingURL}`);

  // 2. Developer needs advanced build options
  console.log('\n2️⃣ Advanced Build Configuration:');
  const buildURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.OPTIONS,
    'CONFIG_FILE',
    {
      section: 'build',
      advanced: 'true',
      examples: 'production'
    }
  );
  console.log(`   ⚙️ Build config: ${buildURL}`);

  // 3. Developer encounters debugging needs
  console.log('\n3️⃣ Debugging Setup:');
  const debugURL = CLIDocumentationHandler.generateDebuggingURL('debugger', {
    ide: 'vscode',
    breakpoints: 'true',
    console: 'integrated'
  });
  console.log(`   🐛 Debug setup: ${debugURL}`);

  // 4. Create shareable learning path
  console.log('\n4️⃣ Shareable Learning Path:');
  const learningPath = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.COMMANDS,
    section: 'learning-path',
    steps: 'test,build,debug',
    level: 'intermediate'
  }, 86400); // 24 hours

  console.log(`   🎓 Learning path: ${learningPath}`);

  // 5. Team member searches for specific topic
  console.log('\n5️⃣ Team Knowledge Search:');
  const searchResults = CLIDocumentationSearch.searchCommands('environment variables');
  console.log(`   🔍 Found ${searchResults.results.length} resources about environment variables`);

  // 6. Generate quick reference for team
  console.log('\n6️⃣ Team Quick Reference:');
  const teamQuickRef = CLIDocumentationHandler.generateQuickReferenceURLs();
  console.log('   📋 Quick reference created for team');
}

/**
 * Example 10: URL Fragment State Management
 */
async function fragmentStateManagement() {
  console.log('\n🧩 URL Fragment State Management');
  console.log('='.repeat(50));

  // Simulate application state management
  class DocumentationAppState {
    private currentState: Record<string, string> = {};

    // Save state to URL fragment
    saveStateToURL(baseURL: string, state: Record<string, string>): string {
      this.currentState = { ...this.currentState, ...state };
      return URLHandler.addFragment(baseURL, URLFragmentUtils.buildFragment(this.currentState));
    }

    // Restore state from URL fragment
    restoreStateFromURL(url: string): Record<string, string> {
      const fragment = URLHandler.getFragment(url);
      this.currentState = URLFragmentUtils.parseFragment(fragment);
      return this.currentState;
    }

    // Update specific state property
    updateState(baseURL: string, key: string, value: string): string {
      this.currentState[key] = value;
      return URLFragmentUtils.setFragmentParam(baseURL, key, value);
    }

    // Clear state
    clearState(baseURL: string): string {
      this.currentState = {};
      return URLHandler.removeFragment(baseURL);
    }
  }

  const appState = new DocumentationAppState();

  // Start with base URL
  let baseURL = 'https://bun.sh/docs/cli';

  // Save initial state
  baseURL = appState.saveStateToURL(baseURL, {
    view: 'commands',
    category: 'testing',
    example: 'basic'
  });

  console.log('🔄 State Management Demo:');
  console.log(`   Initial URL: ${baseURL}`);

  // Update specific property
  baseURL = appState.updateState(baseURL, 'example', 'advanced');
  console.log(`   Updated example: ${baseURL}`);

  // Add more state
  baseURL = appState.updateState(baseURL, 'highlight', 'true');
  console.log(`   Added highlight: ${baseURL}`);

  // Restore state
  const restoredState = appState.restoreStateFromURL(baseURL);
  console.log(`   Restored state: ${JSON.stringify(restoredState, null, 2)}`);

  // Clear state
  baseURL = appState.clearState(baseURL);
  console.log(`   Cleared state: ${baseURL}`);
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('📚 CLI Documentation Integration Examples');
  console.log('='.repeat(70));
  console.log('');

  try {
    await basicDocumentationURLs();
    await advancedFragmentOperations();
    await documentationSearch();
    await interactiveExamples();
    await navigationStructure();
    await shareableLinks();
    await quickReferenceURLs();
    await mcpServerIntegration();
    await realWorldWorkflow();
    await fragmentStateManagement();

    console.log('\n✅ All CLI documentation integration examples completed successfully!');
    console.log('');
    console.log('📋 Key Features Demonstrated:');
    console.log('   • URL generation with fragment support');
    console.log('   • Advanced fragment parameter management');
    console.log('   • CLI documentation search functionality');
    console.log('   • Interactive example generation');
    console.log('   • Navigation structure and breadcrumbs');
    console.log('   • Shareable documentation links');
    console.log('   • MCP server integration');
    console.log('   • Real-world documentation workflows');
    console.log('   • URL fragment state management');

  } catch (error) {
    console.error('❌ Error in CLI documentation examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main();
}

export {
  basicDocumentationURLs,
  advancedFragmentOperations,
  documentationSearch,
  interactiveExamples,
  navigationStructure,
  shareableLinks,
  quickReferenceURLs,
  mcpServerIntegration,
  realWorldWorkflow,
  fragmentStateManagement
};
